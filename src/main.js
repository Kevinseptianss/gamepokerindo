import Phaser from 'phaser';
import './index.css';
import GameScene from './scenes/GameScene.js';
import MenuScene from './scenes/MenuScene.js';

// Game configuration optimized for mobile portrait mode
const config = {
    type: Phaser.AUTO,
    width: 375,
    height: 667,
    parent: 'game-container',
    backgroundColor: '#0d4d3c',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 320,
            height: 568
        },
        max: {
            width: 414,
            height: 896
        }
    },
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
    },
    scene: [
        MenuScene,
        GameScene
    ],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    input: {
        activePointers: 3,
    },
    // Disable audio to prevent Web Audio warnings
    audio: {
        disableWebAudio: true,
        noAudio: true
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Handle window resize for mobile devices
window.addEventListener('resize', () => {
    game.scale.refresh();
});

// Prevent context menu on mobile
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

export default game;
