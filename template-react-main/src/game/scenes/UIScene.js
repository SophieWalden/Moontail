import * as Phaser from 'phaser';
import { WIDTH, HEIGHT } from "./systems/constants";
import { EventBus } from '../EventBus';
import { db } from '../firebase';
import {
    ref,
    set,
    update,
    remove,
    onDisconnect,
    onChildAdded,
    onChildChanged,
    onChildRemoved
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

        this.chatHistoryMaxVisible = 6;
        this.chatHistoryMaxStored = 200;

        this.isDialogueActive = false;
        this.currentDialogueLines = [];
        this.currentDialogueIndex = 0;

        this.visible_tab = "none";

        this.inventorySlots = [];
        this.inventoryCols = 4;
        this.inventoryRows = 7;
        this.inventorySlotSize = 32;
        this.inventorySlotGapX = 24;
        this.inventorySlotGapY = 8;
        this.skills = { huntingXp: 0, religionXp: 0 };
        this.skillTexts = {};
        this.skillIcons = []
        this.xpDropBaseY = 80;
        this.xpDropCount = 0;
        this.selectedTabTint = 0xcc9999;
        this.hoverTabTint = 0xeeeeee;
    }

    init(data) {
        this.player_name = String(data?.playerName ?? 'player').trim() || 'player';
        this.player_chat_key = String(data?.playerId ?? this.player_name).trim() || this.player_name;
    }

    create() {
        this.myChatRef = ref(db, `chat/${this.player_chat_key}`);
        this.chatRef = ref(db, 'chat');
        set(this.myChatRef, `${this.player_name} has joined the game`);
        this.inventory_button = this.add.image(WIDTH - 45, HEIGHT - 45, 'ui_tab_button').setScale(0.33)
        this.skills_button = this.add.image(WIDTH - 130, HEIGHT - 45, 'ui_tab_button').setScale(0.33)
        this.inventory_icon = this.add.image(WIDTH - 45, HEIGHT - 45, "inventory_icon").setScale(0.33)
        this.skills_icon = this.add.image(WIDTH - 130, HEIGHT - 45, "skills_icon").setScale(0.33)


        this.add_tab_button_visual_flair(this.inventory_button);
        this.add_tab_button_visual_flair(this.skills_button);

        this.tab = this.add.image(WIDTH - 150, HEIGHT - 270, 'menu_tab').setScale(0.33)
        this.tab.setVisible(false);


        this.inventory_button.setInteractive({ useHandCursor: true });
        this.skills_button.setInteractive({ useHandCursor: true });
        this.inventory_button.on('pointerdown', () => this.setTab('inventory'));
        this.skills_button.on('pointerdown', () => this.setTab('skills'));

        this.chat_box = this.add.rectangle(360, HEIGHT - 110, 700, 200, 0x808080 >> 2);
        this.chat_box.setAlpha(0.8);
        this.chat_box.setInteractive({ useHandCursor: true });

        this.chatHistoryText = this.add.text(24, HEIGHT - 200, '', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 670 }
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
                    let chatMessage = `${this.player_name}: ${msg}`;
                    set(this.myChatRef, chatMessage);
                    this.chatHistory.push(chatMessage);

                    if (this.chatHistory.length > this.chatHistoryMaxStored) {
                        this.chatHistory.splice(0, this.chatHistory.length - this.chatHistoryMaxStored);
                    }

                    this.refreshChatHistory();
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

        this.chatSent = onChildChanged(this.chatRef, (snapshot) => {
            const key = snapshot.key;
            if (key === this.player_chat_key) return; 
            const data = snapshot.val();
            this.chatHistory.push(data);
            this.refreshChatHistory();
        });

        this.dialogueBoxBorder = this.add.rectangle(760, HEIGHT - 215, 1510, 410, 0x524B3B << 1);
        this.dialogueBox = this.add.rectangle(760, HEIGHT - 215, 1490, 390, 0xD2C19C);
        this.dialogueText = this.add.text(400, HEIGHT - 300, '', {
            fontFamily: 'monospace',
            fontSize: '34px',
            color: '#000000',
            wordWrap: { width: 1000 }
        }).setOrigin(0, 0);
        this.dialogueName = this.add.text(100, HEIGHT - 80, '', {
            fontFamily: 'monospace',
            fontSize: '34px',
            color: '#000000',
            wordWrap: { width: 1200 }
        }).setOrigin(0, 0);
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
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('inventory-update', this.refreshInventory, this);
        });
    }

    createInventoryUI() {
        const panelX = WIDTH - 150;
        const panelY = HEIGHT - 245;

        const totalWidth = this.inventoryCols * this.inventorySlotSize + (this.inventoryCols - 1) * this.inventorySlotGapX;
        const totalHeight = this.inventoryRows * this.inventorySlotSize + (this.inventoryRows - 1) * this.inventorySlotGapY;

        const startX = panelX - totalWidth / 2;
        const startY = panelY - totalHeight / 2;

        for (let row = 0; row < this.inventoryRows; row++) {
            for (let col = 0; col < this.inventoryCols; col++) {
                const x = startX + col * (this.inventorySlotSize + this.inventorySlotGapX) + this.inventorySlotSize / 2;
                const y = startY + row * (this.inventorySlotSize + this.inventorySlotGapY) + this.inventorySlotSize / 2;

                const item = this.add.image(x, y, 'rat');
                item.setDisplaySize(this.inventorySlotSize - 4, this.inventorySlotSize - 4);
                item.setVisible(false);

                this.inventorySlots.push({ item, hasItem: false });
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

    refreshSkills(skills) {
        if (!this.skillUi.length) return;

        this.skills = {
            huntingXp: Number(skills?.huntingXp ?? 0),
            religionXp: Number(skills?.religionXp ?? 0)
        };

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
        }
    }

    xpToLevel(xp) {
        const totalXp = Math.max(0, Number(xp) || 0);

        let level = 1;
        let nextThreshold = 9;
        let increment = 9;
        const growth = 1.33;

        while (totalXp >= nextThreshold && level < 99) {
            level += 1;
            increment = Math.max(1, Math.round(increment * growth));
            nextThreshold += increment;
        }

        return level;
    }

    createSkillsUI() {
        const x = WIDTH - 265;
        const y = HEIGHT - 425;

        this.skillTexts.title = this.add.text(x + 80, y - 5, 'Skills', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#b08f8f'
        });

        const skillDefinitions = [
            {
                key: 'hunting',
                label: 'Hunting',
                icon: 'hunting_icon'
            },
            {
                key: 'religion',
                label: 'Religion',
                icon: 'religion_icon'
            }
        ];

        this.skillUi = [];
        this.skillIcons = [];

        const cols = 3;
        const startX = x + 28;
        const startY = y + 50;
        const colGap = 74;
        const rowGap = 80;

        skillDefinitions.forEach((skill, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            const cellX = startX + col * colGap;
            const cellY = startY + row * rowGap;

            const hoverDisplay = this.add.text(x - 340, y + 30 + row * 40, '', {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#320b32',
                padding: { x: 8, y: 6 }
            });
            hoverDisplay.setVisible(false);
            hoverDisplay.setDepth(100);

            const rect = this.add.rectangle(cellX, cellY + 4, 66, 66);
            rect.setInteractive({ useHandCursor: true });
            rect.on('pointerover', () => hoverDisplay.setVisible(true));
            rect.on('pointerout', () => hoverDisplay.setVisible(false));

            const icon = this.add.image(cellX, cellY, skill.icon).setScale(0.2);
            const text = this.add.text(cellX, cellY + 24, '1', {
                fontFamily: 'monospace',
                fontSize: '24px',
                color: '#b08f8f'
            }).setOrigin(0.5, 0);

            this.skillIcons.push(icon);
            this.skillUi.push(skill);
            this.skillTexts[skill.key] = text;
            this.skillTexts[`${skill.key}Rect`] = rect;
            this.skillTexts[`${skill.key}HoverDisplay`] = hoverDisplay;
        });

        this.refreshSkills(this.skills);
    }

    setSkillsVisible(isVisible) {
        this.skillTexts.title?.setVisible(isVisible);

        this.skillUi.forEach((skill) => {
            this.skillTexts[skill.key]?.setVisible(isVisible);
            this.skillTexts[`${skill.key}Rect`]?.setVisible(isVisible);
            this.skillTexts[`${skill.key}HoverDisplay`]?.setVisible(false);
        });

        this.skillIcons.forEach((icon) => {
            icon.setVisible(isVisible);
        });
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
        const text = this.add.text(x, y, `+${amount} ${pretty} XP`, {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#ffde59',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0);

        this.tweens.add({
            targets: text,
            y: y - 18,
            alpha: 0,
            duration: 1200,
            ease: 'Quad.Out',
            onComplete: () => {
                text.destroy();
                this.xpDropCount = Math.max(0, this.xpDropCount - 1);
            }
        });

        if (afterLevel > beforeLevel) {
            const levelText = this.add.text(x, y + 40, `${pretty} level ${afterLevel}!`, {
                fontFamily: 'monospace',
                fontSize: '32px',
                color: '#7CFC00',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(1, 0);

            this.tweens.add({
                targets: levelText,
                y: y - 6,
                alpha: 0,
                duration: 1400,
                ease: 'Quad.Out',
                onComplete: () => levelText.destroy()
            });
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

    update() {}

    addChat(newChat){
        this.chatHistory.push(newChat)
        this.refreshChatHistory();
    }

    add_tab_button_visual_flair(button){
        button.on('pointerover', () => {
            const isSelected =
                (button === this.inventory_button && this.visible_tab === 'inventory') ||
                (button === this.skills_button && this.visible_tab === 'skills');

            if (!isSelected) {
                button.setTint(this.hoverTabTint);
            }
        });

        button.on('pointerout', () => {
            this.updateTabButtonTints();
        });
    }
}