import Phaser from 'phaser';
import { PokerGame, GAME_PHASES, ACTIONS } from '../poker/PokerGame.js';
import { AI_PERSONALITIES } from '../poker/AIPlayer.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.pokerGame = null;
        this.playerTexts = [];
        this.actionButtons = [];
        this.aiCardGroups = [];
        this.actionDisplays = [];
        this.playerHandDealt = false; // Flag to prevent re-dealing player cards

        // UI Elements
        this.phaseText = null;
        this.potText = null;
        this.winnerText = null;
        this.playerCardsGroup = null;
        this.communityCardsGroup = null;
        
        // Raise UI
        this.raiseSlider = null;
        this.raiseAmountText = null;

        this.aiPlayers = [
            null, // Human player at index 0
            AI_PERSONALITIES.TIGHT_PASSIVE,
            AI_PERSONALITIES.LOOSE_AGGRESSIVE,
            AI_PERSONALITIES.TIGHT_AGGRESSIVE
        ];
    }

    preload() {
        this.createCardGraphics();
    }

    create() {
        const { width, height } = this.cameras.main;

        this.createPokerTable(width, height);

        // FIX: Initialize the game with 4 players (1 human + 3 AI).
        // The PokerGame class likely needs the number of players to create.
        this.pokerGame = new PokerGame(4);
        this.pokerGame.initGame();
        
        this.createUI();
        this.createActionButtons();
        this.createRaiseSlider();
        
        this.updateGameDisplay();
        
        if (this.pokerGame.activePlayerIndex !== 0) {
            this.time.delayedCall(1500, () => {
                this.handleAITurns();
            });
        }
    }

    createPokerTable(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x0d4d3c);
        const tableGraphics = this.add.graphics();
        tableGraphics.fillStyle(0x000000, 0.3);
        tableGraphics.fillEllipse(width / 2 + 5, height / 2 + 5, width * 0.85, height * 0.6);
        tableGraphics.fillStyle(0x1b5e20);
        tableGraphics.fillEllipse(width / 2, height / 2, width * 0.85, height * 0.6);
        tableGraphics.lineStyle(4, 0x2e7d32);
        tableGraphics.strokeEllipse(width / 2, height / 2, width * 0.85, height * 0.6);
        tableGraphics.lineStyle(1, 0x388e3c);
        tableGraphics.strokeEllipse(width / 2, height / 2, width * 0.8, height * 0.55);
        const cardAreaWidth = 380; // Widened for better card spacing
        const cardAreaHeight = 90;
        tableGraphics.fillStyle(0x2e7d32);
        tableGraphics.fillRoundedRect(width / 2 - cardAreaWidth / 2, height / 2 - cardAreaHeight / 2, cardAreaWidth, cardAreaHeight, 10);
        tableGraphics.lineStyle(2, 0x4caf50);
        tableGraphics.strokeRoundedRect(width / 2 - cardAreaWidth / 2, height / 2 - cardAreaHeight / 2, cardAreaWidth, cardAreaHeight, 10);
    }

    createCardGraphics() {
        const cardWidth = 70;
        const cardHeight = 98;
        const backGraphics = this.add.graphics();
        backGraphics.fillStyle(0x0d47a1);
        backGraphics.fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
        backGraphics.lineStyle(3, 0x1976d2);
        backGraphics.strokeRoundedRect(1.5, 1.5, cardWidth - 3, cardHeight - 3, 7);
        backGraphics.fillStyle(0x1565c0, 0.5);
        for (let i = 10; i < cardWidth - 10; i += 10) {
            for (let j = 10; j < cardHeight - 10; j += 10) {
                backGraphics.fillCircle(i, j, 1.5);
            }
        }
        backGraphics.generateTexture('card-back', cardWidth, cardHeight);
        backGraphics.destroy();

        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const suitSymbols = ['♥', '♦', '♣', '♠'];
        const suitColors = ['#e53935', '#e53935', '#212121', '#212121'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        suits.forEach((suit, suitIndex) => {
            ranks.forEach(rank => {
                this.createBeautifulCard(suit, rank, suitSymbols[suitIndex], suitColors[suitIndex], cardWidth, cardHeight);
            });
        });
    }

    createBeautifulCard(suit, rank, symbol, color, width, height) {
        const container = this.add.container(0, 0);
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillRoundedRect(0, 0, width, height, 8);
        graphics.lineStyle(1, 0xcccccc);
        graphics.strokeRoundedRect(0, 0, width, height, 8);
        container.add(graphics);
        const textStyle = { fontFamily: 'Arial, sans-serif', color: color, fontStyle: 'bold' };
        const topLeftRank = this.add.text(9, 6, rank, { ...textStyle, fontSize: '18px' });
        const topLeftSuit = this.add.text(9, 26, symbol, { ...textStyle, fontSize: '14px' });
        const bottomRightRank = this.add.text(width - 9, height - 6, rank, { ...textStyle, fontSize: '18px' }).setOrigin(1, 1).setRotation(Math.PI);
        const bottomRightSuit = this.add.text(width - 9, height - 26, symbol, { ...textStyle, fontSize: '14px' }).setOrigin(1, 1).setRotation(Math.PI);
        const centerSuit = this.add.text(width / 2, height / 2, symbol, { ...textStyle, fontSize: '48px' }).setOrigin(0.5);
        container.add([topLeftRank, topLeftSuit, bottomRightRank, bottomRightSuit, centerSuit]);
        const rt = this.add.renderTexture(0, 0, width, height).setVisible(false);
        rt.draw(container, 0, 0);
        rt.saveTexture(`card-${suit}-${rank}`);
        container.destroy();
        rt.destroy();
    }

    createUI() {
        const { width, height } = this.cameras.main;
        this.phaseText = this.add.text(width / 2, 30, '', { fontSize: '18px', fontFamily: 'Arial, sans-serif', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.potText = this.add.text(width / 2, height * 0.38, '', { fontSize: '16px', fontFamily: 'Arial, sans-serif', fill: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);
        this.winnerText = this.add.text(width / 2, height / 2 - 40, '', { fontSize: '24px', fontFamily: 'Arial, sans-serif', fill: '#ffeb3b', fontStyle: 'bold', align: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 20, y: 10 } }).setOrigin(0.5).setDepth(100).setVisible(false);
        this.communityCardsGroup = this.add.group();
        this.playerCardsGroup = this.add.group();
        this.createPlayerDisplays();
    }

    createPlayerDisplays() {
        const { width, height } = this.cameras.main;
        if (!this.pokerGame || !this.pokerGame.players) return;
        const positions = [
            { x: width / 2, y: height - 80, name: 'You' },
            { x: 70, y: height * 0.4, name: 'AI 1' },
            { x: width / 2, y: 80, name: 'AI 2' },
            { x: width - 70, y: height * 0.4, name: 'AI 3' }
        ];
        // Ensure we only create displays for players that exist in the game logic
        const playerCount = this.pokerGame.players.length;
        this.playerTexts = [];
        for (let i = 0; i < playerCount; i++) {
            const pos = positions[i];
            if (i > 0) {
                this.aiCardGroups[i] = this.add.group();
            }
            const text = this.add.text(pos.x, pos.y, '', { fontSize: '12px', fontFamily: 'Arial, sans-serif', fill: '#ffffff', align: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: { x: 5, y: 3 } }).setOrigin(0.5);
            this.playerTexts.push(text);
        }
    }
    
    createRaiseSlider() {
        const { width, height } = this.cameras.main;
        const sliderWidth = 150;
        const sliderHeight = 10;
        const sliderX = width / 2;
        const sliderY = height - 80;
        const track = this.add.rectangle(sliderX, sliderY, sliderWidth, sliderHeight, 0x000000, 0.5).setOrigin(0.5);
        const handle = this.add.circle(sliderX - sliderWidth / 2, sliderY, 8, 0xffffff).setInteractive({ draggable: true });
        this.raiseAmountText = this.add.text(sliderX, sliderY - 25, '', { fontSize: '14px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        handle.on('drag', (pointer, dragX) => {
            const newX = Phaser.Math.Clamp(dragX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
            handle.x = newX;
            const percentage = (newX - (sliderX - sliderWidth / 2)) / sliderWidth;
            const player = this.pokerGame.players[0];
            const minRaise = this.pokerGame.currentBet + this.pokerGame.bigBlind;
            const maxRaise = player.chips + player.currentBet;
            const raiseAmount = Math.floor(minRaise + percentage * (maxRaise - minRaise));
            this.raiseSlider.value = Phaser.Math.Clamp(raiseAmount, minRaise, maxRaise);
            this.raiseAmountText.setText(`Raise to $${this.raiseSlider.value}`);
        });
        this.raiseSlider = { track, handle, value: 0, setVisible: (visible) => {
            track.setVisible(visible);
            handle.setVisible(visible);
            this.raiseAmountText.setVisible(visible);
        }};
        this.raiseSlider.setVisible(false);
    }

    createActionButtons() {
        const { width, height } = this.cameras.main;
        const buttonY = height - 35;
        const buttonWidth = 65;
        const buttonHeight = 35;
        const spacing = 75;
        const actions = [
            { action: ACTIONS.FOLD, text: 'FOLD', color: 0xd32f2f, hoverColor: 0xf44336 },
            { action: ACTIONS.CHECK, text: 'CHECK', color: 0x1976d2, hoverColor: 0x2196f3 },
            { action: ACTIONS.CALL, text: 'CALL', color: 0x388e3c, hoverColor: 0x4caf50 },
            { action: ACTIONS.RAISE, text: 'RAISE', color: 0xf57c00, hoverColor: 0xff9800 }
        ];
        this.actionButtons = actions.map((actionData, index) => {
            const x = width / 2 - (actions.length - 1) * spacing / 2 + index * spacing;
            const shadow = this.add.rectangle(x + 2, buttonY + 2, buttonWidth, buttonHeight, 0x000000).setAlpha(0.3);
            const button = this.add.rectangle(x, buttonY, buttonWidth, buttonHeight, actionData.color).setStrokeStyle(1, 0xffffff, 0.5).setInteractive({ useHandCursor: true });
            const text = this.add.text(x, buttonY, actionData.text, { fontSize: '11px', fontFamily: 'Arial, sans-serif', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
            button.on('pointerover', () => { button.setFillStyle(actionData.hoverColor); this.tweens.add({ targets: [button, text], scale: 1.05, duration: 150 }); });
            button.on('pointerout', () => { button.setFillStyle(actionData.color); this.tweens.add({ targets: [button, text], scale: 1, duration: 150 }); });
            button.on('pointerdown', () => this.tweens.add({ targets: [button, text], scale: 0.95, duration: 100, onComplete: () => this.handlePlayerAction(actionData.action) }));
            button.on('pointerup', () => this.tweens.add({ targets: [button, text], scale: 1.05, duration: 100 }));
            return { button, text, shadow, action: actionData.action };
        });
    }

    handlePlayerAction(action) {
        if (this.pokerGame.activePlayerIndex !== 0) return;
        let amount = 0;
        if (action === ACTIONS.RAISE) {
            amount = this.raiseSlider.value;
        } else if (action === ACTIONS.CALL) {
            amount = this.pokerGame.getCallAmount();
        }
        this.pokerGame.playerAction(action, amount);
        this.updateGameDisplay();
        if (this.pokerGame.phase !== GAME_PHASES.SHOWDOWN && this.pokerGame.phase !== GAME_PHASES.GAME_OVER) {
            this.time.delayedCall(1000, () => this.handleAITurns());
        }
    }

    handleAITurns() {
        if (this.pokerGame.activePlayerIndex === 0 || this.pokerGame.phase === GAME_PHASES.SHOWDOWN || this.pokerGame.phase === GAME_PHASES.GAME_OVER) {
            this.updateGameDisplay();
            return;
        }
        const currentPlayerIndex = this.pokerGame.activePlayerIndex;
        const currentPlayer = this.pokerGame.getCurrentPlayer();
        const availableActions = this.pokerGame.getPlayerActions();
        const aiPlayer = this.aiPlayers[currentPlayerIndex];
        const gameState = { currentBet: this.pokerGame.currentBet, pot: this.pokerGame.pot, phase: this.pokerGame.phase, holeCards: currentPlayer.holeCards, communityCards: this.pokerGame.communityCards, availableActions: availableActions };
        const decision = aiPlayer.makeDecision(gameState, currentPlayer);
        this.showAIAction(currentPlayerIndex, decision.action, decision.amount);
        this.time.delayedCall(800, () => {
            this.pokerGame.playerAction(decision.action, decision.amount || 0);
            this.updateGameDisplay();
            this.time.delayedCall(1200, () => this.handleAITurns());
        });
    }
    
    showAIAction(playerIndex, action, amount) {
        if (!this.playerTexts[playerIndex]) return;
        const playerText = this.playerTexts[playerIndex];
        let actionText = action.charAt(0).toUpperCase() + action.slice(1);
        if ((action === ACTIONS.RAISE || action === ACTIONS.CALL || action === ACTIONS.BET) && amount > 0) {
            actionText += ` $${amount}`;
        }
        const display = this.add.text(playerText.x, playerText.y + 30, actionText, { fontSize: '12px', fill: '#00ff00', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: {x: 4, y: 2} }).setOrigin(0.5);
        this.actionDisplays.push(display);
        this.tweens.add({ targets: display, alpha: 0, duration: 2000, ease: 'Power2', onComplete: () => display.destroy() });
    }

    startNewHand() {
        this.winnerText.setVisible(false);
        this.actionDisplays.forEach(d => d.destroy());
        this.actionDisplays = [];
        this.aiCardGroups.forEach(group => group.clear(true, true));
        this.playerCardsGroup.clear(true, true);
        this.communityCardsGroup.clear(true, true);
        this.playerHandDealt = false; // FIX: Reset the deal flag for the new hand
        this.pokerGame.startNewHand();
        this.updateGameDisplay();
        if (this.pokerGame.activePlayerIndex !== 0) {
            this.time.delayedCall(1000, () => this.handleAITurns());
        }
    }

    updateGameDisplay() {
        if (!this.pokerGame || !this.pokerGame.players) return;
        this.phaseText.setText(this.getPhaseDisplayText());
        this.potText.setText(`Pot: $${this.pokerGame.pot}`);
        this.playerTexts.forEach((text, index) => {
            const player = this.pokerGame.players[index];
            if (!text || !player) return;
            const isActive = index === this.pokerGame.activePlayerIndex;
            let playerInfo = `${index === 0 ? 'You' : `AI ${index}`}${player.isDealer ? ' (D)' : ''}\n`;
            playerInfo += `Chips: $${player.chips}\n`;
            if (player.currentBet > 0) playerInfo += `Bet: $${player.currentBet}`;
            if (player.isFolded) playerInfo += '\n(Folded)';
            if (player.isAllIn) playerInfo += '\n(All-In)';
            text.setText(playerInfo);
            text.setFill(isActive ? '#ffff00' : '#ffffff');
            text.setAlpha(player.isFolded ? 0.5 : 1);
        });
        this.updateCommunityCards();
        this.updatePlayerCards();
        this.updateActionButtons();
        if (this.pokerGame.phase === GAME_PHASES.SHOWDOWN) {
            this.revealAllCards();
            this.displayWinner();
            this.time.delayedCall(5000, () => this.startNewHand());
        }
    }
    
    revealAllCards() {
        const { width, height } = this.cameras.main;
        const positions = [
            null,
            { x: 70, y: height * 0.4 + 50 },
            { x: width / 2, y: 80 + 50 },
            { x: width - 70, y: height * 0.4 + 50 }
        ];
        this.pokerGame.players.forEach((player, index) => {
            if (index > 0 && !player.isFolded && this.aiCardGroups[index] && this.aiCardGroups[index].countActive() === 0) {
                player.holeCards.forEach((card, cardIndex) => {
                    const x = positions[index].x - 20 + (cardIndex * 40);
                    const y = positions[index].y;
                    const cardSprite = this.add.image(x, y, `card-${card.suit}-${card.rank}`).setScale(0.5);
                    this.aiCardGroups[index].add(cardSprite);
                });
            }
        });
    }

    displayWinner() {
        const winnerInfo = this.pokerGame.winnerInfo;
        if (!winnerInfo || !winnerInfo.winners || winnerInfo.winners.length === 0) return;
        let winnerText = '';
        if (winnerInfo.winners.length > 1) {
            winnerText = `Split Pot! Each wins $${winnerInfo.winners[0].amountWon}`;
        } else {
            const winner = winnerInfo.winners[0];
            const winnerName = winner.index === 0 ? 'You' : `AI ${winner.index}`;
            winnerText = `${winnerName} wins $${winner.amountWon}\nwith a ${winner.hand.name}`;
        }
        this.winnerText.setText(winnerText).setVisible(true);
    }

    updateCommunityCards() {
        if (!this.pokerGame || !this.pokerGame.communityCards) return;
        const { width, height } = this.cameras.main;
        const cardScale = 0.85;
        const cardSpacing = 75; // Increased spacing
        const finalCardCount = 5;
        // FIX: Calculate positions based on a fixed 5-card layout, not the current number of cards.
        const layoutWidth = (finalCardCount - 1) * cardSpacing;
        const fixedStartX = width / 2 - layoutWidth / 2;
        const deckX = width - 50;
        const deckY = height / 2;
        const y = height * 0.48;

        this.pokerGame.communityCards.forEach((card, index) => {
            if (this.communityCardsGroup.children.entries.some(s => s.texture.key === `card-${card.suit}-${card.rank}`)) return;
            const x = fixedStartX + index * cardSpacing;
            const cardSprite = this.add.image(deckX, deckY, `card-${card.suit}-${card.rank}`).setScale(0).setInteractive({ useHandCursor: true });
            this.communityCardsGroup.add(cardSprite);
            this.tweens.add({ targets: cardSprite, x, y, scale: cardScale, duration: 500, ease: 'Cubic.easeOut', delay: index * 50 });
            cardSprite.on('pointerover', () => this.tweens.add({ targets: cardSprite, scale: cardScale * 1.1, y: y - 5, duration: 150 }));
            cardSprite.on('pointerout', () => this.tweens.add({ targets: cardSprite, scale: cardScale, y: y, duration: 150 }));
        });
    }

    updatePlayerCards() {
        // FIX: Use a flag to ensure cards are only dealt once per hand.
        if (!this.pokerGame || !this.pokerGame.players[0] || this.playerHandDealt) return;
        const player = this.pokerGame.players[0];
        if (!player.holeCards || player.holeCards.length !== 2) return;

        const { width, height } = this.cameras.main;
        const cardScale = 0.9;
        const deckX = width - 50;
        const deckY = height / 2;
        player.holeCards.forEach((card, index) => {
            const x = width / 2 - 40 + index * 80;
            const y = height - 140;
            const cardSprite = this.add.image(deckX, deckY, `card-${card.suit}-${card.rank}`).setScale(0).setInteractive({ useHandCursor: true });
            this.playerCardsGroup.add(cardSprite);
            this.tweens.add({ targets: cardSprite, x, y, scale: cardScale, duration: 500, ease: 'Cubic.easeOut', delay: index * 150 });
            cardSprite.on('pointerover', () => this.tweens.add({ targets: cardSprite, scale: cardScale * 1.05, y: y - 10, duration: 200, ease: 'Power2' }));
            cardSprite.on('pointerout', () => this.tweens.add({ targets: cardSprite, scale: cardScale, y: y, duration: 200, ease: 'Power2' }));
        });
        this.playerHandDealt = true; // Set flag to true after dealing.
    }

    updateActionButtons() {
        if (!this.pokerGame || !this.actionButtons) return;
        const isPlayerTurn = this.pokerGame.activePlayerIndex === 0;
        const isShowdown = this.pokerGame.phase === GAME_PHASES.SHOWDOWN;
        const availableActions = isPlayerTurn ? this.pokerGame.getPlayerActions() : [];
        this.actionButtons.forEach(buttonData => {
            let isAvailable = availableActions.includes(buttonData.action);
            if (buttonData.action === ACTIONS.CALL) {
                buttonData.text.setText(`CALL\n$${this.pokerGame.getCallAmount()}`);
            } else {
                buttonData.text.setText(actionData.text); // Reset other buttons
            }
            const isVisible = isPlayerTurn && isAvailable && !isShowdown;
            buttonData.button.setVisible(isVisible);
            buttonData.text.setVisible(isVisible);
            buttonData.shadow.setVisible(isVisible);
        });
        const canRaise = availableActions.includes(ACTIONS.RAISE);
        this.raiseSlider.setVisible(isPlayerTurn && canRaise && !isShowdown);
        if (isPlayerTurn && canRaise) {
            const player = this.pokerGame.players[0];
            const minRaise = this.pokerGame.getMinRaise();
            const maxRaise = player.chips + player.currentBet;
            this.raiseSlider.value = minRaise;
            this.raiseAmountText.setText(`Raise to $${minRaise}`);
            this.raiseSlider.handle.x = this.raiseSlider.track.x - this.raiseSlider.track.width / 2;
        }
    }

    getPhaseDisplayText() {
        const phaseTexts = {
            [GAME_PHASES.WAITING]: 'Waiting for players...',
            [GAME_PHASES.DEALING]: 'Dealing cards...',
            [GAME_PHASES.PREFLOP]: 'Pre-Flop Betting',
            [GAME_PHASES.FLOP]: 'The Flop',
            [GAME_PHASES.TURN]: 'The Turn',
            [GAME_PHASES.RIVER]: 'The River',
            [GAME_PHASES.SHOWDOWN]: 'Showdown!',
            [GAME_PHASES.GAME_OVER]: 'Game Over'
        };
        return phaseTexts[this.pokerGame.phase] || 'Unknown Phase';
    }
}
