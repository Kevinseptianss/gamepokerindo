// src/poker/PokerGame.js

import { HandEvaluator } from './HandEvaluator.js';

// Constants
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const GAME_PHASES = {
    WAITING: 'waiting',
    DEALING: 'dealing',
    PREFLOP: 'preflop',
    FLOP: 'flop',
    TURN: 'turn',
    RIVER: 'river',
    SHOWDOWN: 'showdown',
    GAME_OVER: 'game_over'
};

export const ACTIONS = {
    FOLD: 'fold',
    CALL: 'call',
    RAISE: 'raise',
    CHECK: 'check',
    BET: 'bet'
};

// Card Class
export class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getCardValue();
    }
    getCardValue() {
        if (this.rank === 'A') return 14;
        if (this.rank === 'K') return 13;
        if (this.rank === 'Q') return 12;
        if (this.rank === 'J') return 11;
        return parseInt(this.rank);
    }
    toString() { return `${this.rank} of ${this.suit}`; }
}

// Deck Class
export class Deck {
    constructor() { this.cards = []; this.reset(); }
    reset() {
        this.cards = [];
        for (const suit of SUITS) for (const rank of RANKS) this.cards.push(new Card(suit, rank));
        this.shuffle();
    }
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    deal() { return this.cards.pop(); }
}

// Player Class
export class Player {
    constructor(name, chips = 1000) {
        this.name = name;
        this.chips = chips;
        this.holeCards = [];
        this.currentBet = 0;
        this.hasActed = false; // Flag for betting round logic
        this.isFolded = false;
        this.isAllIn = false;
        this.isDealer = false;
        this.hand = null;
    }
    resetForNewHand() {
        this.holeCards = [];
        this.currentBet = 0;
        this.isFolded = false;
        this.isAllIn = false;
        this.hand = null;
        this.hasActed = false;
    }
    bet(amount) {
        const betAmount = Math.min(amount, this.chips);
        this.chips -= betAmount;
        this.currentBet += betAmount;
        if (this.chips === 0) this.isAllIn = true;
        return betAmount;
    }
    canAct() { return !this.isFolded && !this.isAllIn; }
}

// Main Poker Game Logic
export class PokerGame {
    constructor(playerCount = 4) {
        this.players = [];
        this.playerCount = playerCount;
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.phase = GAME_PHASES.WAITING;
        this.activePlayerIndex = 0;
        this.dealerIndex = -1;
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.lastRaiserIndex = -1;
        this.winnerInfo = null;
    }

    initGame() {
        for (let i = 0; i < this.playerCount; i++) {
            this.players.push(new Player(i === 0 ? 'You' : `AI ${i}`));
        }
        this.startNewHand();
    }

    startNewHand() {
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.winnerInfo = null;
        
        this.players.forEach(p => p.resetForNewHand());

        this.dealerIndex = (this.dealerIndex + 1) % this.playerCount;
        this.players.forEach((p, i) => p.isDealer = (i === this.dealerIndex));

        this.phase = GAME_PHASES.DEALING;
        this.postBlinds();
        this.dealHoleCards();
        
        this.activePlayerIndex = (this.dealerIndex + 3) % this.playerCount;
        this.lastRaiserIndex = (this.dealerIndex + 2) % this.playerCount; // Big blind is the initial "raiser"
        this.phase = GAME_PHASES.PREFLOP;
    }

    postBlinds() {
        const smallBlindIndex = (this.dealerIndex + 1) % this.playerCount;
        const bigBlindIndex = (this.dealerIndex + 2) % this.playerCount;
        
        this.pot += this.players[smallBlindIndex].bet(this.smallBlind);
        this.pot += this.players[bigBlindIndex].bet(this.bigBlind);
        
        this.currentBet = this.bigBlind;
    }

    dealHoleCards() {
        for (let i = 0; i < 2; i++) {
            for (const player of this.players) {
                if (!player.holeCards) player.holeCards = [];
                player.holeCards.push(this.deck.deal());
            }
        }
    }

