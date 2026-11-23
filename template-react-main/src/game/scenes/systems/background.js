
import {
  WORLD_WIDTH_IN_TILES,
  WORLD_HEIGHT_IN_TILES,
} from '../systems/constants';

import { boards } from "../backgrounds/backgrounds"

function is_neighbor_grass(x, y, board, grass_tile=0){
    if (x < 0 || x >= WORLD_WIDTH_IN_TILES || y < 0 || y >= WORLD_HEIGHT_IN_TILES) return true;
    return board[y][x] == grass_tile;
}

const WATER_TILE = 33;

export function create_background(scene, screen) {
    destroyOldBackground(scene);

    scene.board = boards[`${screen}_tiles`];
    scene.decorations_board = boards[`${screen}_decorations`];

    if (!scene.board || !scene.decorations_board) return;

    scene.map = scene.make.tilemap({
        data: scene.board,
        tileWidth: 16,
        tileHeight: 16
    });

    scene.tiles = scene.map.addTilesetImage('bg_tiles', 'bg_tiles', 16, 16, 0, 0);

    scene.layer = scene.map.createLayer(0, scene.tiles, 0, 0);
    scene.layer.setScale(3);
    scene.layer.setDepth(-2);

    scene.decorationMap = scene.make.tilemap({
        data: scene.decorations_board,
        tileWidth: 16,
        tileHeight: 16
    });

    scene.decorations = scene.decorationMap.createLayer(0, scene.tiles, 0, 0);
    scene.decorations.setScale(3);
    scene.decorations.setDepth(-1);
    
    createGatheringBoard(scene, screen);
    createItemBoard(scene);
}

function destroyOldBackground(scene) {
    if (scene.gatheringLayer) {
        scene.gatheringLayer.destroy(true);
        scene.gatheringLayer = null;
    }
    if (scene.gatheringMap) {
        scene.gatheringMap.destroy();
        scene.gatheringMap = null;
    }

    if (scene.decorations) {
        scene.decorations.destroy(true);
        scene.decorations = null;
    }
    if (scene.layer) {
        scene.layer.destroy(true);
        scene.layer = null;
    }
    if (scene.decorationMap) {
        scene.decorationMap.destroy();
        scene.decorationMap = null;
    }
    if (scene.map) {
        scene.map.destroy();
        scene.map = null;
    }
}

function createGatheringBoard(scene, screen) {
    const nodes = boards[`${screen}_gathering`] ?? [];
    const height = scene.board?.length ?? 0;
    const width = height > 0 ? scene.board[0].length : 0;
    if (width === 0 || height === 0) return;

     const gatheringBoard = Array.from({ length: height }, () =>
        Array(width).fill(15)
    );

    scene.gatheringNodes = [];

    for (const node of nodes) {
        const { x, y, resourceTile, type } = node;
        if (
            x < 0 || x >= width ||
            y < 0 || y >= height
        ) continue;

        gatheringBoard[y][x] = resourceTile;
        scene.gatheringNodes.push({ x, y, type, resourceTile });
    }

    scene.gatheringBoard = gatheringBoard;

    scene.gatheringMap = scene.make.tilemap({
        data: gatheringBoard,
        tileWidth: 16,
        tileHeight: 16
    });

    scene.gatheringTiles = scene.gatheringMap.addTilesetImage('bg_tiles', 'bg_tiles', 16, 16, 0, 0);

    scene.gatheringLayer = scene.gatheringMap.createLayer(0, scene.gatheringTiles, 0, 0);
    scene.gatheringLayer.setScale(3);
    scene.gatheringLayer.setDepth(-0.5);
}

function createItemBoard(scene){
    const height = scene.board?.length ?? 0;
    const width = height > 0 ? scene.board[0].length : 0;
    if (width === 0 || height === 0) return;

    scene.itemBoard = Array.from({ length: height }, () =>
        Array(width).fill(15)
    );

    scene.itemMap = scene.make.tilemap({
        data: scene.itemBoard,
        tileWidth: 16,
        tileHeight: 16
    });

    scene.itemTiles = scene.itemMap.addTilesetImage('bg_tiles', 'bg_tiles', 16, 16, 0, 0);

    scene.itemLayer = scene.itemMap.createLayer(0, scene.itemTiles, 0, 0)
    scene.itemLayer.setScale(3);
    scene.itemLayer.setDepth(-0.25)
}