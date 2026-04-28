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
    onValue
} from 'firebase/database';
import * as backgroundSystems from "./systems/background"
import * as movementSystem from "./systems/movement"
import {TILE_SIZE, WARP_TILES, NPCs, DIALOGUE} from "./systems/constants"

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
        this.player_screen = "clan";
        this.moveToken = 0;
        this.currentMoveTween = null;
        this.npcs = []
        this.inventory = Array.from({ length: 28 }, () => ({ item: 'empty' }));
        this.gatheringRespawnMs = 5000;
        this.gatheringHarvestMs = 500;
        this.gatheringBusy = new Set();

        this.gatheringItems = {
            86: 'rat',
            87: 'snake',
        };

         this.ignoreNextGroundClick = false;

        this.skills = {
            huntingXp: 0,
            religionXp: 0
        };

        this.skillsRef = null;
        this.unsubscribeSkills = null;

        this.huntingXpByItem = {
            rat: 15,
            snake: 40
        };
    }

    init(data) {
        const incomingName = String(data?.playerName ?? '').trim();
        const incomingColor = String(data?.playerColor ?? '').trim();

        this.player_name = incomingName || this.player_name || Math.random().toString(36).substring(2, 7);

        const allowedSkins = new Set(['brown', 'grey', 'geji']);
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
        const bounds = this.layer.getBounds(); 
        cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
        cam.startFollow(this.player, true, 1, 1); 


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


        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.unsubscribeAdded) this.unsubscribeAdded();
            if (this.unsubscribeChanged) this.unsubscribeChanged();
            if (this.unsubscribeRemoved) this.unsubscribeRemoved();
            if (this.unsubscribeSkills) this.unsubscribeSkills();
            if (this.unsubscribeInventory) this.unsubscribeInventory();

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
                this.moveToTileSimple(tile.x, tile.y, tile.index == 80 || tile.index == 81)
            }
        })

        this.unsubscribeSkills = onValue(this.skillsRef, (snap) => {
            const data = snap.val();
            if (data && typeof data === 'object') {
                this.skills = {
                    huntingXp: Number(data.huntingXp ?? 0),
                    religionXp: Number(data.religionXp ?? 0)
                };
                this.uiScene?.refreshSkills(this.skills);
            } else {
                set(this.skillsRef, this.skills);
            }
        });

        EventBus.emit('current-scene-ready', this);
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
        const bounds = this.layer.getBounds();
        cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
        cam.startFollow(this.player, true, 1, 1);

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

        if (!Object.keys(NPCs).includes(screen)){
            console.log(`[DEV]: Need to setup NPCs for ${screen}`);
            return;
        }

        let npcs_for_this_screen = NPCs[screen];

        Object.keys(npcs_for_this_screen).forEach((npc_name) => {
            let spawn_position = npcs_for_this_screen[npc_name];

            let npc = this.add.image(spawn_position[0] * TILE_SIZE, spawn_position[1] * TILE_SIZE, npc_name).setScale(0.33);
            npc.flipX = spawn_position[2];
            this.npcs.push(npc);

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

    getGatherApproachTile(tileX, tileY) {
        const playerX = Math.floor(this.player.x / TILE_SIZE);
        const playerY = Math.floor(this.player.y / TILE_SIZE);

        const dx = tileX - playerX;
        const dy = tileY - playerY;

        if (Math.abs(dx) <= Math.abs(dy)) {
            return {
                x: tileX - Math.sign(dx || 1),
                y: tileY
            };
        }

        return {
            x: tileX,
            y: tileY - Math.sign(dy || 1)
        };
    }


    harvestGatheringTile(tileX, tileY, tileIndex) {
        const key = `${tileX},${tileY}`;
        if (this.gatheringBusy.has(key)) return;

        const item = this.gatheringItems[tileIndex];
        if (!item) return;

        if (item === 'snake' && this.getSkillLevel('hunting') < 10) {
            this.uiScene.addChat('[Hunting] Need level 10 to hunt snakes');
            return;
        }

        const screen = this.player_screen;
        const approach = this.getGatherApproachTile(tileX, tileY);

        this.gatheringBusy.add(key);

        this.moveToTileSimple(approach.x, approach.y, false, () => {
            this.time.delayedCall(this.gatheringHarvestMs, () => {
                const added = this.addItemToInventory(item);
                if (!added) {
                    this.gatheringBusy.delete(key);
                    return;
                }

                const gain = this.huntingXpByItem[item] ?? 0;
                this.addSkillXp('hunting', gain);

                this.setGatheringTile(tileX, tileY, 15);

                this.time.delayedCall(this.gatheringRespawnMs, () => {
                    if (this.player_screen !== screen) return;
                    this.setGatheringTile(tileX, tileY, tileIndex);
                    this.gatheringBusy.delete(key);
                });
            });
        });
    }


    syncInventoryUIAndDB() {
        this.uiScene?.refreshInventory(this.inventory);
        if (this.inventoryRef) set(this.inventoryRef, this.inventory);
    }

    offerFreshKill() {
        let rats = 0;
        let snakes = 0;

        for (let i = 0; i < this.inventory.length; i++) {
            const item = this.inventory[i]?.item;
            if (item === 'rat') {
                this.inventory[i] = { item: 'empty' };
                rats += 1;
            } else if (item === 'snake') {
                this.inventory[i] = { item: 'empty' };
                snakes += 1;
            }
        }

        const total = rats + snakes;
        if (total > 0) {
            this.addSkillXp('religion', total * 10);
        }

        this.syncInventoryUIAndDB();
        return { rats, snakes, total };
    }

    update() {

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