    playerAction(action, amount = 0) {
        const player = this.getCurrentPlayer();
        console.log(`playerAction called - Player ${this.activePlayerIndex}, Action: ${action}, Amount: ${amount}`);
        
        if (!player || !player.canAct()) {
            console.log('Player cannot act, returning early');
            return;
        }

        player.hasActed = true;
        console.log(`Player ${this.activePlayerIndex} hasActed set to true`);

        switch (action) {
            case ACTIONS.FOLD:
                player.isFolded = true;
                console.log(`Player ${this.activePlayerIndex} folded`);
                break;
            case ACTIONS.CALL:
                this.pot += player.bet(this.currentBet - player.currentBet);
                console.log(`Player ${this.activePlayerIndex} called, pot now: ${this.pot}`);
                break;
            case ACTIONS.RAISE:
            case ACTIONS.BET:
                const betAmount = amount - player.currentBet;
                this.pot += player.bet(betAmount);
                this.currentBet = player.currentBet;
                this.lastRaiserIndex = this.activePlayerIndex;
                this.players.forEach((p, i) => { if (i !== this.activePlayerIndex && p.canAct()) p.hasActed = false; });
                console.log(`Player ${this.activePlayerIndex} bet/raised to ${this.currentBet}, pot now: ${this.pot}`);
                break;
            case ACTIONS.CHECK:
                console.log(`Player ${this.activePlayerIndex} checked`);
                break;
        }

        if (this.getActivePlayers(false).length <= 1) {
            console.log('Only 1 or fewer active players, determining winner');
            this.determineWinner();
            return;
        }
        
        console.log('Advancing to next player');
        this.advanceToNextPlayer();
    }

    advanceToNextPlayer() {
        console.log(`advanceToNextPlayer called - current active: ${this.activePlayerIndex}`);
        
        if (this.isBettingRoundComplete()) {
            console.log('Betting round complete, moving to next phase');
            this.nextPhase();
            return;
        }

        let nextPlayerIndex = (this.activePlayerIndex + 1) % this.playerCount;
        console.log(`Looking for next player starting from index: ${nextPlayerIndex}`);
        
        let attempts = 0;
        while (!this.players[nextPlayerIndex].canAct() && attempts < this.playerCount) {
            console.log(`Player ${nextPlayerIndex} cannot act - folded: ${this.players[nextPlayerIndex].isFolded}, allIn: ${this.players[nextPlayerIndex].isAllIn}`);
            nextPlayerIndex = (nextPlayerIndex + 1) % this.playerCount;
            attempts++;
        }
        
        if (attempts >= this.playerCount) {
            console.log('No valid next player found, forcing next phase');
            this.nextPhase();
            return;
        }
        
        console.log(`Setting active player to: ${nextPlayerIndex}`);
        this.activePlayerIndex = nextPlayerIndex;
    }

    isBettingRoundComplete() {
        const activePlayers = this.getActivePlayers(true);
        console.log(`Checking if betting round complete - Active players: ${activePlayers.length}`);
        
        if (activePlayers.length <= 1) {
            console.log('Betting round complete - only 1 or fewer active players');
            return true;
        }
        
        // Get players who can still act (not folded, not all-in)
        const playersWhoCanAct = this.getActivePlayers(false);
        console.log(`Players who can act: ${playersWhoCanAct.length}`);
        
        if (playersWhoCanAct.length <= 1) {
            console.log('Betting round complete - only 1 or fewer players can act');
            return true;
        }
        
        // Check if all active players have acted and matched the current bet
        const allPlayersActed = activePlayers.every(p => {
            const hasActedCorrectly = p.isFolded || p.isAllIn || (p.currentBet === this.currentBet && p.hasActed);
            console.log(`Player ${this.players.indexOf(p)} - folded: ${p.isFolded}, allIn: ${p.isAllIn}, currentBet: ${p.currentBet}, hasActed: ${p.hasActed}, betMatches: ${p.currentBet === this.currentBet}`);
            return hasActedCorrectly;
        });
        
        console.log(`All players acted correctly: ${allPlayersActed}`);
        return allPlayersActed;
    }
    
