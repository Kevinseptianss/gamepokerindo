// Poker game constants and utilities
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
    ALL_IN: 'all_in'
};

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

    toString() {
        return `${this.rank} of ${this.suit}`;
    }
}

export class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (let suit of SUITS) {
            for (let rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}

export class Player {
    constructor(name, chips = 1000, isDealer = false) {
        this.name = name;
        this.chips = chips;
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBet = 0;
        this.isFolded = false;
        this.isAllIn = false;
        this.isDealer = isDealer;
        this.position = 0;
    }

    reset() {
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBet = 0;
        this.isFolded = false;
        this.isAllIn = false;
    }

    bet(amount) {
        const betAmount = Math.min(amount, this.chips);
        this.chips -= betAmount;
        this.currentBet += betAmount;
        this.totalBet += betAmount;
        if (this.chips === 0) {
            this.isAllIn = true;
        }
        return betAmount;
    }

    canAct() {
        return !this.isFolded && !this.isAllIn;
    }
}

export class PokerGame {
    constructor() {
        this.players = [];
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.phase = GAME_PHASES.WAITING;
        this.activePlayerIndex = 0;
        this.dealerIndex = 0;
        this.smallBlind = 5;
        this.bigBlind = 10;
        this.round = 0;
    }

    initGame() {
        // Initialize with player and 3 AI opponents
        this.players = [
            new Player('You', 1000),
            new Player('AI Player 1', 1000),
            new Player('AI Player 2', 1000),
            new Player('AI Player 3', 1000)
        ];
        this.players[this.dealerIndex].isDealer = true;
        this.startNewHand();
    }

    startNewHand() {
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.phase = GAME_PHASES.DEALING;
        this.round++;

        // Reset players
        this.players.forEach(player => player.reset());

        // Post blinds
        this.postBlinds();
        
        // Deal hole cards
        this.dealHoleCards();
        
        // Set active player (after big blind)
        this.activePlayerIndex = (this.dealerIndex + 3) % this.players.length;
        this.phase = GAME_PHASES.PREFLOP;
    }

    postBlinds() {
        const smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
        const bigBlindIndex = (this.dealerIndex + 2) % this.players.length;
        
        const smallBlindAmount = this.players[smallBlindIndex].bet(this.smallBlind);
        const bigBlindAmount = this.players[bigBlindIndex].bet(this.bigBlind);
        
        this.pot += smallBlindAmount + bigBlindAmount;
        this.currentBet = this.bigBlind;
    }

    dealHoleCards() {
        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            this.players.forEach(player => {
                player.holeCards.push(this.deck.deal());
            });
        }
    }

    dealCommunityCards() {
        switch (this.phase) {
            case GAME_PHASES.PREFLOP:
                // Burn one card, then deal 3 (the flop)
                this.deck.deal(); // burn
                for (let i = 0; i < 3; i++) {
                    this.communityCards.push(this.deck.deal());
                }
                this.phase = GAME_PHASES.FLOP;
                break;
            case GAME_PHASES.FLOP:
                // Burn one card, then deal 1 (the turn)
                this.deck.deal(); // burn
                this.communityCards.push(this.deck.deal());
                this.phase = GAME_PHASES.TURN;
                break;
            case GAME_PHASES.TURN:
                // Burn one card, then deal 1 (the river)
                this.deck.deal(); // burn
                this.communityCards.push(this.deck.deal());
                this.phase = GAME_PHASES.RIVER;
                break;
        }
        
        // Reset betting round
        this.currentBet = 0;
        this.players.forEach(player => {
            if (!player.isFolded && !player.isAllIn) {
                player.currentBet = 0;
            }
        });
        
        // Find first active player after dealer
        this.activePlayerIndex = (this.dealerIndex + 1) % this.players.length;
        
        // Find first player who can act
        let attempts = 0;
        while (!this.players[this.activePlayerIndex].canAct() && this.getActivePlayers().length > 1 && attempts < 4) {
            this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
            attempts++;
        }
    }

    playerAction(action, amount = 0) {
        const player = this.players[this.activePlayerIndex];
        
        switch (action) {
            case ACTIONS.FOLD:
                player.isFolded = true;
                break;
            case ACTIONS.CALL:
                const callAmount = this.currentBet - player.currentBet;
                const actualCall = player.bet(callAmount);
                this.pot += actualCall;
                break;
            case ACTIONS.RAISE:
                const totalRaise = this.currentBet + amount - player.currentBet;
                const actualRaise = player.bet(totalRaise);
                this.pot += actualRaise;
                this.currentBet = player.currentBet;
                break;
            case ACTIONS.CHECK:
                // No action needed for check
                break;
            case ACTIONS.ALL_IN:
                const allInAmount = player.bet(player.chips);
                this.pot += allInAmount;
                if (player.currentBet > this.currentBet) {
                    this.currentBet = player.currentBet;
                }
                break;
        }

        this.nextPlayer();
    }

    nextPlayer() {
        let attempts = 0;
        do {
            this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
            attempts++;
            if (attempts > 4) break; // Prevent infinite loop
        } while (!this.players[this.activePlayerIndex].canAct() && this.getActivePlayers().length > 1);

        // Check if betting round is complete
        if (this.isBettingRoundComplete()) {
            this.nextPhase();
        }
    }

    isBettingRoundComplete() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length <= 1) return true;

        // Check if all active players have either folded, called, or are all-in
        const allPlayersActed = activePlayers.every(player => 
            player.isFolded || 
            player.isAllIn || 
            player.currentBet === this.currentBet
        );

        return allPlayersActed;
    }

    nextPhase() {
        const activePlayers = this.getActivePlayers();
        
        if (activePlayers.length <= 1) {
            this.phase = GAME_PHASES.SHOWDOWN;
            return;
        }

        switch (this.phase) {
            case GAME_PHASES.PREFLOP:
                this.dealCommunityCards(); // This will set phase to FLOP
                break;
            case GAME_PHASES.FLOP:
                this.dealCommunityCards(); // This will set phase to TURN
                break;
            case GAME_PHASES.TURN:
                this.dealCommunityCards(); // This will set phase to RIVER
                break;
            case GAME_PHASES.RIVER:
                this.phase = GAME_PHASES.SHOWDOWN;
                break;
        }
    }

    getActivePlayers() {
        return this.players.filter(player => !player.isFolded);
    }

    getCurrentPlayer() {
        return this.players[this.activePlayerIndex];
    }

    getPlayerActions() {
        const player = this.getCurrentPlayer();
        const actions = [];

        if (player.currentBet < this.currentBet) {
            actions.push(ACTIONS.CALL);
            actions.push(ACTIONS.RAISE);
        } else {
            actions.push(ACTIONS.CHECK);
            actions.push(ACTIONS.RAISE);
        }
        
        actions.push(ACTIONS.FOLD);
        
        if (player.chips > 0) {
            actions.push(ACTIONS.ALL_IN);
        }

        return actions;
    }
}
