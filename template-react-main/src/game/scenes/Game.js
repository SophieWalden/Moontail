import * as Phaser from 'phaser';
import { Scene } from 'phaser';
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
    onChildRemoved,
    onValue,
    get,
    runTransaction
} from 'firebase/database';
import * as backgroundSystems from "./systems/background"
import * as movementSystem from "./systems/movement"
import {TILE_SIZE, WARP_TILES, NPCs, DIALOGUE, QUESTIONS, TRIVIA} from "./systems/constants"

function getBrightColor() {
    const r = Phaser.Math.Between(120, 255);
    const g = Phaser.Math.Between(120, 255);
    const b = Phaser.Math.Between(120, 255);
    return (r << 16) | (g << 8) | b;
}

function normalizePlayerName(name) {
    return String(name ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24);
}

function hashNameToId(name) {
    const s = normalizePlayerName(name) || 'player';
    let h = 0x811c9dc5; 
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return `p_${hex}`;
}

export class Game extends Scene {
    constructor() {
        super('Game');

        this.player = null;
        this.keys = null;

        this.playerId = null;
        this.playerRef = null;
        this.playersRef = null;
        this.player_name = Math.random().toString(36).substring(2, 7);
        this.player_color = 'geji';

        this.otherPlayers = new Map();
        this.otherPlayerData = new Map(); 

        this.stepDuration = 200;   

        this.unsubscribeAdded = null;
        this.unsubscribeChanged = null;
        this.unsubscribeRemoved = null;
        this.direction_facing = "east";
        this.player_color = "geji";
        this.player_screen = "freaks";
        this.moveToken = 0;
        this.currentMoveTween = null;
        this.npcs = []
        this.inventory = Array.from({ length: 28 }, () => ({ item: 'empty' }));
        this.gatheringRespawnMs = 5000;
        this.gatheringHarvestMs = 500;
        this.gatheringBusy = new Set();
        this.hoveredGatheringKey = null;
        this.gatherTooltipText = null;

        this.gatheringItems = {
            386: 'rat',
            387: 'snake',
            17: 'marigold',
            18: 'borage', 
            19: 'tansy',
            20: 'garlic',
            21: 'snakeroot',
            263: 'box'
        };
        this.gatheringLanguage = {
            'rat': 'hunt',
            'snake': 'hunt',
            'marigold': 'harvest',
            'borage': 'harvest',
            'tansy': 'harvest',
            'garlic': 'harvest',
            'snakeroot': 'harvest',
            'box': 'sleep in'
        }

         this.ignoreNextGroundClick = false;

        this.skills = {
            huntingXp: 0,
            religionXp: 0,
            harvestingXp: 0,
            cookingXp: 0
        };

        this.skillsRef = null;
        this.unsubscribeSkills = null;

        this.xpByItem = {
            rat: {skill: 'hunting', amount: 15},
            snake: {skill: 'hunting', amount: 40},
            marigold: {skill: 'harvesting', amount: 10},
            borage: {skill: 'harvesting', amount: 20},
            tansy: {skill: 'harvesting', amount: 30},
            garlic: {skill: 'harvesting', amount: 40},
            snakeroot: {skill: 'harvesting', amount: 100}
        };

         this.triviaRef = null;
        this.unsubscribeTrivia = null;
        this.currentTrivia = null;
        this._chatBubbles = new Map();
        this.figgy = null;


    }

    init(data) {
        const incomingName = String(data?.playerName ?? '').trim();
        const incomingColor = String(data?.playerColor ?? '').trim();

        this.player_name = incomingName || this.player_name || Math.random().toString(36).substring(2, 7);

        const allowedSkins = new Set(['brown', 'grey', 'geji', 'luna', 'rat']);
        if (allowedSkins.has(incomingColor)) {
            this.player_color = incomingColor;
        }
    }


