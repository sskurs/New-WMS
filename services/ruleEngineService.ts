import { Engine } from 'json-rules-engine';
import { PricingRule } from '../types';

/**
 * Runs a set of pricing rules against a set of facts.
 * @param {PricingRule[]} rules - The pricing rules to evaluate.
 * @param {any} facts - The data to run the rules against (e.g., product, order details).
 * @returns {Promise<number>} The final calculated price after applying successful rules.
 */
export async function runPricingRules(rules: PricingRule[], facts: any): Promise<number> {
    const engine = new Engine();

    rules.forEach(rule => {
        const conditions: { all: any[] } = { all: [] };
        let event: { type: string; params: any } | null = null;

        if (rule.minQuantity && rule.minQuantity > 0) {
            conditions.all.push({
                fact: 'quantity',
                operator: 'greaterThanInclusive',
                value: rule.minQuantity,
            });
        }
        if (rule.maxQuantity && rule.maxQuantity > 0) {
            conditions.all.push({
                fact: 'quantity',
                operator: 'lessThanInclusive',
                value: rule.maxQuantity,
            });
        }

        if (rule.discountPercentage && rule.discountPercentage > 0) {
            event = {
                type: 'percentage-discount',
                params: { amount: rule.discountPercentage },
            };
        } else if (rule.fixedPrice && rule.fixedPrice > 0) {
            event = {
                type: 'set-price',
                params: { price: rule.fixedPrice },
            };
        }

        if (event) {
            const priorityMap: Record<string, number> = { High: 100, Medium: 50, Low: 10 };
            
            engine.addRule({
                name: `${rule.id}-${rule.name}`,
                conditions: conditions.all.length > 0 ? conditions : { all: [] },
                event,
                priority: priorityMap[rule.priority || 'Medium'] || 50,
            });
        }
    });

    let finalPrice = facts.price;

    try {
        const { events } = await engine.run(facts);

        for (const event of events) {
            switch (event.type) {
                case 'percentage-discount':
                    if (event.params?.amount) {
                        finalPrice *= (1 - event.params.amount / 100);
                    }
                    break;
                case 'fixed-discount':
                     if (event.params?.amount) {
                        finalPrice -= event.params.amount;
                    }
                    break;
                case 'set-price':
                     if (event.params?.price) {
                        finalPrice = event.params.price;
                    }
                    break;
                default:
                    console.warn(`Unknown event type in pricing rule: ${event.type}`);
            }
        }
    } catch (error) {
        console.error("Error running pricing rule engine:", error);
    }

    return Math.max(0, finalPrice); // Ensure price doesn't go below zero
}


/**
 * Tests a single pricing rule without saving it.
 * @param {string} ruleJson - The JSON string of the rule to test.
 * @param {any} facts - The sample data to test the rule against.
 * @returns {Promise<{success: boolean, message: string, events?: any[]}>} The result of the test run.
 */
export async function testRule(ruleJson: string, facts: any): Promise<{success: boolean, message: string, events?: any[]}> {
    try {
        const rule = JSON.parse(ruleJson);
        const engine = new Engine();
        engine.addRule(rule);
        
        const { events, failureResults } = await engine.run(facts);
        
        if (failureResults.length > 0) {
             return { success: false, message: 'Conditions not met.' };
        }

        if (events.length > 0) {
            return { success: true, message: `Rule conditions met. Events triggered:`, events };
        } else {
            return { success: false, message: 'Conditions not met, no events triggered.' };
        }

    } catch (error) {
        if (error instanceof Error) {
            return { success: false, message: `Invalid rule JSON: ${error.message}` };
        }
        return { success: false, message: 'An unknown error occurred during testing.' };
    }
}
