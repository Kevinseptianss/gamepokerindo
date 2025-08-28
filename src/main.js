import Phaser from 'phaser';
import './index.css';
import GameScene from './scenes/GameScene.js';
import MenuScene from './scenes/MenuScene.js';

// Game configuration with optional high-resolution modes
const DPR = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
// Read hd mode from URL query: ?hd=2x  or ?hd=4k
const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
const hdMode = urlParams.get('hd'); // '2x' or '4k'

// Use reasonable base size that works well with Scale.FIT - don't make it too large
let baseWidth = 800; // logical CSS pixels - reasonable size for scaling
let baseHeight = 600; // logical CSS pixels - reasonable size for scaling  
let resolution = DPR; // use device pixel ratio for backing store sharpness

if (hdMode === '2x') {
    // double logical resolution (HD mode) - safer than full 4K
    baseWidth = 1920;
    baseHeight = 1080;
    resolution = Math.max(3, DPR); // allow up to 3x DPR backing store for extra sharpness
    console.log('HD mode: 2x enabled — using', baseWidth, 'x', baseHeight, 'resolution', resolution);
} else if (hdMode === '4k') {
    // 4K logical canvas: WARNING - may use a lot of memory on mobile devices
    baseWidth = 3840;
    baseHeight = 2160;
    // use at least 2x resolution even in 4K mode for sharpness
    resolution = Math.max(2, DPR);
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
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
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
        // Determine the resolution Phaser is using (fallback to devicePixelRatio)
        const res = (game && game.config && game.config.resolution) ? (game.config.resolution || window.devicePixelRatio || 1) : (window.devicePixelRatio || 1);
        // Set the CSS display size to container logical pixels
        canvas.style.width = `${Math.round(rect.width)}px`;
        canvas.style.height = `${Math.round(rect.height)}px`;
        
        // Let Phaser handle the backing buffer via its resolution system - don't override manually
        // Manual canvas.width/height can desync Phaser's renderer and cause black screens
        console.log(`Canvas CSS sizing: ${Math.round(rect.width)}x${Math.round(rect.height)} (DPR=${res})`);
        
        // If a 2D context exists, ensure smoothing is enabled for crisp vector/text rendering
        try {
            const ctx = canvas.getContext && canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
            }
        } catch (e) { /* ignore */ }
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
