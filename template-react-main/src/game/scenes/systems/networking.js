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
import { db } from '../../firebase';
import {TRIVIA} from "./constants"
import * as Phaser from 'phaser';

export function setup_networking(scene){
    scene.playerRef = ref(db, `players/${scene.playerId}`);
    scene.playersRef = ref(db, 'players');
    scene.inventoryRef = ref(db, `inventories/${scene.playerId}`);
    scene.skillsRef = ref(db, `skills/${scene.playerId}`);
    scene.gatheringRef = ref(db, 'gathering')

    scene.triviaRef = ref(db, TRIVIA.dbPath);
    scene.unsubscribeTrivia = onValue(scene.triviaRef, (snap) => {
        scene.currentTrivia = snap.val() || null;
    });

    scene.unsubscribeInventory = onValue(scene.inventoryRef, (snap) => {
        const data = snap.val();
        if (Array.isArray(data) && data.length === 28) {
            scene.inventory = data;
            scene.uiScene?.refreshInventory(scene.inventory);
        } else {
            set(scene.inventoryRef, scene.inventory); 
        }
    });

    set(scene.playerRef, {
        x: scene.player.x,
        y: scene.player.y,
        color: scene.player_color,
        direction : scene.direction_facing,
        screen: scene.player_screen
    });

    onDisconnect(scene.playerRef).remove();

    scene.unsubscribeAdded = onChildAdded(scene.playersRef, (snapshot) => {
        const id = snapshot.key;
        if (!id || id === scene.playerId) return;

        const data = snapshot.val();
        if (!data) return;

        scene.syncOtherPlayer(id, data);
    });

    scene.unsubscribeChanged = onChildChanged(scene.playersRef, (snapshot) => {
        const id = snapshot.key;
        if (!id || id === scene.playerId) return;

        const data = snapshot.val();
        if (!data) return;

        scene.syncOtherPlayer(id, data);
    });

    scene.unsubscribeRemoved = onChildRemoved(scene.playersRef, (snapshot) => {
        const id = snapshot.key;
        if (!id) return;

        scene.otherPlayerData.delete(id);
        scene.removeOtherSprite(id);
    });

    scene.unsubscribeGathering = onChildChanged(scene.gatheringRef, (snapshot) => {
        if (scene.player_screen != 'field') return;
        const data = snapshot.val();

        Object.keys(data).forEach((key) => {
            let item = data[key];
            if (item.respawnAt > Date.now()){
                scene.setGatheringTile(item.pos.x, item.pos.y, 15);

                if (item.respawnAt - Date.now() < 100){
                    scene.setGatheringTile(item.pos.x, item.pos.y, item.tileType);
                    scene.gatheringBusy.delete(key)
                }else{
                    scene.time.delayedCall(item.respawnAt - Date.now(), () => {
                        scene.setGatheringTile(item.pos.x, item.pos.y, item.tileType);
                        scene.gatheringBusy.delete(key)
                    });
                }
            }
        })
    })


    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (scene.unsubscribeAdded) scene.unsubscribeAdded();
        if (scene.unsubscribeChanged) scene.unsubscribeChanged();
        if (scene.unsubscribeRemoved) scene.unsubscribeRemoved();
        if (scene.unsubscribeSkills) scene.unsubscribeSkills();
        if (scene.unsubscribeInventory) scene.unsubscribeInventory();
        if (scene.unsubscribeGathering) scene.unsubscribeGathering();
        if (scene.unsubscribeTrivia) scene.unsubscribeTrivia();

        if (scene.playerRef) remove(scene.playerRef);

        for (const [, rect] of scene.otherPlayers) rect.destroy();
        scene.otherPlayers.clear();
    });

    scene.unsubscribeSkills = onValue(scene.skillsRef, (snap) => {
        const data = snap.val();
        if (data && typeof data === 'object') {
            scene.skills = {
                huntingXp: Number(data.huntingXp ?? 0),
                religionXp: Number(data.religionXp ?? 0),
                harvestingXp: Number(data.harvestingXp ?? 0),
                cookingXp: Number(data.cookingXp ?? 0)
            };
            scene.uiScene?.refreshSkills(scene.skills);
        } else {
            set(scene.skillsRef, scene.skills);
        }
    });
    
}