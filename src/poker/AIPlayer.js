import { ACTIONS } from './PokerGame.js';

export class AIPlayer {
    constructor(aggressiveness = 0.5, bluffFrequency = 0.1) {
        this.aggressiveness = aggressiveness; // 0 = passive, 1 = aggressive
        this.bluffFrequency = bluffFrequency; // 0 = never bluff, 1 = always bluff
        this.lastActions = [];
    }

    makeDecision(gameState, player) {
        const { 
            currentBet, 
            pot, 
            phase, 
            holeCards, 
            communityCards, 
            availableActions 
        } = gameState;

        // Calculate basic hand strength (simplified)
        const handStrength = this.evaluateHandStrength(holeCards, communityCards);
        
        // Calculate pot odds
        const callAmount = currentBet - player.currentBet;
        const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;
        
        // Decision making based on hand strength and AI personality
        let decision = this.makeBasicDecision(handStrength, potOdds, availableActions);
        
        // Apply AI personality modifications
        decision = this.applyPersonality(decision, handStrength, availableActions);
        
        // Track decisions for pattern recognition
        this.lastActions.push(decision);
        if (this.lastActions.length > 5) {
            this.lastActions.shift();
        }

        return decision;
    }

    evaluateHandStrength(holeCards, communityCards) {
        if (!holeCards || holeCards.length === 0) return 0;

        let strength = 0;
        
        // Evaluate hole cards
        const card1 = holeCards[0];
        const card2 = holeCards[1];
        
        // High cards bonus
        strength += (card1.value + card2.value) / 28; // Max 1.0 for AA
        
        // Pair bonus
        if (card1.value === card2.value) {
            strength += 0.5;
        }
        
        // Suited bonus
        if (card1.suit === card2.suit) {
            strength += 0.2;
        }
        
        // Connected cards bonus
        if (Math.abs(card1.value - card2.value) === 1) {
            strength += 0.1;
        }

        // Community cards evaluation (simplified)
        if (communityCards && communityCards.length > 0) {
            // Check for pairs with community cards
            communityCards.forEach(communityCard => {
                if (card1.value === communityCard.value || card2.value === communityCard.value) {
                    strength += 0.3; // Pair with community card
                }
            });
            
            // Check for potential straights/flushes (simplified)
            const allCards = [...holeCards, ...communityCards];
            if (this.hasPotentialFlush(allCards)) {
                strength += 0.2;
            }
            if (this.hasPotentialStraight(allCards)) {
                strength += 0.2;
            }
        }

        return Math.min(strength, 1.0); // Cap at 1.0
    }

    hasPotentialFlush(cards) {
        const suitCounts = {};
        cards.forEach(card => {
            suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        });
        return Object.values(suitCounts).some(count => count >= 4);
    }

    hasPotentialStraight(cards) {
        const values = [...new Set(cards.map(card => card.value))].sort((a, b) => a - b);
        let consecutive = 1;
        for (let i = 1; i < values.length; i++) {
            if (values[i] === values[i-1] + 1) {
                consecutive++;
                if (consecutive >= 4) return true;
            } else {
                consecutive = 1;
            }
        }
        return false;
    }

    makeBasicDecision(handStrength, potOdds, availableActions) {
        // Basic decision tree
        if (handStrength >= 0.8) {
            // Very strong hand
            if (availableActions.includes(ACTIONS.RAISE)) {
                return { action: ACTIONS.RAISE, amount: 0 };
            }
            if (availableActions.includes(ACTIONS.CALL)) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.CHECK };
        }
        
        if (handStrength >= 0.6) {
            // Good hand
            if (potOdds < 0.3 && availableActions.includes(ACTIONS.CALL)) {
                return { action: ACTIONS.CALL };
            }
            if (availableActions.includes(ACTIONS.CHECK)) {
                return { action: ACTIONS.CHECK };
            }
            return { action: ACTIONS.CALL };
        }
        
        if (handStrength >= 0.4) {
            // Marginal hand
            if (potOdds < 0.2) {
                if (availableActions.includes(ACTIONS.CALL)) {
                    return { action: ACTIONS.CALL };
                }
                return { action: ACTIONS.CHECK };
            }
            return { action: ACTIONS.FOLD };
        }
        
        // Weak hand
        if (availableActions.includes(ACTIONS.CHECK)) {
            return { action: ACTIONS.CHECK };
        }
        return { action: ACTIONS.FOLD };
    }

    applyPersonality(decision, handStrength, availableActions) {
        const random = Math.random();
        
        // Aggressive players raise more often
        if (this.aggressiveness > 0.7 && decision.action === ACTIONS.CALL && random < 0.3) {
            if (availableActions.includes(ACTIONS.RAISE)) {
                return { action: ACTIONS.RAISE, amount: 0 };
            }
        }
        
        // Passive players call instead of raising
        if (this.aggressiveness < 0.3 && decision.action === ACTIONS.RAISE && random < 0.5) {
            if (availableActions.includes(ACTIONS.CALL)) {
                return { action: ACTIONS.CALL };
            }
        }
        
        // Bluffing
        if (handStrength < 0.3 && random < this.bluffFrequency) {
            if (availableActions.includes(ACTIONS.RAISE)) {
                return { action: ACTIONS.RAISE, amount: 0 };
            }
        }
        
        return decision;
    }
}

// Preset AI personalities
export const AI_PERSONALITIES = {
    TIGHT_PASSIVE: new AIPlayer(0.2, 0.05),
    TIGHT_AGGRESSIVE: new AIPlayer(0.8, 0.1),
    LOOSE_PASSIVE: new AIPlayer(0.3, 0.15),
    LOOSE_AGGRESSIVE: new AIPlayer(0.9, 0.2),
    UNPREDICTABLE: new AIPlayer(0.5, 0.3)
};
