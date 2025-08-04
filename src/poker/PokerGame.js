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
        this.lastRaiser = null;
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
        this.lastRaiser = null;
        
        this.players.forEach(p => p.resetForNewHand());

        this.dealerIndex = (this.dealerIndex + 1) % this.playerCount;
        this.players.forEach((p, i) => p.isDealer = (i === this.dealerIndex));

        this.phase = GAME_PHASES.DEALING;
        this.postBlinds();
        this.dealHoleCards();
        
        this.activePlayerIndex = (this.dealerIndex + 3) % this.playerCount;
        this.phase = GAME_PHASES.PREFLOP;
    }

    postBlinds() {
        const smallBlindIndex = (this.dealerIndex + 1) % this.playerCount;
        const bigBlindIndex = (this.dealerIndex + 2) % this.playerCount;
        
        const sbAmount = this.players[smallBlindIndex].bet(this.smallBlind);
        this.pot += sbAmount;
        
        const bbAmount = this.players[bigBlindIndex].bet(this.bigBlind);
        this.pot += bbAmount;

        this.currentBet = this.bigBlind;
        this.lastRaiser = this.players[bigBlindIndex];
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
        if (!player || !player.canAct()) return;

        switch (action) {
            case ACTIONS.FOLD:
                player.isFolded = true;
                break;
            case ACTIONS.CALL:
                const callAmount = this.currentBet - player.currentBet;
                this.pot += player.bet(callAmount);
                break;
            case ACTIONS.RAISE:
                const raiseAmount = amount - player.currentBet;
                this.pot += player.bet(raiseAmount);
                this.currentBet = player.currentBet;
                this.lastRaiser = player;
                break;
             case ACTIONS.BET: // For when there is no current bet
                this.pot += player.bet(amount);
                this.currentBet = player.currentBet;
                this.lastRaiser = player;
                break;
            case ACTIONS.CHECK:
                break;
        }

        if (this.getActivePlayers(false).length <= 1) {
            this.determineWinner();
            return;
        }
        
        this.advanceToNextPlayer();
    }

    advanceToNextPlayer() {
        let nextPlayerIndex = (this.activePlayerIndex + 1) % this.playerCount;
        
        while (!this.players[nextPlayerIndex].canAct()) {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.playerCount;
        }
        
        this.activePlayerIndex = nextPlayerIndex;

        if (this.isBettingRoundComplete()) {
            this.nextPhase();
        }
    }

    isBettingRoundComplete() {
        const activePlayers = this.getActivePlayers(false);
        if (activePlayers.length === 0) return true;

        const firstActorAfterBlinds = (this.dealerIndex + 3) % this.playerCount;
        if (this.phase === GAME_PHASES.PREFLOP && this.activePlayerIndex === firstActorAfterBlinds && this.currentBet === this.bigBlind) {
             return false;
        }
        
        // The round is over if the active player is the last person who raised
        if (this.players[this.activePlayerIndex] === this.lastRaiser) {
            return true;
        }
        
        // Or if all active players have matched the current bet
        return activePlayers.every(p => p.currentBet === this.currentBet || p.isAllIn);
    }
    
    nextPhase() {
        this.currentBet = 0;
        this.lastRaiser = null;
        this.players.forEach(p => p.currentBet = 0);

        let firstActorIndex = (this.dealerIndex + 1) % this.playerCount;
        while(!this.players[firstActorIndex].canAct()) {
            firstActorIndex = (firstActorIndex + 1) % this.playerCount;
        }
        this.activePlayerIndex = firstActorIndex;
        this.lastRaiser = this.players[firstActorIndex];


        switch (this.phase) {
            case GAME_PHASES.PREFLOP:
                this.phase = GAME_PHASES.FLOP;
                this.deck.deal(); // Burn
                this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
                break;
            case GAME_PHASES.FLOP:
                this.phase = GAME_PHASES.TURN;
                this.deck.deal(); // Burn
                this.communityCards.push(this.deck.deal());
                break;
            case GAME_PHASES.TURN:
                this.phase = GAME_PHASES.RIVER;
                this.deck.deal(); // Burn
                this.communityCards.push(this.deck.deal());
                break;
            case GAME_PHASES.RIVER:
                this.determineWinner();
                break;
        }

        if (this.getActivePlayers(false).length <= 1) {
             this.determineWinner();
        }
    }

    determineWinner() {
        this.phase = GAME_PHASES.SHOWDOWN;
        const contenders = this.getActivePlayers(true);

        if (contenders.length === 1) {
            this.winnerInfo = { winners: [{...contenders[0], amountWon: this.pot, index: this.players.indexOf(contenders[0])}] };
            contenders[0].chips += this.pot;
            return;
        }

        let bestHands = [];
        for (const player of contenders) {
            player.hand = HandEvaluator.evaluateHand(player.holeCards, this.communityCards);
            bestHands.push({ ...player, index: this.players.indexOf(player) });
        }

        bestHands.sort((a, b) => {
            if (a.hand.rank !== b.hand.rank) {
                return b.hand.rank - a.hand.rank;
            }
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