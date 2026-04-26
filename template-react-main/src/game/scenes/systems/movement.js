import { update } from 'firebase/database';
import { TILE_SIZE } from './constants';

function getPlayerTile(scene) {
    return {
        x: Math.floor(scene.player.x / TILE_SIZE),
        y: Math.floor(scene.player.y / TILE_SIZE)
    };
}

function toWorldCenter(tileX, tileY) {
    return {
        x: (tileX + 0.5) * TILE_SIZE,
        y: (tileY + 0.5) * TILE_SIZE
    };
}

function clampToBoard(scene, x, y) {
    const h = scene.decorations_board?.length ?? 0;
    const w = h > 0 ? scene.decorations_board[0].length : 0;
    if (w === 0 || h === 0) return { x, y };

    return {
        x: Math.max(0, Math.min(w - 1, x)),
        y: Math.max(0, Math.min(h - 1, y))
    };
}

function buildStraightLPath(start, goal) {
    const path = [];
    let x = start.x;
    let y = start.y;

    while (x !== goal.x) {
        x += goal.x > x ? 1 : -1;
        path.push({ x, y });
    }

    while (y !== goal.y) {
        y += goal.y > y ? 1 : -1;
        path.push({ x, y });
    }

    return path;
}

function getDirectionFromStep(dx, dy) {
    if (dx > 0) return 'east';
    if (dx < 0) return 'west';
    if (dy > 0) return 'south';
    if (dy < 0) return 'north';
    return null;
}

function setPlayerFacing(scene, dx, dy) {
    const direction = getDirectionFromStep(dx, dy);
    if (!direction) return;

    scene.direction_facing = direction;

    if (scene.player_color) {
        scene.player.setTexture(`${scene.player_color}_${direction}`);
    }
}


export function moveToTileSimple(scene, tileX, tileY, isWarpTile, onComplete) {
    if (!scene.player) return;

    scene.moveToken = (scene.moveToken ?? 0) + 1;
    const myToken = scene.moveToken;

    if (scene.currentMoveTween) {
        scene.currentMoveTween.stop();
        scene.currentMoveTween = null;
    }

    scene.isStepping = false;

    const start = getPlayerTile(scene);
    const goal = clampToBoard(scene, tileX, tileY);

    if (start.x === goal.x && start.y === goal.y) return;

    const path = buildStraightLPath(start, goal);
    if (!path.length) return;

    scene.isStepping = true;

    const stepNext = (index) => {
        if (myToken !== scene.moveToken) return; 

        if (index >= path.length) {
            scene.isStepping = false;
            scene.currentMoveTween = null;

            if (isWarpTile && myToken === scene.moveToken) {
                scene.warp(tileX, tileY);
            }

            onComplete?.();
            return;
        }

        const p = path[index];
        const prev = index === 0 ? start : path[index - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;

        setPlayerFacing(scene, dx, dy);
        const world = toWorldCenter(p.x, p.y);

        scene.currentMoveTween = scene.tweens.add({
            targets: scene.player,
            x: world.x,
            y: world.y,
            duration: scene.stepDuration,
            ease: 'Linear',
            onComplete: () => {
                if (myToken !== scene.moveToken) return;

                if (scene.playerRef) {
                    update(scene.playerRef, {
                        x: scene.player.x,
                        y: scene.player.y,
                        color: scene.player_color,
                        direction: getDirectionFromStep(dx, dy)
                    });
                }

                stepNext(index + 1);
            }
        });
    };

    stepNext(0);
}