    nextPhase() {
        this.pot += this.players.reduce((acc, p) => {
            const bet = p.currentBet;
            p.currentBet = 0;
            return acc + bet;
        }, 0);
        
        this.currentBet = 0;
        this.players.forEach(p => p.hasActed = false);

        let firstActorIndex = (this.dealerIndex + 1) % this.playerCount;
        while(!this.players[firstActorIndex].canAct()) {
            firstActorIndex = (firstActorIndex + 1) % this.playerCount;
        }
        this.activePlayerIndex = firstActorIndex;
        this.lastRaiserIndex = -1;

        switch (this.phase) {
            case GAME_PHASES.PREFLOP:
                this.phase = GAME_PHASES.FLOP;
                this.deck.deal();
                this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
                break;
            case GAME_PHASES.FLOP:
                this.phase = GAME_PHASES.TURN;
                this.deck.deal();
                this.communityCards.push(this.deck.deal());
                break;
            case GAME_PHASES.TURN:
                this.phase = GAME_PHASES.RIVER;
                this.deck.deal();
                this.communityCards.push(this.deck.deal());
                break;
            case GAME_PHASES.RIVER:
                this.determineWinner();
                return;
        }

        if (this.getActivePlayers(false).length <= 1) {
             this.determineWinner();
        }
    }

    determineWinner() {
        this.phase = GAME_PHASES.SHOWDOWN;
        this.pot += this.players.reduce((acc, p) => {
            const bet = p.currentBet;
            p.currentBet = 0;
            return acc + bet;
        }, 0);

        const contenders = this.getActivePlayers(true);

        if (contenders.length === 1) {
            const winner = contenders[0];
            // FIX: Evaluate hand even if only one player is left, to prevent "Unknown Hand" error.
            winner.hand = HandEvaluator.evaluateHand(winner.holeCards, this.communityCards);
            this.winnerInfo = { winners: [{...winner, amountWon: this.pot, index: this.players.indexOf(winner)}] };
            this.players[this.winnerInfo.winners[0].index].chips += this.pot;
            return;
        }

        let bestHands = [];
        for (const player of contenders) {
            player.hand = HandEvaluator.evaluateHand(player.holeCards, this.communityCards);
            bestHands.push({ ...player, index: this.players.indexOf(player) });
        }

        bestHands.sort((a, b) => {
            if (a.hand.rank !== b.hand.rank) return b.hand.rank - a.hand.rank;
            return b.hand.value - a.hand.value;
        });

        const winningRank = bestHands[0].hand.rank;
        const winningValue = bestHands[0].hand.value;
        const winners = bestHands.filter(p => p.hand.rank === winningRank && p.hand.value === winningValue);
        
        const amountWon = this.pot / winners.length;
        winners.forEach(winner => {
            this.players[winner.index].chips += amountWon;
            winner.amountWon = amountWon;
        });
        
        this.winnerInfo = { winners };
    }

    getActivePlayers(includeAllIn = true) {
        if (includeAllIn) return this.players.filter(p => !p.isFolded);
        return this.players.filter(p => p.canAct());
    }

    getCurrentPlayer() { return this.players[this.activePlayerIndex]; }
    getCallAmount() { return this.currentBet - this.getCurrentPlayer().currentBet; }
    getMinRaise() { return this.currentBet + this.bigBlind; }

    getPlayerActions() {
        const player = this.getCurrentPlayer();
        const actions = [];
        if (!player || !player.canAct()) return actions;

        if (this.currentBet > player.currentBet) {
            actions.push(ACTIONS.CALL);
            if (player.chips > this.getCallAmount()) {
                actions.push(ACTIONS.RAISE);
            }
        } else {
            actions.push(ACTIONS.CHECK);
            actions.push(ACTIONS.BET);
        }
        actions.push(ACTIONS.FOLD);
        return actions;
    }
}
