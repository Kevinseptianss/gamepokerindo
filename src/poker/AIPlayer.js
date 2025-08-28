import { HandEvaluator } from './HandEvaluator.js';
import { GAME_PHASES, ACTIONS } from './PokerGame.js';

export class AIPlayer {
    constructor(aggressiveness = 0.5, bluffFrequency = 0.1) {
        this.aggressiveness = aggressiveness;
        this.bluffFrequency = bluffFrequency;
    }

    makeDecision(gameState, player) {
        const { currentBet, pot, phase, holeCards, communityCards, availableActions } = gameState;
        
        // Safety check for valid inputs
        if (!availableActions || availableActions.length === 0) {
            console.error('No available actions for AI player');
            return { action: ACTIONS.FOLD };
        }
        
        console.log(`AI Player decision - Available actions: ${availableActions.join(', ')}, Current bet: ${currentBet}, Player bet: ${player.currentBet}, Chips: ${player.chips}`);
        
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
            const betAmount = this.getBetAmount(pot, player);
            console.log(`AI bluffing with BET: ${betAmount}`);
            return { action: ACTIONS.BET, amount: betAmount };
        }
        if (isBluffing && availableActions.includes(ACTIONS.RAISE)) {
            const raiseAmount = this.getRaiseAmount(currentBet, pot, player);
            console.log(`AI bluffing with RAISE: ${raiseAmount}`);
            return { action: ACTIONS.RAISE, amount: raiseAmount };
        }

        // Standard play
        if (availableActions.includes(ACTIONS.CHECK)) {
            if ((isStrong || Math.random() < this.aggressiveness) && availableActions.includes(ACTIONS.BET)) {
                const betAmount = this.getBetAmount(pot, player);
                console.log(`AI betting: ${betAmount}`);
                decision = { action: ACTIONS.BET, amount: betAmount };
            } else {
                console.log('AI checking');
                decision = { action: ACTIONS.CHECK };
            }
        } else if (availableActions.includes(ACTIONS.CALL)) {
            if (isMonster) {
                const raiseAmount = this.getRaiseAmount(currentBet, pot, player);
                console.log(`AI monster hand raising: ${raiseAmount}`);
                decision = { action: ACTIONS.RAISE, amount: raiseAmount };
            } else if (isStrong && Math.random() < this.aggressiveness) {
                const raiseAmount = this.getRaiseAmount(currentBet, pot, player);
                console.log(`AI strong hand raising: ${raiseAmount}`);
                decision = { action: ACTIONS.RAISE, amount: raiseAmount };
            } else if (shouldPlay) {
                console.log('AI calling');
                decision = { action: ACTIONS.CALL };
            } else {
                console.log('AI folding');
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
        let amount = Math.max(20, pot * (0.3 + this.aggressiveness * 0.4)); // Bet at least big blind, 30% to 70% of pot
        amount = Math.min(player.chips, amount);
        return Math.max(20, Math.floor(amount / 10) * 10); // Minimum bet is big blind (20)
    }
    
    getRaiseAmount(currentBet, pot, player) {
        let minRaise = currentBet + 20; // Current bet + big blind
        let amount = Math.max(minRaise, currentBet * (1.5 + this.aggressiveness * 0.5)); // 1.5x to 2x current bet
        amount = Math.min(player.chips + player.currentBet, amount);
        return Math.max(minRaise, Math.floor(amount / 10) * 10);
    }
}

export const AI_PERSONALITIES = {
    TIGHT_PASSIVE: new AIPlayer(0.2, 0.05),
    TIGHT_AGGRESSIVE: new AIPlayer(0.8, 0.15),
    LOOSE_PASSIVE: new AIPlayer(0.3, 0.2),
    LOOSE_AGGRESSIVE: new AIPlayer(0.9, 0.3),
};