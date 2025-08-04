import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Create simple colored rectangles for cards since we don't have images yet
        this.load.image('card-back', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0d4d3c);

        // Title
        this.add.text(width / 2, height * 0.2, 'TEXAS HOLD\'EM', {
            fontSize: '32px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.3, 'POKER', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Start Game Button
        const startButton = this.add.rectangle(width / 2, height * 0.5, 200, 60, 0x4CAF50)
            .setStrokeStyle(3, 0x2E7D32)
            .setInteractive({ useHandCursor: true });

        const startText = this.add.text(width / 2, height * 0.5, 'START GAME', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Button hover effects
        startButton.on('pointerover', () => {
            startButton.setFillStyle(0x66BB6A);
        });

        startButton.on('pointerout', () => {
            startButton.setFillStyle(0x4CAF50);
        });

        startButton.on('pointerdown', () => {
            startButton.setFillStyle(0x2E7D32);
        });

        startButton.on('pointerup', () => {
            this.scene.start('GameScene');
        });

        // Instructions
        this.add.text(width / 2, height * 0.7, 'Play offline Texas Hold\'em poker\nagainst AI opponents', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            fill: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);

        // Version info
        this.add.text(width / 2, height * 0.9, 'Mobile Optimized | Portrait Mode', {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            fill: '#888888',
            align: 'center'
        }).setOrigin(0.5);
    }
}
