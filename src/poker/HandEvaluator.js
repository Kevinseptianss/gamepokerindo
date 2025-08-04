// src/poker/HandEvaluator.js

/**
 * A utility class to evaluate and compare poker hands.
 * It determines the best 5-card hand from a set of 7 cards (2 hole cards + 5 community cards).
 */
export const HAND_RANK = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
};

export class HandEvaluator {
    /**
     * Evaluates a set of 7 cards and returns the best possible 5-card hand.
     * @param {Card[]} holeCards - The player's two private cards.
     * @param {Card[]} communityCards - The five shared community cards.
     * @returns {object} An object containing the hand's rank, name, value, and the cards that make up the hand.
     */
    static evaluateHand(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        const allCombinations = this.getCombinations(allCards, 5);
        
        let bestHand = { rank: -1, name: 'Unknown', value: 0, cards: [] };

        for (const combo of allCombinations) {
            const handResult = this.getBestHandForCombination(combo);
            if (handResult.rank > bestHand.rank || (handResult.rank === bestHand.rank && handResult.value > bestHand.value)) {
                bestHand = handResult;
            }
        }
        return bestHand;
    }

    /**
     * Determines the hand rank for a 5-card combination.
     * @param {Card[]} cards - A 5-card combination.
     * @returns {object} The result of the hand evaluation.
     */
    static getBestHandForCombination(cards) {
        const sortedCards = [...cards].sort((a, b) => b.value - a.value);
        const isFlush = this.isFlush(sortedCards);
        const isStraight = this.isStraight(sortedCards);

        if (isStraight && isFlush) {
            return { rank: HAND_RANK.STRAIGHT_FLUSH, name: 'Straight Flush', value: sortedCards[0].value, cards: sortedCards };
        }

        const groups = this.groupRanks(sortedCards);
        const ranks = Object.keys(groups).map(Number).sort((a, b) => b - a);
        const counts = ranks.map(rank => groups[rank].length).sort((a, b) => b - a);

        if (counts[0] === 4) {
            const four = ranks.find(r => groups[r].length === 4);
            const kicker = ranks.find(r => groups[r].length === 1);
            return { rank: HAND_RANK.FOUR_OF_A_KIND, name: 'Four of a Kind', value: four * 15 + kicker, cards: sortedCards };
        }

        if (counts[0] === 3 && counts[1] === 2) {
            const three = ranks.find(r => groups[r].length === 3);
            const pair = ranks.find(r => groups[r].length === 2);
            return { rank: HAND_RANK.FULL_HOUSE, name: 'Full House', value: three * 15 + pair, cards: sortedCards };
        }
        
        if (isFlush) {
            return { rank: HAND_RANK.FLUSH, name: 'Flush', value: this.getHighCardValue(sortedCards), cards: sortedCards };
        }
        
        if (isStraight) {
            return { rank: HAND_RANK.STRAIGHT, name: 'Straight', value: sortedCards[0].value, cards: sortedCards };
        }

        if (counts[0] === 3) {
            const three = ranks.find(r => groups[r].length === 3);
            const kickers = sortedCards.filter(c => c.value !== three).slice(0, 2);
            return { rank: HAND_RANK.THREE_OF_A_KIND, name: 'Three of a Kind', value: three * 225 + this.getHighCardValue(kickers), cards: sortedCards };
        }
        
        if (counts[0] === 2 && counts[1] === 2) {
            const highPair = ranks.find(r => groups[r].length === 2);
            const lowPair = ranks.slice(1).find(r => groups[r].length === 2);
            const kicker = sortedCards.find(c => c.value !== highPair && c.value !== lowPair);
            return { rank: HAND_RANK.TWO_PAIR, name: 'Two Pair', value: highPair * 225 + lowPair * 15 + kicker.value, cards: sortedCards };
        }

        if (counts[0] === 2) {
            const pair = ranks.find(r => groups[r].length === 2);
            const kickers = sortedCards.filter(c => c.value !== pair).slice(0, 3);
            return { rank: HAND_RANK.PAIR, name: 'Pair', value: pair * 3375 + this.getHighCardValue(kickers), cards: sortedCards };
        }

        return { rank: HAND_RANK.HIGH_CARD, name: 'High Card', value: this.getHighCardValue(sortedCards), cards: sortedCards };
    }

    static isFlush(cards) {
        return cards.every(card => card.suit === cards[0].suit);
    }

    static isStraight(cards) {
        // Handle Ace-low straight (A, 2, 3, 4, 5)
        const isAceLow = cards.map(c => c.rank).join('') === 'A5432';
        if (isAceLow) {
            // Re-order for value calculation
            const ace = cards.shift();
            cards.push(ace);
            return true;
        }
        
        for (let i = 0; i < cards.length - 1; i++) {
            if (cards[i].value !== cards[i + 1].value + 1) {
                return false;
            }
        }
        return true;
    }

    static groupRanks(cards) {
        return cards.reduce((groups, card) => {
            const rank = card.value;
            if (!groups[rank]) {
                groups[rank] = [];
            }
            groups[rank].push(card);
            return groups;
        }, {});
    }
    
    static getHighCardValue(cards) {
        return cards.reduce((val, card, i) => val + card.value * Math.pow(15, 4 - i), 0);
    }

    static getCombinations(array, size) {
        const results = [];
        function combination(start, combo) {
            if (combo.length === size) {
                results.push([...combo]);
                return;
            }
            for (let i = start; i < array.length; i++) {
                combo.push(array[i]);
                combination(i + 1, combo);
                combo.pop();
            }
        }
        combination(0, []);
        return results;
    }
}
