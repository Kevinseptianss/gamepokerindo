import { HandEvaluator } from './HandEvaluator.js';
// ACTIONS are already imported above

export class AIPlayer {
    constructor(aggressiveness = 0.5, bluffFrequency = 0.1) {
        this.aggressiveness = aggressiveness;
        this.bluffFrequency = bluffFrequency;
    }

    makeDecision(gameState, player) {
        const { currentBet, pot, phase, holeCards, communityCards, availableActions } = gameState;
        
        const hand = HandEvaluator.evaluateHand(holeCards, communityCards);
        const handStrength = (hand.rank + hand.value / 1000000) / 9; // Normalize strength

        const callAmount = currentBet - player.currentBet;
        const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;

        // --- Basic Decision Logic ---
        let decision;
        const shouldPlay = handStrength > potOdds;
        const isStrong = handStrength > 0.5;
        const isMonster = handStrength > 0.8;

        // Bluffing logic
        const isBluffing = Math.random() < this.bluffFrequency && phase !== GAME_PHASES.PREFLOP;
        if (isBluffing && availableActions.includes(ACTIONS.BET)) {
            return { action: ACTIONS.BET, amount: this.getBetAmount(pot, player) };
        }
        if (isBluffing && availableActions.includes(ACTIONS.RAISE)) {
            return { action: ACTIONS.RAISE, amount: this.getRaiseAmount(currentBet, pot, player) };
        }

        // Standard play
        if (availableActions.includes(ACTIONS.CHECK)) {
            if ((isStrong || Math.random() < this.aggressiveness) && availableActions.includes(ACTIONS.BET)) {
                decision = { action: ACTIONS.BET, amount: this.getBetAmount(pot, player) };
            } else {
                decision = { action: ACTIONS.CHECK };
            }
        } else if (availableActions.includes(ACTIONS.CALL)) {
            if (isMonster) {
                decision = { action: ACTIONS.RAISE, amount: this.getRaiseAmount(currentBet, pot, player) };
            } else if (isStrong && Math.random() < this.aggressiveness) {
                 decision = { action: ACTIONS.RAISE, amount: this.getRaiseAmount(currentBet, pot, player) };
            } else if (shouldPlay) {
                decision = { action: ACTIONS.CALL };
            } else {
                decision = { action: ACTIONS.FOLD };
            }
        } else {
             decision = { action: ACTIONS.FOLD };
        }

        // Ensure the decided action is actually available
        if (!availableActions.includes(decision.action)) {
            if (availableActions.includes(ACTIONS.CALL)) return { action: ACTIONS.CALL };
            if (availableActions.includes(ACTIONS.CHECK)) return { action: ACTIONS.CHECK };
            return { action: ACTIONS.FOLD };
        }

        return decision;
    }

    getBetAmount(pot, player) {
        let amount = pot * (0.5 + this.aggressiveness * 0.5); // Bet 50% to 100% of pot
        return Math.floor(Math.min(player.chips, amount) / 10) * 10;
    }
    
    getRaiseAmount(currentBet, pot, player) {
        let amount = currentBet * 2 + pot;
        amount *= (0.8 + this.aggressiveness * 0.4); // Raise aggressively
        return Math.floor(Math.min(player.chips + player.currentBet, amount) / 10) * 10;
    }
}

export const AI_PERSONALITIES = {
    TIGHT_PASSIVE: new AIPlayer(0.2, 0.05),
    TIGHT_AGGRESSIVE: new AIPlayer(0.8, 0.15),
    LOOSE_PASSIVE: new AIPlayer(0.3, 0.2),
    LOOSE_AGGRESSIVE: new AIPlayer(0.9, 0.3),
};