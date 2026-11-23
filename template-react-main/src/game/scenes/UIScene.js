import * as Phaser from 'phaser';
import { WIDTH, HEIGHT, QUESTIONS, TRIVIA } from "./systems/constants";
import { EventBus } from '../EventBus';
import { db } from '../firebase';
import {
    ref,
    set,
    update,
    onValue,
    onChildChanged,
    runTransaction
} from 'firebase/database';


export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        this.chatInputValue = '';
        this.chatFocused = false;
        this.maxChatLength = 140;
        this.chatHistory = [];
        this.player_name = 'player';
        this.player_chat_key = 'player';
        this.chatHistoryMaxVisible = 7;
        this.chatHistoryMaxStored = 200;

        this.isDialogueActive = false;
        this.currentDialogueLines = [];
        this.currentDialogueIndex = 0;

        this.visible_tab = "none";
        this.uiScale = 1.25;
        this.inventoryTooltip = null;
        this.hoveredInventorySlot = null;

        this.inventorySlots = [];
        this.inventoryCols = 4;
        this.inventoryRows = 6;
        this.inventorySlotSize = 48;
        this.inventorySlotGapX = 36;
        this.inventorySlotGapY = 12;
        this.skills = { huntingXp: 0, religionXp: 0 };
        this.skillTexts = {};
        this.skillIcons = [];
        this.xpDropBaseY = 80;
        this.xpDropCount = 0;
        this.selectedTabTint = 0xcc9999;
        this.hoverTabTint = 0xeeeeee;

        this.triviaOwner = null;
        this.triviaQuestions = [];
        this.triviaIndex = 0;
        this.triviaChatUnsub = null;
        this.currentTriviaAnswer = null;
        this.triviaActive = false;
    }

    init(data) {
        this.player_name = String(data?.playerName ?? 'player').trim() || 'player';
        this.player_chat_key = String(data?.playerId ?? this.player_name).trim() || this.player_name;
    }

    create() {
        this.myChatRef = ref(db, `chat/${this.player_chat_key}`);
        this.chatRef = ref(db, 'chat');
        this.triviaRef = ref(db, 'trivia/current');
        this.gameScene = this.scene.get('Game');

        set(this.myChatRef, `${this.player_name} has joined the game`);

        this.inventory_button = this.add.image(WIDTH - 45, HEIGHT - 45, 'ui_tab_button').setScale(0.33);
        this.skills_button = this.add.image(WIDTH - 130, HEIGHT - 45, 'ui_tab_button').setScale(0.33);
        this.inventory_icon = this.add.image(WIDTH - 45, HEIGHT - 45, "inventory_icon").setScale(0.33);
        this.skills_icon = this.add.image(WIDTH - 130, HEIGHT - 45, "skills_icon").setScale(0.33);

        this.add_tab_button_visual_flair(this.inventory_button);
        this.add_tab_button_visual_flair(this.skills_button);

        this.tab = this.add.image(WIDTH - 190, HEIGHT - 330, 'menu_tab').setScale(0.33 * this.uiScale);
        this.tab.setVisible(false);

        this.inventory_button.setInteractive({ useHandCursor: true });
        this.skills_button.setInteractive({ useHandCursor: true });
        this.inventory_button.on('pointerdown', () => this.setTab('inventory'));
        this.skills_button.on('pointerdown', () => this.setTab('skills'));


        this.medical_game_dialogue = this.add.rectangle(WIDTH / 2 + 10, HEIGHT / 2, 730, 400, 0xb99976);
        this.medical_game_yes = this.add.rectangle(WIDTH / 2 + 200, HEIGHT / 2 + 100, 200, 100, 0x669966);
        this.medical_game_no = this.add.rectangle(WIDTH / 2 - 200, HEIGHT / 2 + 100, 200, 100, 0x996666);
        this.medical_game_question = this.add.text(WIDTH / 2 - 300, HEIGHT / 2 - 90, 'Do you want to start medical mishap fixup shop?', { fontSize: '24px', color: '#000000', fontFamily: 'monospace' });
        this.medical_game_description2 = this.add.text(WIDTH / 2 - 350, HEIGHT / 2 - 45, '', { fontSize: '18px', color: '#000000', fontFamily: 'monospace' });
        this.medical_game_description = this.add.text(WIDTH / 2 - 250, HEIGHT / 2 - 15, '', { fontSize: '18px', color: '#000000', fontFamily: 'monospace' });
        this.medical_game_no_text = this.add.text(WIDTH / 2 - 220, HEIGHT / 2 + 90, 'no', { fontSize: '32px', color: '#000000', fontFamily: 'monospace' });
        this.medical_game_yes_text = this.add.text(WIDTH / 2 + 180, HEIGHT / 2 + 90, 'yes', { fontSize: '32px', color: '#000000', fontFamily: 'monospace' });
        this.setMedicalVisible(false);

        this.medical_game_yes_text.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.medical_game_yes.emit('pointerdown'));
        this.medical_game_no.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setMedicalVisible(false));
        this.medical_game_no_text.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.medical_game_no.emit('pointerdown'));

        this.medical_game_yes.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            this.setMedicalVisible(false);
            const gameScene = this.scene.get('Game');
            const uiScene = this.scene.get('UIScene');
            if (gameScene && gameScene.input) gameScene.input.enabled = false;
            if (uiScene && uiScene.input) uiScene.input.enabled = false;
            const medicalScene = this.scene.launch('MedicalMinigame');
            this.scene.bringToTop('MedicalMinigame');
            this.events.once('medical-minigame-complete', (result) => {
                const used = Number(result?.ingredientsUsed ?? 0);
                const game = this.scene.get('Game');
                if (game?.addSkillXp) game.addSkillXp('cooking', used * 10);
                if (gameScene && gameScene.input) gameScene.input.enabled = true;
                if (uiScene && uiScene.input) uiScene.input.enabled = true;
            });
        });

        this.chat_box = this.add.rectangle(450, HEIGHT - 140, 880, 250, 0x808080 >> 2);
        this.chat_box.setAlpha(0.8);
        this.chat_box.setInteractive({ useHandCursor: true });

        this.chatHistoryText = this.add.text(24, HEIGHT - 260, '', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 870 }
        }).setOrigin(0, 0);

        this.chatInputText = this.add.text(30, HEIGHT - 40, 'Click chat box to type...', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.chat_box.on('pointerdown', () => {
            this.chatFocused = true;
            this.refreshChatInput();
        });

        this.input.keyboard.on('keydown', (event) => {
            if (!this.chatFocused) return;
            if (event.key === 'Enter') {
                const msg = this.chatInputValue.trim();
                if (msg.length > 0) {
                    const chatMessage = `${this.player_name}: ${msg}`;
                    this.chatHistory.push(chatMessage);
                    if (this.chatHistory.length > this.chatHistoryMaxStored) {
                        this.chatHistory.splice(0, this.chatHistory.length - this.chatHistoryMaxStored);
                    }
                    this.refreshChatHistory();
                    set(this.myChatRef, chatMessage);
                    this.showChatBubble(this.player_chat_key, chatMessage);
                }
                this.chatInputValue = '';
                this.refreshChatInput();
                return;
            }
            if (event.key === 'Escape') {
                this.chatFocused = false;
                this.refreshChatInput();
                return;
            }
            if (event.key === 'Backspace') {
                this.chatInputValue = this.chatInputValue.slice(0, -1);
                this.refreshChatInput();
                return;
            }
            if (event.key.length === 1 && this.chatInputValue.length < this.maxChatLength) {
                this.chatInputValue += event.key;
                this.refreshChatInput();
            }
        });

        this.refreshChatInput();
        this.refreshChatHistory();

        // Dialogue setup
        this.dialogueBoxBorder = this.add.rectangle(760, HEIGHT - 215, 1510, 410, 0x524B3B << 1);
        this.dialogueBox = this.add.rectangle(760, HEIGHT - 215, 1490, 390, 0xb99976);
        this.dialogueText = this.add.text(400, HEIGHT - 300, '', { fontFamily: 'monospace', fontSize: '34px', color: '#000000', wordWrap: { width: 1000 } }).setOrigin(0, 0);
        this.dialogueName = this.add.text(100, HEIGHT - 80, '', { fontFamily: 'monospace', fontSize: '34px', color: '#000000', wordWrap: { width: 1200 } }).setOrigin(0, 0);
        this.dialogueImage = this.add.image(175, HEIGHT - 250, "orangebite");
        this.dialogueImage.displayWidth = 350;
        this.dialogueImage.displayHeight = 300;

        this.dialogueBox.setInteractive({ useHandCursor: true });
        this.dialogueBoxBorder.setInteractive({ useHandCursor: true });
        this.dialogueImage.setInteractive({ useHandCursor: true });
        this.dialogueName.setInteractive({ useHandCursor: true });

        const advanceDialogue = () => {
            if (!this.isDialogueActive) return;
            this.currentDialogueIndex += 1;
            if (this.currentDialogueIndex >= this.currentDialogueLines.length) {
                this.closeDialogue();
                return;
            }
            this.dialogueText.setText(this.currentDialogueLines[this.currentDialogueIndex]);
        };

        this.dialogueBox.on('pointerdown', advanceDialogue);
        this.dialogueBoxBorder.on('pointerdown', advanceDialogue);
        this.dialogueImage.on('pointerdown', advanceDialogue);
        this.dialogueName.on('pointerdown', advanceDialogue);

        this.setDialogueVisible(false);
        this.createInventoryUI();
        this.setInventoryVisible(false);
        this.createSkillsUI();
        this.setSkillsVisible(false);

        EventBus.on('inventory-update', this.refreshInventory, this);

        this.hoverText = this.add.text(1300, 10, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: { x: 8, y: 6 } });
        this.hoverText.setVisible(false);

        this.inventoryTooltip = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: { x: 8, y: 6 } })
            .setVisible(false).setDepth(1000).setScrollFactor(0);

        this.input.on('pointermove', (pointer) => {
            if (this.inventoryTooltip?.visible) {
                this.inventoryTooltip.setPosition(pointer.x + 14, pointer.y - 14);
            }
        });


        // Player screen listener
        this.playerRef = ref(db, `players/${this.player_chat_key}`);
        this.unsubscribePlayerScreen = onValue(this.playerRef, (snap) => {
            const data = snap.val();
            this.player_screen = String(data?.screen ?? 'unknown');
        });


        // Chat listener — show all chat bubbles
        this.unsubscribeChat = onChildChanged(this.chatRef, (snapshot) => {
            const key = snapshot.key;
            const data = String(snapshot.val() ?? '');
            if (data.endsWith('has joined the game')) return;
            if (key !== this.player_chat_key) {
                this.chatHistory.push(data);
                this.refreshChatHistory();
            }
            this.showChatBubble(key, data);
        });


        this.rightClickMenuText = [];
    }

    showRightClickMenu(pointer, options){
        this.hoverText.setVisible(false); // Disable gathering hover text if right clicked

        options.forEach((option, index) => {
            let text = this.add.text(pointer.x - 50, pointer.y + index * 36 - 15, option[0], {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#e8dec8',
                backgroundColor: '#261e16d8',
                padding: { x: 12, y: 8 },
            });

            text.setInteractive({ useHandCursor: true });
            text.on('pointerover', () => {
                text.setBackgroundColor("#251b04d8");
            })
            text.on('pointerout', () => {
                text.setBackgroundColor("#261e16d8");
            })
            text.on('pointerdown', () => {
                this.gameScene.ignoreNextGroundClick = true;
                option[1]?.();

                this.hideRightClickMenu();
            })

            this.rightClickMenuText.push(text);
        })

        const maxWidth = Math.max(...this.rightClickMenuText.map(item => item.width));
        this.rightClickMenuText.forEach((text) => text.setFixedSize(maxWidth, 0))
    }

    hideRightClickMenu(){
        this.rightClickMenuText.forEach((text) => text.destroy());
        this.rightClickMenuText = [];
    }


    addChatBubble(playerId, text) {
        try {
            // write to a single figgy key (no timestamp) so onChildChanged fires on updates
            const key = String(playerId || '').toLowerCase().includes('figgy') ? 'figgy' : playerId;
            set(ref(db, `chat/${key}`), text);
        } catch (err) {
            console.error('failed to write chat', err);
        }
    }

    showChatBubble(playerId, rawMessage, duration = 3000) {
        if (!rawMessage) return;
        const body = rawMessage.includes(': ') ? rawMessage.split(': ').slice(1).join(': ').trim() : rawMessage.trim();
        if (!body) return;

        let pid = playerId;
        if (String(pid || '').toLowerCase().includes('figgy')) pid = 'figgy';


        const gameScene = this.scene.get('Game');
        if (gameScene && typeof gameScene.showSpeech === 'function') {
            gameScene.showSpeech(pid, body, duration);
        } else {
            const x = this.cameras.main.width / 2;
            const y = 100;
            const txt = this.add.text(x, y, body, { fontFamily: 'monospace', fontSize: '20px', color: '#FFFF66', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
            this.tweens.add({ targets: txt, y: y - 24, alpha: 0, duration, ease: 'Quad.Out', onComplete: () => txt.destroy() });
        }
    }

    createInventoryUI() {
        const scale = this.uiScale;
        const panelX = WIDTH - 150 * scale;
        const panelY = HEIGHT - 245 * scale;
        this.inventoryTitle = this.add.text(WIDTH - 200 * scale, HEIGHT - 430 * scale, 'Inventory', { fontFamily: 'monospace', fontSize: `${22 * scale}px`, color: '#b08f8f' });
        const totalWidth = this.inventoryCols * this.inventorySlotSize + (this.inventoryCols - 1) * this.inventorySlotGapX;
        const totalHeight = this.inventoryRows * this.inventorySlotSize + (this.inventoryRows - 1) * this.inventorySlotGapY;
        const startX = panelX - totalWidth / 2;
        const startY = panelY - totalHeight / 2 + 5;

        for (let row = 0; row < this.inventoryRows; row++) {
            for (let col = 0; col < this.inventoryCols; col++) {
                const x = startX + col * (this.inventorySlotSize + this.inventorySlotGapX) + this.inventorySlotSize / 2;
                const y = startY + row * (this.inventorySlotSize + this.inventorySlotGapY) + this.inventorySlotSize / 2;
                const hitbox = this.add.rectangle(x, y, this.inventorySlotSize, this.inventorySlotSize, 0x000000, 0.001);
                hitbox.setInteractive({ useHandCursor: true });
                const item = this.add.image(x, y, 'rat');
                item.setDisplaySize(this.inventorySlotSize - 6, this.inventorySlotSize - 6);
                item.setVisible(false);
                const slot = { item, hitbox, hasItem: false, itemName: null };
                hitbox.on('pointerover', (pointer) => {
                    if (!slot.hasItem) return;
                    this.hoveredInventorySlot = slot;
                    this.inventoryTooltip?.setText(slot.itemName || 'unknown item');
                    this.inventoryTooltip?.setPosition(pointer.x + 14, pointer.y - 14);
                    this.inventoryTooltip?.setVisible(true);
                });
                hitbox.on('pointerout', () => {
                    if (this.hoveredInventorySlot === slot) {
                        this.hoveredInventorySlot = null;
                        this.inventoryTooltip?.setVisible(false);
                    }
                });
                hitbox.on('pointerdown', (pointer) => {
                    let invSlot = row * this.inventoryCols + col;
                    if (pointer.button != 2 || !this.inventorySlots[invSlot].hasItem) return;

                    this.showRightClickMenu(pointer, [["Drop Item", () => this.gameScene.dropItem(invSlot, () => {
                        this.refreshInventory(this.gameScene.inventory);
                    })]])
                })
                this.inventorySlots.push(slot);
            }
        }
    }

    refreshInventory(inventory) {
        if (!this.inventorySlots.length) return;
        const items = Array.isArray(inventory) ? inventory : [];
        for (let i = 0; i < this.inventorySlots.length; i++) {
            const slot = this.inventorySlots[i];
            const data = items[i];
            slot.hasItem = !!(data && data.item && data.item !== 'empty');
            slot.itemName = slot.hasItem ? String(data.item) : null;
            if (slot.hasItem) {
                if (!this.textures.exists(data.item)) {
                    slot.item.setVisible(false);
                    continue;
                }
                slot.item.setTexture(data.item);
                slot.item.setVisible(this.visible_tab === 'inventory');
            } else {
                slot.item.setVisible(false);
            }
        }
    }

    xpToLevel(xp) {
        const totalXp = Math.max(0, Math.floor(Number(xp) || 0));
        let points = 0;
        for (let level = 1; level < 99; level++) {
            points += Math.floor(level + 300 * Math.pow(2, level / 7));
            const xpForNextLevel = Math.floor(points / 4);
            if (totalXp < xpForNextLevel) return level;
        }
        return 99;
    }

    createSkillsUI() {
        const scale = this.uiScale;
        const x = WIDTH - 265 * scale;
        const y = HEIGHT - 425 * scale;
        this.skillTexts.title = this.add.text(x + 80 * scale, y - 5 * scale, 'Skills', { fontFamily: 'monospace', fontSize: `${22 * scale}px`, color: '#b08f8f' });
        const skillDefinitions = [
            { key: 'hunting', label: 'Hunting', icon: 'hunting_icon' },
            { key: 'religion', label: 'Religion', icon: 'religion_icon' },
            { key: 'harvesting', label: 'Harvesting', icon: 'harvesting_icon' },
            { key: 'cooking', label: 'Cooking', icon: 'cooking_icon' }
        ];
        this.skillUi = [];
        this.skillIcons = [];
        const cols = 3;
        const startX = x + 28 * scale;
        const startY = y + 50 * scale;
        const colGap = 85 * scale;
        const rowGap = 80 * scale;
        skillDefinitions.forEach((skill, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const cellX = startX + col * colGap;
            const cellY = startY + row * rowGap;
            const hoverDisplay = this.add.text(x - 340 * scale, y + 30 * scale + row * 40 * scale, '', { fontFamily: 'monospace', fontSize: `${24 * scale}px`, color: '#ffffff', backgroundColor: '#320b32', padding: { x: 8 * scale, y: 6 * scale } }).setVisible(false).setDepth(100);
            const rect = this.add.rectangle(cellX, cellY + 4 * scale, 66 * scale, 66 * scale);
            rect.setInteractive({ useHandCursor: true });
            rect.on('pointerover', () => hoverDisplay.setVisible(true));
            rect.on('pointerout', () => hoverDisplay.setVisible(false));
            const icon = this.add.image(cellX, cellY, skill.icon).setScale(0.2 * scale);
            const text = this.add.text(cellX, cellY + 24 * scale, '1', { fontFamily: 'monospace', fontSize: `${24 * scale}px`, color: '#b08f8f' }).setOrigin(0.5, 0);
            this.skillIcons.push(icon);
            this.skillUi.push(skill);
            this.skillTexts[skill.key] = text;
            this.skillTexts[`${skill.key}Rect`] = rect;
            this.skillTexts[`${skill.key}HoverDisplay`] = hoverDisplay;
        });
        this.refreshSkills(this.skills);
    }

    refreshSkills(skills) {
        if (!this.skillUi.length) return;
        this.skills = { huntingXp: Number(skills?.huntingXp ?? 0), religionXp: Number(skills?.religionXp ?? 0), harvestingXp: Number(skills?.harvestingXp ?? 0), cookingXp: Number(skills?.cookingXp ?? 0) };
        this.skillUi.forEach((skill) => {
            const xp = Number(this.skills[`${skill.key}Xp`] ?? 0);
            const lvl = this.xpToLevel(xp);
            this.skillTexts[skill.key]?.setText(`${lvl}`);
            this.skillTexts[`${skill.key}HoverDisplay`]?.setText(`${skill.label} Lvl ${lvl} (${xp} xp)`);
        });
    }

    setInventoryVisible(isVisible) {
        for (const slot of this.inventorySlots) {
            slot.item.setVisible(isVisible && slot.hasItem);
            slot.hitbox.setVisible(isVisible);
            slot.hitbox.input.enabled = isVisible;
        }
        this.inventoryTitle?.setVisible(isVisible);
        if (!isVisible) {
            this.inventoryTooltip?.setVisible(false);
            this.hoveredInventorySlot = null;
        }
    }

    setSkillsVisible(isVisible) {
        this.skillTexts.title?.setVisible(isVisible);
        this.skillUi.forEach((skill) => {
            this.skillTexts[skill.key]?.setVisible(isVisible);
            this.skillTexts[`${skill.key}Rect`]?.setVisible(isVisible);
            this.skillTexts[`${skill.key}HoverDisplay`]?.setVisible(false);
        });
        this.skillIcons.forEach((icon) => { icon.setVisible(isVisible); });
    }

    setTab(newTab) {
        if (this.visible_tab == newTab) this.visible_tab = "none";
        else this.visible_tab = newTab;
        this.setInventoryVisible(this.visible_tab === 'inventory');
        this.setSkillsVisible(this.visible_tab === 'skills');
        this.tab.setVisible(this.visible_tab !== 'none');
        this.updateTabButtonTints();
    }

    updateTabButtonTints() {
        const inventorySelected = this.visible_tab === 'inventory';
        const skillsSelected = this.visible_tab === 'skills';
        if (inventorySelected) this.inventory_button.setTint(this.selectedTabTint);
        else this.inventory_button.clearTint();
        if (skillsSelected) this.skills_button.setTint(this.selectedTabTint);
        else this.skills_button.clearTint();
    }

    showXpDrop(skillName, amount, beforeLevel, afterLevel) {
        const x = WIDTH - 80;
        const y = this.xpDropBaseY + this.xpDropCount * 22;
        this.xpDropCount += 1;
        const pretty = skillName.charAt(0).toUpperCase() + skillName.slice(1);
        const text = this.add.text(x, y, `+${amount} ${pretty} XP`, { fontFamily: 'monospace', fontSize: '32px', color: '#ffde59', stroke: '#000000', strokeThickness: 3 }).setOrigin(1, 0);
        this.tweens.add({ targets: text, y: y - 18, alpha: 0, duration: 1200, ease: 'Quad.Out', onComplete: () => { text.destroy(); this.xpDropCount = Math.max(0, this.xpDropCount - 1); } });
        if (afterLevel > beforeLevel) {
            const levelText = this.add.text(x, y + 40, `${pretty} level ${afterLevel}!`, { fontFamily: 'monospace', fontSize: '32px', color: '#7CFC00', stroke: '#000000', strokeThickness: 3 }).setOrigin(1, 0);
            this.tweens.add({ targets: levelText, y: y - 6, alpha: 0, duration: 1400, ease: 'Quad.Out', onComplete: () => levelText.destroy() });
        }
    }

    refreshChatHistory() {
        const visible = this.chatHistory.slice(-this.chatHistoryMaxVisible);
        this.chatHistoryText.setText(visible.join('\n'));
    }

    refreshChatInput() {
        if (!this.chatFocused && this.chatInputValue.length === 0) {
            this.chatInputText.setText('Click chat box to type...');
            this.chatInputText.setColor('#bbbbbb');
            return;
        }
        const caret = this.chatFocused ? '|' : '';
        this.chatInputText.setText(this.chatInputValue + caret);
        this.chatInputText.setColor('#ffffff');
    }

    showDialogue(name, dialogue) {
        this.setChatVisible(false);
        this.currentDialogueLines = Array.isArray(dialogue) ? dialogue : [String(dialogue ?? '')];
        this.currentDialogueIndex = 0;
        this.isDialogueActive = this.currentDialogueLines.length > 0;
        this.dialogueName.setText(name);
        this.dialogueImage.setTexture(name);
        this.dialogueImage.displayWidth = 350;
        this.dialogueImage.displayHeight = 300;
        this.dialogueText.setText(this.currentDialogueLines[0] ?? '');
        this.setDialogueVisible(true);
    }

    closeDialogue() {
        this.isDialogueActive = false;
        this.currentDialogueLines = [];
        this.currentDialogueIndex = 0;
        this.setDialogueVisible(false);
        this.setChatVisible(true);
    }

    setChatVisible(isVisible) {
        this.chatHistoryText.setVisible(isVisible);
        this.chatInputText.setVisible(isVisible);
        this.chat_box.setVisible(isVisible);
    }

    setDialogueVisible(isVisible) {
        this.dialogueBox.setVisible(isVisible);
        this.dialogueBoxBorder.setVisible(isVisible);
        this.dialogueImage.setVisible(isVisible);
        this.dialogueName.setVisible(isVisible);
        this.dialogueText.setVisible(isVisible);
    }

    update() {

     }

    add_tab_button_visual_flair(button) {
        button.on('pointerover', () => {
            const isSelected = (button === this.inventory_button && this.visible_tab === 'inventory') || (button === this.skills_button && this.visible_tab === 'skills');
            if (!isSelected) button.setTint(this.hoverTabTint);
        });
        button.on('pointerout', () => { this.updateTabButtonTints(); });
    }

    setMedicalVisible(isVisible) {
        this.medical_game_description.setVisible(isVisible);
        this.medical_game_dialogue.setVisible(isVisible);
        this.medical_game_no.setVisible(isVisible);
        this.medical_game_no_text.setVisible(isVisible);
        this.medical_game_question.setVisible(isVisible);
        this.medical_game_yes.setVisible(isVisible);
        this.medical_game_yes_text.setVisible(isVisible);
        this.medical_game_description2.setVisible(isVisible);
    }

    medical_game_popup() { this.setMedicalVisible(true); }


    attemptStartTrivia(){
        if (this.triviaActive) return;
        try {
            set(this.triviaRef, { owner: this.player_chat_key, startedAt: Date.now() });
        } catch (err) {
            console.error('failed to claim trivia', err);
        }
        this.triviaOwner = this.player_chat_key;
        this.triviaActive = true;

        const categories = Object.keys(QUESTIONS || {}).filter(c => {
            const cat = QUESTIONS[c];
            return cat && Object.keys(cat).length > 0;
        });
        if (!categories.length) {
            this.addChatBubble('figgy', 'No trivia available.');
            try { set(this.triviaRef, null); } catch (e) {}
            this.triviaActive = false;
            return;
        }

        const shuffle = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        const generateHint = (answer) => {
            if (!this._triviaHintIndices) this._triviaHintIndices = new Set();
            const chars = answer.split('');
            const maxReveal = Math.max(1, Math.floor(chars.length * 0.8)); 
            const newReveals = Math.min(2, maxReveal - this._triviaHintIndices.size);
            
            for (let i = 0; i < newReveals && this._triviaHintIndices.size < maxReveal; i++) {
                let idx;
                do {
                    idx = Math.floor(Math.random() * chars.length);
                } while (this._triviaHintIndices.has(idx));
                this._triviaHintIndices.add(idx);
            }
            
            return chars.map((c, i) => this._triviaHintIndices.has(i) || c == ' ' ? c : '_').join('');
        };

        const pickRandomCategory = () => {
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const pool = Object.keys(QUESTIONS[cat] || {}).map(q => ({ q: String(q), a: String(QUESTIONS[cat][q]) }));
            if (!pool.length) return null;
            shuffle(pool);
            const take = Math.min(3, pool.length);
            return { category: cat, questions: pool.slice(0, take) };
        };

        this._triviaQuestionIndex = 0;
        this.currentTriviaAnswer = null;
        this._triviaQuestionTimeouts = [];
        this._triviaCurrentCategory = null;

        const clearQuestionTimeouts = () => {
            this._triviaQuestionTimeouts.forEach(t => clearTimeout(t));
            this._triviaQuestionTimeouts = [];
        };

        const endTrivia = () => {
            clearQuestionTimeouts();
            this.addChatBubble('figgy', 'Trivia complete!');
            try { set(this.triviaRef, null); } catch (e) { /* ignore */ }
            this.triviaActive = false;
            this.currentTriviaAnswer = null;
            if (this.triviaChatUnsub) this.triviaChatUnsub();
            this.triviaChatUnsub = null;
        };

        const askCurrentQuestion = () => {
            clearQuestionTimeouts();
            if (!this.triviaActive) return;

            if (!this._triviaCurrentCategory || this._triviaQuestionIndex >= this._triviaCurrentCategory.questions.length) {
                this._triviaCurrentCategory = pickRandomCategory();
                if (!this._triviaCurrentCategory) {
                    endTrivia();
                    return;
                }
                this._triviaQuestionIndex = 0;
                this.addChatBubble('figgy', `The next category is ${this._triviaCurrentCategory.category}`);
                const t = setTimeout(askCurrentQuestion, 3000);
                this._triviaQuestionTimeouts.push(t);
                return;
            }

            const qobj = this._triviaCurrentCategory.questions[this._triviaQuestionIndex];
            this.currentTriviaAnswer = String(qobj.a || '').trim().toLowerCase();
            
            this.addChatBubble('figgy', `${qobj.q}`);

            this._triviaHintIndices = new Set();
            
            const hintTimes = [8000, 16000, 24000];
            
            hintTimes.forEach((time) => {
                const t = setTimeout(() => {
                    if (this.triviaActive && this.currentTriviaAnswer === qobj.a.toLowerCase()) {
                        const hint = generateHint(this.currentTriviaAnswer);
                        this.addChatBubble('figgy', `Hint: ${hint}`);
                    }
                }, time);
                this._triviaQuestionTimeouts.push(t);
            });

            const t = setTimeout(() => {
                if (!this.triviaActive || this.currentTriviaAnswer !== qobj.a.toLowerCase()) return;
                this.addChatBubble('figgy', `Time's up! No one got it right.`);
                this.addChatBubble('figgy', `The answer was: ${qobj.a}`);
                this._triviaQuestionIndex += 1;
                const t2 = setTimeout(askCurrentQuestion, 2000);
                this._triviaQuestionTimeouts.push(t2);
            }, 30000);
            this._triviaQuestionTimeouts.push(t);
        };

        this.triviaChatUnsub = onChildChanged(this.chatRef, (snapshot) => {
            if (!this.triviaActive) return;
            const key = snapshot.key;
            const raw = String(snapshot.val() ?? '').trim();
            if (!raw) return;
            if (String(key || '').toLowerCase().includes('figgy')) return;
            const body = raw.includes(': ') ? raw.split(': ').slice(1).join(': ').trim() : raw;
            const name = raw.includes(': ') ? raw.split(': ').slice(0, 1).join(': ').trim() : raw;
            if (!body) return;
            if (!this.currentTriviaAnswer) return;
            if (body.toLowerCase() === this.currentTriviaAnswer) {
                clearQuestionTimeouts();
                const winner = key;
                this.addChatBubble('figgy', `${name} got it right`);
                this._triviaQuestionIndex += 1;
                const t = setTimeout(askCurrentQuestion, 2000);
                this._triviaQuestionTimeouts.push(t);
            }
        });

        this.addChatBubble('figgy', `Starting trivia!`);
        const t = setTimeout(askCurrentQuestion, 2500);
        this._triviaQuestionTimeouts.push(t);
    }
}