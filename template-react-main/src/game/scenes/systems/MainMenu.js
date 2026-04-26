import { EventBus } from '../../EventBus';
import { Scene } from 'phaser';

export class MainMenu extends Scene {
    logoTween;

    constructor() {
        super('MainMenu');

        this.playerName = '';
        this.nameFocused = false;

        this.skins = ['brown', 'grey', 'geji'];
        this.selectedSkinIndex = 0;
    }

    create() {
        const { width, height } = this.scale;

        this.game.canvas.style.imageRendering = 'auto';
        this.cameras.main.setRoundPixels(false);

        const addHoverEffect = (textObject, baseColor, hoverColor, hoverScale, isGeji = false) => {
            textObject.setInteractive({ useHandCursor: true });

            textObject.on('pointerover', () => {
                textObject.setStyle({ color: hoverColor });
                this.tweens.add({
                    targets: textObject,
                    scaleX: isGeji ? 3 : hoverScale,
                    scaleY: isGeji ? 3 : hoverScale,
                    duration: 120,
                    ease: 'Quad.Out'
                });
            });

            textObject.on('pointerout', () => {
                textObject.setStyle({ color: baseColor });
                this.tweens.add({
                    targets: textObject,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 120,
                    ease: 'Quad.Out'
                });
            });
        };

        this.add.image(width / 2, height / 2, 'bg')
            .setDisplaySize(width, height)
            .setDepth(-1);

        const titleText = this.add.text(width / 2, height * 0.2, 'Moontail', {
            fontFamily: 'Georgia, Times, serif',
            fontSize: '98px',
            fontStyle: 'bold',
            color: '#d1c5b8',
            stroke: '#000000',
            strokeThickness: 9,
            shadow: {
                offsetX: 0,
                offsetY: 6,
                color: '#2d1300',
                blur: 8,
                fill: true
            }
        }).setOrigin(0.5).setDepth(3);

        this.add.particles(0, 0, 'particle', {
            x: { min: titleText.x - 180, max: titleText.x + 180 },
            y: { min: titleText.y + 20, max: titleText.y + 50 },
            speedX: { min: -14, max: 14 },
            speedY: { min: -90, max: -36 },
            accelerationY: -12,
            lifespan: { min: 320, max: 620 },
            scale: { start: 0.28, end: 0 },
            alpha: { start: 0.3, end: 0 },
            angle: { min: 0, max: 360 },
            tint: [0xff4d00, 0xff8c1a, 0xffd166],
            frequency: 100,
            quantity: 2,
            blendMode: 'ADD'
        }).setDepth(2);

        const programmingCredit = this.add.text(width / 2, height * 0.27, 'Created by Officeplay, a minor motion sitcom', {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const gejiCredit = this.add.text(width / 2, height * 0.30, '(Secretly created by Geji)', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        addHoverEffect(titleText, '#ffffff', '#ffd166', 1.06);
        addHoverEffect(programmingCredit, '#ffffff', '#ffd166', 1.08);
        addHoverEffect(gejiCredit, '#ffffff', '#ffd166', 1.08, true);

        // Name input box
        this.nameBox = this.add.rectangle(width / 2, height * 0.48, 520, 60, 0x1a1a1a)
            .setStrokeStyle(3, 0xffffff, 0.7)
            .setInteractive({ useHandCursor: true });

        this.nameLabel = this.add.text(width / 2, height * 0.44, 'Player Name', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.nameText = this.add.text(width / 2 - 240, height * 0.48, 'Click here and type...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#bbbbbb'
        }).setOrigin(0, 0.5);

        this.nameBox.on('pointerdown', () => {
            this.nameFocused = true;
            this.refreshNameText();
        });

        this.input.keyboard.on('keydown', (event) => {
            if (!this.nameFocused) return;

            if (event.key === 'Enter') {
                this.nameFocused = false;
                this.refreshNameText();
                return;
            }

            if (event.key === 'Escape') {
                this.nameFocused = false;
                this.refreshNameText();
                return;
            }

            if (event.key === 'Backspace') {
                this.playerName = this.playerName.slice(0, -1);
                this.refreshNameText();
                return;
            }

            if (event.key.length === 1 && this.playerName.length < 12) {
                this.playerName += event.key;
                this.refreshNameText();
            }
        });

        this.skinLabel = this.add.text(width / 2, height * 0.60, 'Cat Skin', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.leftArrow = this.add.text(width / 2 - 170, height * 0.72, '◀', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.rightArrow = this.add.text(width / 2 + 170, height * 0.72, '▶', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.skinPreview = this.add.image(width / 2, height * 0.72, `${this.skins[this.selectedSkinIndex]}_east`)
            .setScale(0.75);

        this.skinNameText = this.add.text(width / 2, height * 0.82, this.skins[this.selectedSkinIndex], {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const updateSkin = () => {
            const skin = this.skins[this.selectedSkinIndex];
            this.skinPreview.setTexture(`${skin}_east`);
            this.skinNameText.setText(skin);
        };

        this.leftArrow.on('pointerdown', () => {
            this.selectedSkinIndex = (this.selectedSkinIndex - 1 + this.skins.length) % this.skins.length;
            updateSkin();
        });

        this.rightArrow.on('pointerdown', () => {
            this.selectedSkinIndex = (this.selectedSkinIndex + 1) % this.skins.length;
            updateSkin();
        });

        const playButton = this.add.text(width / 2, height * 0.90, 'JOIN', {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#ffffff',
            backgroundColor: '#1a1a1a',
            stroke: '#000000',
            strokeThickness: 6,
            padding: { x: 22, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playButton.on('pointerover', () => {
            playButton.setStyle({ color: '#ffd166' });
            this.tweens.add({
                targets: playButton,
                scaleX: 1.12,
                scaleY: 1.12,
                duration: 120,
                ease: 'Quad.Out'
            });
        });

        playButton.on('pointerout', () => {
            playButton.setStyle({ color: '#ffffff' });
            this.tweens.add({
                targets: playButton,
                scaleX: 1,
                scaleY: 1,
                duration: 120,
                ease: 'Quad.Out'
            });
        });

        playButton.on('pointerdown', () => {
            const finalName = this.playerName.trim() || `player_${Math.random().toString(36).slice(2, 6)}`;
            const finalSkin = this.skins[this.selectedSkinIndex];

            this.scene.start('Game', {
                playerName: finalName,
                playerColor: finalSkin
            });
        });

        EventBus.emit('current-scene-ready', this);
    }

    refreshNameText() {
        if (!this.nameFocused && this.playerName.length === 0) {
            this.nameText.setText('Click here and type...');
            this.nameText.setColor('#bbbbbb');
            return;
        }

        const caret = this.nameFocused ? '|' : '';
        this.nameText.setText(this.playerName + caret);
        this.nameText.setColor('#ffffff');
    }

    changeScene() {
        this.scene.start('Game');
    }
}