    create() {

        this.create_background(this.player_screen);
        this.setup_npcs(this.player_screen)

        if (this.uiScene) {
            this.uiScene.refreshInventory(this.inventory);
        }

        const { width, height } = this.scale;


        this.player = this.add.image(width / 2, height / 2, `${this.player_color}_${this.direction_facing}`);
        this.player.setScale(0.333);


        this.player.x = Math.round(this.player.x / TILE_SIZE) * TILE_SIZE;
        this.player.y = Math.round(this.player.y / TILE_SIZE) * TILE_SIZE;

        const cam = this.cameras.main;
        this.resetBounds();
        this.cameras.main.filters.internal.addVignette(0.5, 0.5, 0.70, 0.02);

        this.playerId = hashNameToId(this.player_name);
        this.scene.launch('UIScene', {
            playerName: this.player_name,
            playerId: this.playerId
        });
        this.uiScene = this.scene.get('UIScene')
        this.playerRef = ref(db, `players/${this.playerId}`);
        this.playersRef = ref(db, 'players');
        this.inventoryRef = ref(db, `inventories/${this.playerId}`);
        this.skillsRef = ref(db, `skills/${this.playerId}`);
        this.gatheringRef = ref(db, 'gathering')

        this.triviaRef = ref(db, TRIVIA.dbPath);
        this.unsubscribeTrivia = onValue(this.triviaRef, (snap) => {
            this.currentTrivia = snap.val() || null;
        });

        this.unsubscribeInventory = onValue(this.inventoryRef, (snap) => {
            const data = snap.val();
            if (Array.isArray(data) && data.length === 28) {
                this.inventory = data;
                this.uiScene?.refreshInventory(this.inventory);
            } else {
                set(this.inventoryRef, this.inventory); 
            }
        });

        set(this.playerRef, {
            x: this.player.x,
            y: this.player.y,
            color: this.player_color,
            direction : this.direction_facing,
            screen: this.player_screen
        });

        onDisconnect(this.playerRef).remove();

        this.unsubscribeAdded = onChildAdded(this.playersRef, (snapshot) => {
            const id = snapshot.key;
            if (!id || id === this.playerId) return;

            const data = snapshot.val();
            if (!data) return;

            this.syncOtherPlayer(id, data);
        });

        this.unsubscribeChanged = onChildChanged(this.playersRef, (snapshot) => {
            const id = snapshot.key;
            if (!id || id === this.playerId) return;

            const data = snapshot.val();
            if (!data) return;

            this.syncOtherPlayer(id, data);
        });

        this.unsubscribeRemoved = onChildRemoved(this.playersRef, (snapshot) => {
            const id = snapshot.key;
            if (!id) return;

            this.otherPlayerData.delete(id);
            this.removeOtherSprite(id);
        });

        this.unsubscribeGathering = onChildChanged(this.gatheringRef, (snapshot) => {
            if (this.player_screen != 'field') return;
            const data = snapshot.val();

            Object.keys(data).forEach((key) => {
                let item = data[key];
                if (item.respawnAt > Date.now()){
                    this.setGatheringTile(item.pos.x, item.pos.y, 15);

                    if (item.respawnAt - Date.now() < 100){
                        this.setGatheringTile(item.pos.x, item.pos.y, item.tileType);
                        this.gatheringBusy.delete(key)
                    }else{
                        this.time.delayedCall(item.respawnAt - Date.now(), () => {
                            this.setGatheringTile(item.pos.x, item.pos.y, item.tileType);
                            this.gatheringBusy.delete(key)
                        });
                    }
                }
            })
        })


        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.unsubscribeAdded) this.unsubscribeAdded();
            if (this.unsubscribeChanged) this.unsubscribeChanged();
            if (this.unsubscribeRemoved) this.unsubscribeRemoved();
            if (this.unsubscribeSkills) this.unsubscribeSkills();
            if (this.unsubscribeInventory) this.unsubscribeInventory();
            if (this.unsubscribeGathering) this.unsubscribeGathering();
            if (this.unsubscribeTrivia) this.unsubscribeTrivia();

