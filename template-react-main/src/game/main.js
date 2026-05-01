import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import * as Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';
import { UIScene } from './scenes/UIScene';
import { MainMenu } from './scenes/systems/MainMenu';
import { MedicalMinigame } from './scenes/MedicalMinigame';

const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    render: {
        pixelArt: true, 
        antialias: true,
        roundPixels: true
    },
    parent: 'game-container',
    scene: [
        Boot,
        Preloader,
        Game,
        UIScene,
        MainMenu,
        MedicalMinigame
    ]
};

const StartGame = (parent) => {

    return new Phaser.Game({ ...config, parent });

}

export default StartGame;
