import Phaser from 'phaser';
import './index.css';
import GameScene from './scenes/GameScene.js';
import MenuScene from './scenes/MenuScene.js';

// Game configuration with optional high-resolution modes
const DPR = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
// Read hd mode from URL query: ?hd=2x  or ?hd=4k
const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
const hdMode = urlParams.get('hd'); // '2x' or '4k'

let baseWidth = 393; // logical CSS pixels
let baseHeight = 852;
let resolution = DPR; // default backing-store pixel ratio

if (hdMode === '2x') {
    // double logical resolution (HD mode) - safer than full 4K
    baseWidth = 1920;
    baseHeight = 1080;
    resolution = Math.min(3, DPR); // allow up to DPR backing store
    console.log('HD mode: 2x enabled — using', baseWidth, 'x', baseHeight, 'resolution', resolution);
} else if (hdMode === '4k') {
    // 4K logical canvas: WARNING - may use a lot of memory on mobile devices
    baseWidth = 3840;
    baseHeight = 2160;
    // keep resolution 1 to avoid extremely large backing buffers; Phaser will scale down
    resolution = 1;
    console.warn('HD mode: 4K enabled — this may be slow or use large memory on mobile devices');
}

const config = {
    type: Phaser.AUTO,
    // Logical canvas size (CSS pixels)
    width: baseWidth,
    height: baseHeight,
    parent: 'game-container',
    backgroundColor: '#0d4d3c',
    resolution: resolution, // render backing store multiplier
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        // Allow a wider range so the game can adapt to different screens
        min: {
            width: 320,
            height: 568
        },
        max: {
            width: Math.min(3840, baseWidth),
            height: Math.min(2160, baseHeight)
        }
    },
    render: {
        antialias: true,
        antialiasGL: true,
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

// Ensure the canvas fills the container and the backing store matches DPR to avoid browser upscaling
function fitCanvasToContainer() {
    try {
        const container = document.getElementById('game-container');
        const canvas = container ? container.querySelector('canvas') : document.querySelector('canvas');
        if (!canvas || !container) return;
        // Set CSS size to container size (Phaser will handle the backing store via resolution)
        const rect = container.getBoundingClientRect();
        canvas.style.width = `${Math.round(rect.width)}px`;
        canvas.style.height = `${Math.round(rect.height)}px`;
        // Ensure canvas drawing buffer is sized according to DPR (Phaser uses config.resolution)
        // No direct changes to canvas.width/height needed here; Phaser sets them based on resolution.
    } catch (e) {
        // ignore in environments without DOM
    }
}

window.addEventListener('resize', () => {
    game.scale.refresh();
    fitCanvasToContainer();
});

// Run once after game is ready to ensure canvas sizing
window.addEventListener('load', () => setTimeout(fitCanvasToContainer, 50));

// Handle window resize for mobile devices
window.addEventListener('resize', () => {
    game.scale.refresh();
});

// Prevent context menu on mobile
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

export default game;