            if (this.playerRef) remove(this.playerRef);

            for (const [, rect] of this.otherPlayers) rect.destroy();
            this.otherPlayers.clear();
        });

        this.input.on('pointerup', (pointer) => {
            if (this.ignoreNextGroundClick) {
                this.ignoreNextGroundClick = false;
                return;
            }
            const gatherTile = this.gatheringLayer?.getTileAtWorldXY(pointer.worldX, pointer.worldY);

            if (gatherTile && gatherTile.index !== 15) {
                this.harvestGatheringTile(gatherTile.x, gatherTile.y, gatherTile.index);
                return;
            }

            const tile = this.layer.getTileAtWorldXY(pointer.worldX, pointer.worldY);

            if (tile){
                this.moveToTileSimple(tile.x, tile.y, tile.index >= 352 && tile.index <= 355)
            }
        })

        this.input.on('pointermove', (pointer) => {
            this.updateGatherHover(pointer);
        })

        this.unsubscribeSkills = onValue(this.skillsRef, (snap) => {
            const data = snap.val();
            if (data && typeof data === 'object') {
                this.skills = {
                    huntingXp: Number(data.huntingXp ?? 0),
                    religionXp: Number(data.religionXp ?? 0),
                    harvestingXp: Number(data.harvestingXp ?? 0),
                    cookingXp: Number(data.cookingXp ?? 0)
                };
                this.uiScene?.refreshSkills(this.skills);
            } else {
                set(this.skillsRef, this.skills);
            }
        });

        EventBus.emit('current-scene-ready', this);
    }

    xpToLevel(xp) {
        const totalXp = Math.max(0, Math.floor(Number(xp) || 0));

        let points = 0;
        for (let level = 1; level < 99; level++) {
            points += Math.floor(level + 300 * Math.pow(2, level / 7));
            const xpForNextLevel = Math.floor(points / 4);

            if (totalXp < xpForNextLevel) {
                return level;
            }
        }

        return 99;
    }

    getSkillLevel(skillName) {
        const key = `${skillName}Xp`;
        return this.xpToLevel(this.skills[key] ?? 0);
    }

    addSkillXp(skillName, amount) {
        if (!amount || amount <= 0) return;

        const key = `${skillName}Xp`;
        const beforeXp = this.skills[key] ?? 0;
        const beforeLevel = this.xpToLevel(beforeXp);

        const afterXp = beforeXp + amount;
        const afterLevel = this.xpToLevel(afterXp);

        this.skills[key] = afterXp;

        if (this.skillsRef) set(this.skillsRef, this.skills);
        this.uiScene?.refreshSkills(this.skills);
        this.uiScene?.showXpDrop(skillName, amount, beforeLevel, afterLevel);
    }

    resetBounds() {
        const cam = this.cameras.main;
        cam.stopFollow();
        cam.removeBounds();
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        const cam = this.cameras.main;
        if (!this.player || !this.layer) return;

        const bounds = this.layer.getBounds();
        const mapW = bounds.width;
        const mapH = bounds.height;

        const screenW = cam.width;
        const screenH = cam.height;

        const halfW = screenW / 2;
        const halfH = screenH / 2;

        if (mapW <= screenW) {
            cam.scrollX = bounds.x - (screenW - mapW) / 2;
        } else {
            const minX = bounds.x;
            const maxX = bounds.right - screenW;
            cam.scrollX = Phaser.Math.Clamp(this.player.x - halfW, minX, maxX);
        }

        if (mapH <= screenH) {
            cam.scrollY = bounds.y - (screenH - mapH) / 2;
        } else {
            const minY = bounds.y;
            const maxY = bounds.bottom - screenH;
            cam.scrollY = Phaser.Math.Clamp(this.player.y - halfH, minY, maxY);
        }
    }

    shouldShowOther(data) {
        return !!data && data.screen === this.player_screen;
    }

    createOtherSprite(id, data) {
        const color = data.color ?? 'grey';
        const direction = data.direction ?? 'east';
        const other = this.add.image(
            data.x ?? this.player.x,
            data.y ?? this.player.y,
            `${color}_${direction}`
        );
        other.setScale(0.3);
        this.otherPlayers.set(id, other);
    }

    removeOtherSprite(id) {
        const other = this.otherPlayers.get(id);
        if (!other) return;
        this.tweens.killTweensOf(other);
        other.destroy();
        this.otherPlayers.delete(id);
    }

    syncOtherPlayer(id, data) {
        this.otherPlayerData.set(id, data);

        if (!this.shouldShowOther(data)) {
            this.removeOtherSprite(id);
            return;
        }

        let other = this.otherPlayers.get(id);
        if (!other) {
            this.createOtherSprite(id, data);
            other = this.otherPlayers.get(id);
        }

        this.tweens.killTweensOf(other);
        this.tweens.add({
            targets: other,
            x: data.x ?? other.x,
            y: data.y ?? other.y,
            duration: this.stepDuration,
            ease: 'Linear'
        });

        other.setTexture(`${data.color ?? 'grey'}_${data.direction ?? 'east'}`);
    }
    
    warp(x, y) {
        const warpKey = `${this.player_screen}_${x}_${y}`;
        const warpTile = WARP_TILES[warpKey];
        if (!warpTile) {
            console.log(`[DEV]: Setup warp tile for ${warpKey}`);
            return;
        }

        const [nextScreen, nextTileX, nextTileY] = warpTile;

        this.player_screen = nextScreen;

        this.create_background(this.player_screen);

        if (Number.isInteger(nextTileX) && Number.isInteger(nextTileY)) {
            this.player.x = nextTileX * TILE_SIZE;
            this.player.y = nextTileY * TILE_SIZE;
        }

        const cam = this.cameras.main;
        this.resetBounds();

         if (this.playerRef) {
            update(this.playerRef, {
                x: this.player.x,
                y: this.player.y,
                color: this.player_color,
                direction: this.direction_facing,
                screen: this.player_screen
            });
        }

        for (const [id, data] of this.otherPlayerData) {
            this.syncOtherPlayer(id, data);
        }

        this.setup_npcs(this.player_screen)
        this.setupGathering(nextScreen);
    }

    generate_new_herbs(){
        let random_value = Math.random();
        if (random_value < 0.01) return 21;
        if (random_value < 0.1) return 20;
        if (random_value < 0.3) return 19;
        if (random_value < 0.6) return 18;
        
        return 17;
    }

    async setupGathering(screen){
        if (screen != 'field') return;
        let gathering_locations = [[13, 3], [26, 2], [3, 7], [19, 8], [8, 11]];

        const screenGatheringRef = ref(db, `gathering/${screen}`);
        const snap = await get(screenGatheringRef);

        if (!snap.exists()) {
            const seed = {};

            for (const [x, y] of gathering_locations) {
                seed[`${x}_${y}`] = {
                    pos: { x, y },
                    tileType: this.generate_new_herbs(),
                    respawnAt: 0
                };

                this.setGatheringTile(x, y, seed[`${x}_${y}`].tileType)
            }

            await set(screenGatheringRef, seed);
        } else {
            const data = snap.val();

            Object.keys(data).forEach((key) => {
                let item = data[key];

                if (Date.now() > item.respawnAt){
                    this.setGatheringTile(item.pos.x, item.pos.y, item.tileType)
                }else{
                    this.time.delayedCall(item.respawnAt - Date.now(), () => {
                        this.setGatheringTile(item.pos.x, item.pos.y, item.tileType);
                    });
                }
                
            })
        }
    }

    getPlayerTilePos() {
        return {
            x: Math.floor(this.player.x / TILE_SIZE),
            y: Math.floor(this.player.y / TILE_SIZE)
        };
    }

    startNpcDialogue(npc, npc_name, npc_dialogue) {
        const npcTileX = Math.floor(npc.x / TILE_SIZE);
        const npcTileY = Math.floor(npc.y / TILE_SIZE);
        const approach = this.getGatherApproachTile(npcTileX, npcTileY);
        const playerTile = this.getPlayerTilePos();
        const expectedScreen = this.player_screen;

        if (npc_name == "medical_minigame_start" || npc_name == "arcade_cabinet"){
            this.uiScene.medical_game_popup();
            return;
        }


        

        const openDialogue = () => {
            if (this.player_screen !== expectedScreen) return;

            let lines = Array.isArray(npc_dialogue) ? [...npc_dialogue] : [String(npc_dialogue ?? '')];

            if (npc_name === 'plate') {
                const offered = this.offerFreshKill();
                const summary =
                    offered.total > 0
                        ? `You offer ${offered.rats} rat(s) and ${offered.snakes} snake(s) to the fresh-kill pile. Starclan smiles down upon you`
                        : 'You have no rats or snakes to offer.';
                lines = [summary];
            }
            
            if (npc_name === 'herb_box'){
                const offered = this.offerHerbs();
                const summary = 
                    offered.total > 0
                        ? `You offer ${offered.total} herbs to the herbs box. Fernsong seems pleased`
                        : `You have no herbs to offer`;
                lines = [summary]
            }

            this.uiScene?.showDialogue(npc_name, lines);
        };

        if (playerTile.x === approach.x && playerTile.y === approach.y) {
            openDialogue();
            return;
        }

        this.moveToTileSimple(approach.x, approach.y, false, openDialogue);
    }

    setup_npcs(screen){
        this.npcs.forEach((npc) => {
            npc.destroy();
        });
        this.npcs = [];
        this.figgy = null;

        if (!Object.keys(NPCs).includes(screen)){
            console.log(`[DEV]: Need to setup NPCs for ${screen}`);
            return;
        }

        let npcs_for_this_screen = NPCs[screen];

        Object.keys(npcs_for_this_screen).forEach((npc_name) => {
            let spawn_position = npcs_for_this_screen[npc_name];

            let npc = this.add.image(spawn_position[0] * TILE_SIZE, spawn_position[1] * TILE_SIZE, npc_name).setScale(0.33 * spawn_position[3]);
            npc.flipX = spawn_position[2];
            this.npcs.push(npc);

            if (npc_name === 'figgy') {
                npc.setInteractive({ useHandCursor: true });
                npc.on('pointerdown', (pointer, localX, localY, event) => {
                    event?.stopPropagation();
                    this.ignoreNextGroundClick = true;
                    this.uiScene.attemptStartTrivia();
                });

                this.figgy = npc; 
            }

            if (Object.keys(DIALOGUE).includes(npc_name)) {
                npc.setInteractive({ useHandCursor: true });
                const npc_dialogue = DIALOGUE[npc_name];

                npc.on('pointerdown', (pointer, localX, localY, event) => {
                    event?.stopPropagation();
                    this.ignoreNextGroundClick = true; 
                    this.startNpcDialogue(npc, npc_name, npc_dialogue);
                });
            }
        });
    }


    findEmptyInventorySlot() {
        return this.inventory.findIndex(slot => slot.item === 'empty');
    }

    addItemToInventory(item) {
        const slot = this.findEmptyInventorySlot();
        if (slot === -1) return false;

        this.inventory[slot] = { item };
        this.uiScene?.refreshInventory(this.inventory);

        if (this.inventoryRef) {
            set(this.inventoryRef, this.inventory);
        }

        return true;
    }

    generateTriviaQuestions(category) {
        const bucket = QUESTIONS[category] || {};
        const keys = Object.keys(bucket);
        if (!keys.length) return [];

        const out = [];
        for (let i = 0; i < TRIVIA.questionsCount; i++) {
            const qKey = keys[Math.floor(Math.random() * keys.length)];
            out.push({
                text: qKey,
                answer: bucket[qKey],
                claimedBy: null,
                claimedAt: null,
                claimerName: null
            });
        }
        return out;
    }


    setGatheringTile(x, y, tileIndex) {
        if (!this.gatheringLayer) return;

        const width = this.gatheringLayer.layer.width;
        const height = this.gatheringLayer.layer.height;

        if (x < 0 || x >= width || y < 0 || y >= height) {
            console.warn('[Gathering] Out of bounds:', x, y);
            return;
        }


        this.gatheringLayer.putTileAt(tileIndex, x, y);
    }

    getPlayerTilePos() {
        const layer = this.layer; 
        return {
            x: layer.worldToTileX(this.player.x),
            y: layer.worldToTileY(this.player.y)
        };
    }

    getGatherApproachTile(tileX, tileY) {
        const playerTile = this.getPlayerTilePos();

        const candidates = [
            { x: tileX - 1, y: tileY },
            { x: tileX + 1, y: tileY }, 
            { x: tileX, y: tileY - 1 },
            { x: tileX, y: tileY + 1 } 
        ];

        const walkable = candidates.filter(({ x, y }) => {
            const tile = this.layer?.getTileAt(x, y);
            return !!tile && tile.index !== -1;
        });

        const list = walkable.length ? walkable : candidates;

        return list.reduce((best, cur) => {
            const bestDist = Phaser.Math.Distance.Squared(playerTile.x, playerTile.y, best.x, best.y);
            const curDist = Phaser.Math.Distance.Squared(playerTile.x, playerTile.y, cur.x, cur.y);
            return curDist < bestDist ? cur : best;
        });
    }


    harvestGatheringTile(tileX, tileY, tileIndex) {
        const key = `${tileX}_${tileY}`;
        if (this.gatheringBusy.has(key)) return;

        const item = this.gatheringItems[tileIndex];
        if (!item) return;

        if (item === 'snake' && this.getSkillLevel('hunting') < 5) {
            this.uiScene.addChat('[Hunting] Need level 5 to hunt snakes');
            return;
        }

        const screen = this.player_screen;
        const approach = this.getGatherApproachTile(tileX, tileY);
        const gatheringTileRef = ref(db, `gathering/${screen}/${tileX}_${tileY}`);

        this.gatheringBusy.add(key);

        this.moveToTileSimple(approach.x, approach.y, false, () => {
            this.time.delayedCall(this.gatheringHarvestMs, () => {

                if (item == 'box'){
                    this.warp(0, 0);
                    return;
                }

                const added = this.addItemToInventory(item);
                if (!added) {
                    this.gatheringBusy.delete(key);
                    return;
                }

                const xpGain = this.xpByItem[item];
                this.addSkillXp(xpGain.skill, xpGain.amount);

                this.setGatheringTile(tileX, tileY, 15);

                if (tileIndex <= 16 || tileIndex >= 22){
                    this.time.delayedCall(this.gatheringRespawnMs, () => {
                        if (this.player_screen !== screen) return;
                        this.setGatheringTile(tileX, tileY, tileIndex);
                        this.gatheringBusy.delete(key);
                    });
                }else{
                    update(gatheringTileRef, {
                        tileType: this.generate_new_herbs(),
                        respawnAt: Date.now() + this.gatheringRespawnMs
                    })
                }
                
            });
        });
    }

    updateGatherHover(pointer){
        const tile = this.gatheringLayer?.getTileAtWorldXY(pointer.worldX, pointer.worldY);
        const item = tile ? this.gatheringItems[tile.index] : null

        if (!tile || tile.index === 15 || !item){
            if (this.hoveredGatheringKey !== null){
                this.hoveredGatheringKey = null;
                this.input.setDefaultCursor('default');
                this.uiScene.gatheringText?.setVisible(false);
            }
            return;
        }

        this.hoveredGatheringKey = `${tile.x}_${tile.y}`;
        this.input.setDefaultCursor('pointer');
        this.uiScene.gatheringText?.setText(`${this.gatheringLanguage[item]} ${item}`);
        this.uiScene.gatheringText?.setVisible(true);
        this.uiScene.gatheringText.setPosition(pointer.x + 16, pointer.y - 12)
    }


    syncInventoryUIAndDB() {
        this.uiScene?.refreshInventory(this.inventory);
        if (this.inventoryRef) set(this.inventoryRef, this.inventory);
    }

    remove_item_at_index(index){
        this.inventory[index] = { item: 'empty' }
    }

    offerFreshKill() {
        let rats = 0;
        let snakes = 0;

        for (let i = 0; i < this.inventory.length; i++) {
            const item = this.inventory[i]?.item;
            if (item === 'rat') {
                this.remove_item_at_index(i);
                rats++;
            } else if (item === 'snake') {
                this.remove_item_at_index(i);
                snakes++;
            }
        }

        const total = rats + snakes;
        if (total > 0) {
            this.addSkillXp('religion', total * 10);
        }

        this.syncInventoryUIAndDB();
        return { rats, snakes, total };
    }

    offerHerbs(){
        const herbs = ["marigold", "borage", "tansy", "garlic", "snakeroot"]
        let total = 0;

        for (let i = 0; i < this.inventory.length; i++){
            const item = this.inventory[i]?.item;
            if (herbs.includes(item)){
                total++;
                this.remove_item_at_index(i)
            }
        }

        if (total != 0) this.addSkillXp('harvesting', total * 10);
        this.syncInventoryUIAndDB()
        return { total }
    }

    showSpeech(playerId, text, duration = 6000) {
        if (!text) return;
        try {
            let x, y;
            x = this.cameras.main.worldView.x + this.cameras.main.width / 2;
            y = this.cameras.main.worldView.y + 100;

            if (playerId === this.player_chat_key || playerId === this.playerId) {
                if (this.player && typeof this.player.x === 'number') {
                    x = this.player.x;
                    y = this.player.y;
                }
            }

            if (this.otherPlayers && this.otherPlayers.has(playerId)) {
                const obj = this.otherPlayers.get(playerId);
                if (obj) {
                    const sprite = obj.sprite || obj;
                    if (sprite && typeof sprite.x === 'number') {
                        x = sprite.x;
                        y = sprite.y;
                    }
                }
            }

            if ((playerId || '').toLowerCase().startsWith('figgy')) {
                if (this.figgy && typeof this.figgy.x === 'number') {
                    x = this.figgy.x;
                    y = this.figgy.y;
                } else if (this.npcs && this.npcs?.figgy && typeof this.npcs.figgy.x === 'number') {
                    x = this.npcs.figgy.x;
                    y = this.npcs.figgy.y;
                }
            }

            const key = `${playerId}:${Date.now()}`;
            const bubble = this.add.text(x, y - 40, text, {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#FFFF66',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(2000);

            this._chatBubbles.set(key, bubble);

            this.tweens.add({
                targets: bubble,
                y: bubble.y - 24,
                alpha: 0,
                duration,
                ease: 'Quad.Out',
                onComplete: () => {
                    bubble.destroy();
                    this._chatBubbles.delete(key);
                }
            });
        } catch (err) {
            console.error('showSpeech failed', err);
        }
    }

    update() {
        this.updateCameraPosition();
    }
}


function bindSceneSystems(systemModule) {
    return Object.fromEntries(
    Object.entries(systemModule)
        .filter(([, value]) => typeof value === 'function')
        .map(([name, fn]) => [name, function(...args) { return fn(this, ...args); }])
    );
}

Object.assign(
    Game.prototype,
    bindSceneSystems(backgroundSystems),
    bindSceneSystems(movementSystem)
);
