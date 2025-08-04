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
        this.chipDisplays = {};

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
            null, // Human player
            AI_PERSONALITIES.TIGHT_AGGRESSIVE,
            AI_PERSONALITIES.LOOSE_PASSIVE,
            AI_PERSONALITIES.LOOSE_AGGRESSIVE
        ];
    }

    preload() { this.createCardGraphics(); }

    create() {
        const { width, height } = this.cameras.main;
        this.createPokerTable(width, height);
        this.pokerGame = new PokerGame(4);
        this.pokerGame.initGame();
        this.createUI();
        this.createActionButtons();
        this.createRaiseSlider();
        this.updateGameDisplay();
        if (this.pokerGame.activePlayerIndex !== 0) {
            this.time.delayedCall(1500, () => this.handleAITurns());
        }
    }

    createPokerTable(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x0d4d3c);
        const tableGraphics = this.add.graphics();
        tableGraphics.fillStyle(0x000000, 0.3).fillEllipse(width / 2 + 5, height / 2 + 5, width * 0.85, height * 0.6);
        tableGraphics.fillStyle(0x1b5e20).fillEllipse(width / 2, height / 2, width * 0.85, height * 0.6);
        tableGraphics.lineStyle(4, 0x2e7d32).strokeEllipse(width / 2, height / 2, width * 0.85, height * 0.6);
        tableGraphics.lineStyle(1, 0x388e3c).strokeEllipse(width / 2, height / 2, width * 0.8, height * 0.55);
        const cardAreaWidth = 380;
        const cardAreaHeight = 90;
        tableGraphics.fillStyle(0x2e7d32).fillRoundedRect(width / 2 - cardAreaWidth / 2, height / 2 - cardAreaHeight / 2, cardAreaWidth, cardAreaHeight, 10);
        tableGraphics.lineStyle(2, 0x4caf50).strokeRoundedRect(width / 2 - cardAreaWidth / 2, height / 2 - cardAreaHeight / 2, cardAreaWidth, cardAreaHeight, 10);
    }

    createCardGraphics() {
        const cardWidth = 70, cardHeight = 98;
        const backGraphics = this.add.graphics();
        backGraphics.fillStyle(0x0d47a1).fillRoundedRect(0, 0, cardWidth, cardHeight, 8);
        backGraphics.lineStyle(3, 0x1976d2).strokeRoundedRect(1.5, 1.5, cardWidth - 3, cardHeight - 3, 7);
        backGraphics.generateTexture('card-back', cardWidth, cardHeight);
        backGraphics.destroy();
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'], suitSymbols = ['♥', '♦', '♣', '♠'], suitColors = ['#e53935', '#e53935', '#212121', '#212121'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        suits.forEach((suit, suitIndex) => ranks.forEach(rank => this.createBeautifulCard(suit, rank, suitSymbols[suitIndex], suitColors[suitIndex], cardWidth, cardHeight)));
    }

    createBeautifulCard(suit, rank, symbol, color, width, height) {
        const container = this.add.container(0, 0);
        const graphics = this.add.graphics().fillStyle(0xffffff).fillRoundedRect(0, 0, width, height, 8).lineStyle(1, 0xcccccc).strokeRoundedRect(0, 0, width, height, 8);
        container.add(graphics);
        const textStyle = { fontFamily: 'Arial, sans-serif', color: color, fontStyle: 'bold' };
        container.add([
            this.add.text(9, 6, rank, { ...textStyle, fontSize: '18px' }),
            this.add.text(9, 26, symbol, { ...textStyle, fontSize: '14px' }),
            this.add.text(width - 9, height - 6, rank, { ...textStyle, fontSize: '18px' }).setOrigin(1, 1).setRotation(Math.PI),
            this.add.text(width - 9, height - 26, symbol, { ...textStyle, fontSize: '14px' }).setOrigin(1, 1).setRotation(Math.PI),
            this.add.text(width / 2, height / 2, symbol, { ...textStyle, fontSize: '48px' }).setOrigin(0.5)
        ]);
        const rt = this.add.renderTexture(0, 0, width, height).setVisible(false);
        rt.draw(container, 0, 0).saveTexture(`card-${suit}-${rank}`);
        container.destroy(); rt.destroy();
    }

    createUI() {
        const { width, height } = this.cameras.main;
        this.phaseText = this.add.text(width / 2, 30, '', { fontSize: '18px', fontFamily: 'Arial', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.potText = this.add.text(width / 2, height * 0.38, '', { fontSize: '16px', fontFamily: 'Arial', fill: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);
        this.winnerText = this.add.text(width / 2, height / 2, '', { fontSize: '24px', fontFamily: 'Arial', fill: '#ffeb3b', fontStyle: 'bold', align: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 20, y: 10 }, lineSpacing: 8 }).setOrigin(0.5).setDepth(100).setVisible(false);
        this.communityCardsGroup = this.add.group();
        this.playerCardsGroup = this.add.group();
        this.createPlayerDisplays();
    }

    createPlayerDisplays() {
        const { width, height } = this.cameras.main;
        // FIX: Adjusted Y-positions for better layout
        const positions = [
            { x: width / 2, y: height - 250 }, // Player info box
            { x: 70, y: height * 0.4 },      // AI 1
            { x: width / 2, y: 65 },         // AI 2
            { x: width - 70, y: height * 0.4 }  // AI 3
        ];
        this.playerTexts = this.pokerGame.players.map((player, i) => {
            if (i > 0) this.aiCardGroups[i] = this.add.group();
            this.chipDisplays[i] = this.add.text(positions[i].x, positions[i].y + 20, '', { fontSize: '12px', fill: '#fff', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.4)', padding: {x:5,y:2} }).setOrigin(0.5).setDepth(5);
            return this.add.text(positions[i].x, positions[i].y, '', { fontSize: '14px', fill: '#fff', align: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 8, y: 4 } }).setOrigin(0.5);
        });
    }
    
    createRaiseSlider() {
        const { width, height } = this.cameras.main;
        const sliderX = width / 2, sliderY = height - 85, sliderWidth = 150;
        const track = this.add.rectangle(sliderX, sliderY, sliderWidth, 10, 0x000000, 0.5).setOrigin(0.5);
        const handle = this.add.circle(sliderX - sliderWidth / 2, sliderY, 8, 0xffffff).setInteractive({ draggable: true });
        this.raiseAmountText = this.add.text(sliderX, sliderY - 25, '', { fontSize: '14px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        handle.on('drag', (p, dragX) => {
            handle.x = Phaser.Math.Clamp(dragX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
            const percentage = (handle.x - (sliderX - sliderWidth / 2)) / sliderWidth;
            const player = this.pokerGame.players[0];
            const minRaise = this.pokerGame.getMinRaise();
            const maxRaise = player.chips + player.currentBet;
            const raiseAmount = Math.floor(minRaise + percentage * (maxRaise - minRaise));
            this.raiseSlider.value = Phaser.Math.Clamp(raiseAmount, minRaise, maxRaise);
            this.raiseAmountText.setText(`Raise to $${this.raiseSlider.value}`);
        });
        this.raiseSlider = { track, handle, value: 0, setVisible: (v) => { track.setVisible(v); handle.setVisible(v); this.raiseAmountText.setVisible(v); }};
        this.raiseSlider.setVisible(false);
    }

    createActionButtons() {
        const { width, height } = this.cameras.main;
        const buttonY = height - 45;
        const actions = [
            { action: ACTIONS.FOLD, text: 'FOLD', color: 0xd32f2f },
            { action: ACTIONS.CALL, text: 'CALL', color: 0x388e3c },
            { action: ACTIONS.RAISE, text: 'RAISE', color: 0xf57c00 },
            { action: ACTIONS.CHECK, text: 'CHECK', color: 0x1976d2 },
            { action: ACTIONS.BET, text: 'BET', color: 0xf57c00 }
        ];
        this.actionButtons = actions.map(actionData => {
            const button = this.add.rectangle(0, buttonY, 70, 40, actionData.color).setStrokeStyle(2, 0xffffff, 0.7).setInteractive({ useHandCursor: true });
            const text = this.add.text(0, buttonY, actionData.text, { fontSize: '12px', fill: '#fff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
            button.on('pointerover', () => button.setAlpha(0.8));
            button.on('pointerout', () => button.setAlpha(1));
            button.on('pointerdown', () => this.tweens.add({ targets: [button, text], scale: 0.9, duration: 100, yoyo: true, onComplete: () => this.handlePlayerAction(actionData.action) }));
            return { ...actionData, button, text, originalText: actionData.text };
        });
    }

    handlePlayerAction(action) {
        if (this.pokerGame.activePlayerIndex !== 0) return;
        let amount = 0;
        if (action === ACTIONS.RAISE || action === ACTIONS.BET) {
            amount = this.raiseSlider.value;
        } else if (action === ACTIONS.CALL) {
            amount = this.pokerGame.getCallAmount();
        }
        this.animateBet(0, amount);
        this.pokerGame.playerAction(action, amount);
        this.updateGameDisplay();
        if (this.pokerGame.phase < GAME_PHASES.SHOWDOWN) {
            this.time.delayedCall(500, () => this.handleAITurns());
        }
    }

    handleAITurns() {
        if (this.pokerGame.activePlayerIndex === 0 || this.pokerGame.phase >= GAME_PHASES.SHOWDOWN) {
            this.updateGameDisplay();
            return;
        }
        const index = this.pokerGame.activePlayerIndex;
        const player = this.pokerGame.getCurrentPlayer();
        const gameState = { currentBet: this.pokerGame.currentBet, pot: this.pokerGame.pot, phase: this.pokerGame.phase, holeCards: player.holeCards, communityCards: this.pokerGame.communityCards, availableActions: this.pokerGame.getPlayerActions() };
        const decision = this.aiPlayers[index].makeDecision(gameState, player);
        this.showAIAction(index, decision.action, decision.amount);
        this.time.delayedCall(800, () => {
            if (decision.action === ACTIONS.CALL) decision.amount = this.pokerGame.getCallAmount();
            this.animateBet(index, decision.amount);
            this.pokerGame.playerAction(decision.action, decision.amount || 0);
            this.updateGameDisplay();
            this.time.delayedCall(1200, () => this.handleAITurns());
        });
    }
    
    showAIAction(playerIndex, action, amount) {
        const playerText = this.playerTexts[playerIndex];
        let actionText = action.charAt(0).toUpperCase() + action.slice(1);
        if ((action === ACTIONS.RAISE || action === ACTIONS.CALL || action === ACTIONS.BET) && amount > 0) actionText += ` $${amount}`;
        const display = this.add.text(playerText.x, playerText.y + 45, actionText, { fontSize: '12px', fill: '#0f0', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: {x: 4, y: 2} }).setOrigin(0.5).setDepth(10);
        this.tweens.add({ targets: display, alpha: 0, y: '+=10', duration: 2000, ease: 'Power2', onComplete: () => display.destroy() });
    }

    animateBet(playerIndex, amount) {
        if (amount <= 0) return;
        const { width, height } = this.cameras.main;
        const playerDisplay = this.playerTexts[playerIndex];
        const chip = this.add.text(playerDisplay.x, playerDisplay.y, `$${amount}`, { fontSize: '14px', fill: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: chip, x: width / 2, y: height * 0.4, alpha: 0.5, duration: 500, ease: 'Cubic.easeIn', onComplete: () => chip.destroy() });
    }

    startNewHand() {
        this.winnerText.setVisible(false);
        this.aiCardGroups.forEach(g => g.clear(true, true));
        this.playerCardsGroup.clear(true, true);
        this.communityCardsGroup.clear(true, true);
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
            const isActive = index === this.pokerGame.activePlayerIndex && this.pokerGame.phase < GAME_PHASES.SHOWDOWN;
            text.setText(`${player.isDealer ? '(D) ' : ''}${player.name}`);
            this.chipDisplays[index].setText(`$${player.chips}`);
            text.setAlpha(player.isFolded ? 0.5 : 1);
            this.chipDisplays[index].setAlpha(player.isFolded ? 0.5 : 1);
            if (isActive) {
                text.setFill('#ffff00');
                this.tweens.add({ targets: text, scale: 1.1, duration: 300, yoyo: true, repeat: -1 });
            } else {
                text.setFill('#ffffff');
                this.tweens.killTweensOf(text);
                text.setScale(1);
            }
        });
        this.updateCommunityCards();
        this.updatePlayerCards();
        this.updateActionButtons();
        if (this.pokerGame.phase === GAME_PHASES.SHOWDOWN) {
            this.revealAllCards();
            this.displayWinner();
            this.time.delayedCall(6000, () => this.startNewHand());
        }
    }
    
    revealAllCards() {
        const { width, height } = this.cameras.main;
        // FIX: Adjusted Y positions to prevent overlap
        const positions = [ 
            null, 
            { x: 70, y: height * 0.4 + 60 }, 
            { x: width / 2, y: 65 + 60 }, 
            { x: width - 70, y: height * 0.4 + 60 } 
        ];
        this.pokerGame.players.forEach((player, index) => {
            if (index > 0 && !player.isFolded && this.aiCardGroups[index] && this.aiCardGroups[index].countActive() === 0) {
                player.holeCards.forEach((card, cardIndex) => {
                    const x = positions[index].x - 20 + (cardIndex * 40), y = positions[index].y;
                    const cardSprite = this.add.image(x, y, `card-${card.suit}-${card.rank}`).setScale(0.5);
                    this.aiCardGroups[index].add(cardSprite);
                });
            }
        });
    }

    displayWinner() {
        const { winnerInfo } = this.pokerGame;
        if (!winnerInfo || !winnerInfo.winners || winnerInfo.winners.length === 0) return;
        const winner = winnerInfo.winners[0];
        const winnerName = winner.index === 0 ? 'You' : `AI ${winner.index}`;
        const winnerText = `${winnerName} wins $${Math.floor(winner.amountWon)}\nwith a ${winner.hand.name}`;
        this.winnerText.setText(winnerText).setVisible(true);
        const allWinningCards = new Set(winner.hand.cards.map(c => `${c.rank}-${c.suit}`));
        this.communityCardsGroup.children.each(c => {
            const cardKey = c.texture.key.replace('card-', '').replace(/-/g, '-');
            if (allWinningCards.has(cardKey)) c.setTint(0xffff00); else c.clearTint();
        });
         this.playerCardsGroup.children.each(c => {
            const cardKey = c.texture.key.replace('card-', '').replace(/-/g, '-');
            if (allWinningCards.has(cardKey)) c.setTint(0xffff00); else c.clearTint();
        });
    }

    updateCommunityCards() {
        if (!this.pokerGame || !this.pokerGame.communityCards) return;
        const { width, height } = this.cameras.main;
        const cardScale = 0.85, cardSpacing = 75, finalCardCount = 5;
        const layoutWidth = (finalCardCount - 1) * cardSpacing;
        const fixedStartX = width / 2 - layoutWidth / 2;
        const deckX = width / 2, deckY = height / 2 - 100;
        const y = height * 0.48;
        this.pokerGame.communityCards.forEach((card, index) => {
            if (this.communityCardsGroup.children.entries.some(s => s.texture.key === `card-${card.suit}-${card.rank}`)) return;
            const x = fixedStartX + index * cardSpacing;
            const cardSprite = this.add.image(deckX, deckY, 'card-back').setScale(cardScale);
            this.communityCardsGroup.add(cardSprite);
            this.tweens.add({ targets: cardSprite, x, y, duration: 500, ease: 'Cubic.easeOut', delay: 100 * index, onComplete: () => {
                cardSprite.setTexture(`card-${card.suit}-${card.rank}`);
            }});
        });
    }

    updatePlayerCards() {
        // FIX: Replace flag with a check on the group's children to prevent re-dealing
        if (!this.pokerGame || !this.pokerGame.players[0] || this.playerCardsGroup.countActive() > 0) return;
        
        const player = this.pokerGame.players[0];
        if (!player.holeCards || player.holeCards.length !== 2) return;
        
        const { width, height } = this.cameras.main;
        const cardScale = 0.9, deckX = width / 2, deckY = height / 2 - 100;
        
        player.holeCards.forEach((card, index) => {
            // FIX: Adjusted Y-position to be below the info box
            const x = width / 2 - 40 + index * 50, y = height - 170;
            const cardSprite = this.add.image(deckX, deckY, 'card-back').setScale(cardScale);
            this.playerCardsGroup.add(cardSprite);
            this.tweens.add({ targets: cardSprite, x, y, duration: 500, ease: 'Cubic.easeOut', delay: 150 * index, onComplete: () => {
                cardSprite.setTexture(`card-${card.suit}-${card.rank}`);
            }});
        });
    }

    updateActionButtons() {
        if (!this.pokerGame || !this.actionButtons) return;
        const isPlayerTurn = this.pokerGame.activePlayerIndex === 0;
        const isShowdown = this.pokerGame.phase >= GAME_PHASES.SHOWDOWN;
        const availableActions = isPlayerTurn ? this.pokerGame.getPlayerActions() : [];
        
        let visibleButtons = [];
        this.actionButtons.forEach(buttonData => {
            const isVisible = isPlayerTurn && availableActions.includes(buttonData.action) && !isShowdown;
            buttonData.button.setVisible(isVisible);
            buttonData.text.setVisible(isVisible);
            if(isVisible) visibleButtons.push(buttonData);
            if (isVisible && buttonData.action === ACTIONS.CALL) {
                buttonData.text.setText(`CALL\n$${this.pokerGame.getCallAmount()}`);
            } else {
                buttonData.text.setText(buttonData.originalText);
            }
        });

        const spacing = 80;
        const totalWidth = (visibleButtons.length - 1) * spacing;
        const startX = this.cameras.main.width / 2 - totalWidth / 2;
        visibleButtons.forEach((btn, index) => {
            const x = startX + index * spacing;
            btn.button.x = x;
            btn.text.x = x;
        });

        const canRaise = availableActions.includes(ACTIONS.RAISE) || availableActions.includes(ACTIONS.BET);
        this.raiseSlider.setVisible(isPlayerTurn && canRaise && !isShowdown);
        if (isPlayerTurn && canRaise) {
            const player = this.pokerGame.players[0];
            const minRaise = this.pokerGame.getMinRaise();
            const maxRaise = player.chips + player.currentBet;
            this.raiseSlider.value = minRaise;
            this.raiseAmountText.setText(`Bet/Raise to $${minRaise}`);
            this.raiseSlider.handle.x = this.raiseSlider.track.x - this.raiseSlider.track.width / 2;
        }
    }

    getPhaseDisplayText() {
        const phaseMap = { [GAME_PHASES.PREFLOP]: 'Pre-Flop Betting', [GAME_PHASES.FLOP]: 'The Flop', [GAME_PHASES.TURN]: 'The Turn', [GAME_PHASES.RIVER]: 'The River', [GAME_PHASES.SHOWDOWN]: 'Showdown!', [GAME_PHASES.DEALING]: 'Dealing...' };
        return phaseMap[this.pokerGame.phase] || '';
    }
}
