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

function heuristic(start, goal, point){
    let g = Math.abs(start[0] - point[0]) + Math.abs(start[1] - point[1]);
    let h = Math.abs(goal[0] - point[0]) + Math.abs(goal[1] - point[1]);

    return g + h;
}

function buildPath(start, goal, scene) {
    const board = scene.board;
    const decorationBoard = scene.decorations_board
    const forbiddenTiles = [37, 36, 38, 5, 4, 6, 69, 68, 70, 39, 40, 41, 7, 8, 9, 71, 72, 73, 103, 104, 105];
    const height = board?.length ?? 0;
    const width = height > 0 ? board[0].length : 0;
    if (width === 0 || height === 0) return [];

    const heuristic = (p, g) => Math.abs(g.x - p.x) + Math.abs(g.y - p.y);

    const startNode = {
        x: start.x,
        y: start.y,
        g: 0,
        f: heuristic(start, goal),
        path: []
    };

    const open = [startNode];
    const closed = new Set([`${start.x},${start.y}`]);

    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    while (open.length > 0) {
        let minIdx = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[minIdx].f) minIdx = i;
        }
        const current = open.splice(minIdx, 1)[0];

        if (current.x === goal.x && current.y === goal.y) return current.path;

        for (const [dx, dy] of dirs) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const key = `${nx},${ny}`;

            if (nx < 0 || nx >= width) continue;
            if (ny < 0 || ny >= height) continue;
            if (closed.has(key)) continue;

            const tile = board[ny][nx];
            const decoTile = decorationBoard[ny][nx]
            if (forbiddenTiles.includes(tile) || forbiddenTiles.includes(decoTile)) continue;

            const g = current.g + 1;
            const f = g + heuristic({ x: nx, y: ny }, goal);

            open.push({
                x: nx,
                y: ny,
                g,
                f,
                path: [...current.path, { x: nx, y: ny }]
            });

            closed.add(key);
        }
    }

    return [];
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


export function moveToTileSimple(scene, tileX, tileY, isWarpTile, onComplete, onFail) {
    if (!scene.player) return;

    scene.moveToken = (scene.moveToken ?? 0) + 1;
    const myToken = scene.moveToken;

    if (scene.currentMoveTween) {
        scene.currentMoveTween.stop();
        scene.onMoveFail?.();
        scene.currentMoveTween = null;
    }

    scene.isStepping = false;

    const start = getPlayerTile(scene);
    const goal = clampToBoard(scene, tileX, tileY);

    if (start.x === goal.x && start.y === goal.y) return;

    const path = buildPath(start, goal, scene);
    if (!path.length) return;

    scene.isStepping = true;
    scene.onMoveFail = onFail;

    const stepNext = (index) => {
        if (myToken !== scene.moveToken){
            return;
        };

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

        scene.moveSeq = (scene.moveSeq ?? 0) + 1;

        if (scene.playerRef) {
            update(scene.playerRef, {
                x: world.x,
                y: world.y,
                tileX: p.x,
                tileY: p.y,
                color: scene.player_color,
                direction: getDirectionFromStep(dx, dy),
                moving: true,
                moveSeq: scene.moveSeq,
                movedAt: Date.now()
            });
        }

        scene.currentMoveTween = scene.tweens.add({
            targets: scene.player,
            x: world.x,
            y: world.y,
            duration: scene.stepDuration,
            ease: 'Linear',
            onComplete: () => {
                if (myToken !== scene.moveToken) return;
                stepNext(index + 1);
            }
        });
    };

    stepNext(0);
}