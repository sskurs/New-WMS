
'use client';

import React, { useState, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { OrderItem, Product, PricingRule } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { Sparkles, HardHat, ChevronsRight, Search } from 'lucide-react';
import { analyzePricingLogic } from '@/services/geminiService';

interface DebugStep {
    title: string;
    details: string;
    status: 'info' | 'success' | 'failure' | 'neutral';
}

interface ItemDebugResult {
    item: OrderItem;
    product: Product;
    log: DebugStep[];
    finalPrice: number;
}

const PricingRuleDebugger: React.FC = () => {
    const { fetchOrderById, fetchProductById, fetchPricingRuleById } = useAppContext();
    const { addToast } = useToast();

    const [orderId, setOrderId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [debugResults, setDebugResults] = useState<ItemDebugResult[] | null>(null);
    const [aiSummary, setAiSummary] = useState('');
    const [finalTotal, setFinalTotal] = useState(0);

    const runDebugger = useCallback(async () => {
        if (!orderId) {
            addToast({ type: 'error', message: 'Please enter an Order ID.' });
            return;
        }
        setIsLoading(true);
        setDebugResults(null);
        setAiSummary('');
        setFinalTotal(0);

        try {
            const order = await fetchOrderById(orderId);
            if (!order) {
                // Toast is shown in context
                return;
            }

            let calculatedTotal = 0;
            const results: ItemDebugResult[] = [];
            let fullLogForAI = `Debugging Order ID: ${orderId}\n\n`;

            for (const item of order.items) {
                const log: DebugStep[] = [];
                let currentPrice = item.price;
                
                log.push({ title: 'Starting Point', details: `Order Item: ${item.quantity} x Product ID ${item.productId} @ base price of ₹${item.price}`, status: 'neutral' });
                
                const product = await fetchProductById(item.productId);
                if (!product) {
                    log.push({ title: 'Error', details: 'Could not find product details.', status: 'failure' });
                    calculatedTotal += currentPrice * item.quantity;
                    results.push({ item, product: {} as Product, log, finalPrice: currentPrice });
                    continue;
                }

                log.push({ title: 'Product Details Found', details: `Name: ${product.name}, Attached Pricing Rule ID: ${product.pricingRuleId || 'None'}`, status: 'neutral' });
                
                if (product.pricingRuleId && product.pricingRuleId !== '0') {
                    const rule = await fetchPricingRuleById(product.pricingRuleId);
                    if (!rule) {
                        log.push({ title: 'Rule Lookup Failed', details: `Could not find Pricing Rule with ID ${product.pricingRuleId}.`, status: 'failure' });
                    } else {
                        log.push({ title: 'Pricing Rule Found', details: `Rule Name: '${rule.name}', IsActive: ${rule.isActive}`, status: 'neutral' });
                        
                        let conditionsMet = true;
                        if (!rule.isActive) {
                            log.push({ title: 'Condition Check: IsActive', details: 'Rule is inactive.', status: 'failure' });
                            conditionsMet = false;
                        } else {
                             log.push({ title: 'Condition Check: IsActive', details: 'Rule is active.', status: 'success' });
                        }

                        if (rule.minQuantity && item.quantity < rule.minQuantity) {
                            log.push({ title: 'Condition Check: Min Quantity', details: `Order quantity (${item.quantity}) is less than rule minimum (${rule.minQuantity}).`, status: 'failure' });
                            conditionsMet = false;
                        } else {
                            log.push({ title: 'Condition Check: Min Quantity', details: `Order quantity (${item.quantity}) meets minimum of ${rule.minQuantity || 'N/A'}.`, status: 'success' });
                        }
                        
                        // NOTE: Stored Procedure did not check date range, so we will skip it here too to match logic.

                        if (conditionsMet) {
                            log.push({ title: 'All Conditions Met', details: 'Applying rule action...', status: 'success' });
                            if (rule.discountPercentage && rule.discountPercentage > 0) {
                                const discountAmount = currentPrice * (rule.discountPercentage / 100);
                                currentPrice -= discountAmount;
                                log.push({ title: 'Action: Percentage Discount', details: `Applied ${rule.discountPercentage}% discount. New price: ₹${currentPrice.toFixed(2)}`, status: 'success' });
                            } else if (rule.fixedPrice && rule.fixedPrice > 0) {
                                currentPrice = rule.fixedPrice;
                                log.push({ title: 'Action: Fixed Price', details: `Set price to fixed amount: ₹${currentPrice.toFixed(2)}`, status: 'success' });
                            } else {
                                log.push({ title: 'Action: No-Op', details: 'Rule has no discount or fixed price action.', status: 'failure' });
                            }
                        } else {
                            log.push({ title: 'Conditions Not Met', details: 'Rule was not applied. Using base price.', status: 'failure' });
                        }
                    }
                } else {
                    log.push({ title: 'No Rule Assigned', details: 'Product has no pricing rule attached. Using base price.', status: 'neutral' });
                }

                log.push({ title: 'Final Calculation', details: `Line Total: ${item.quantity} x ₹${currentPrice.toFixed(2)} = ₹${(item.quantity * currentPrice).toFixed(2)}`, status: 'neutral' });
                calculatedTotal += item.quantity * currentPrice;
                results.push({ item, product, log, finalPrice: currentPrice });
                
                fullLogForAI += `Item: ${product.name}\n${log.map(l => `- ${l.title}: ${l.details}`).join('\n')}\n\n`;
            }

            setDebugResults(results);
            setFinalTotal(calculatedTotal);
            
            const summary = await analyzePricingLogic(fullLogForAI);
            setAiSummary(summary);

        } catch (error) {
            addToast({ type: 'error', message: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    }, [orderId, addToast, fetchOrderById, fetchProductById, fetchPricingRuleById]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Pricing Rule Debugger</h1>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-medium">Run Simulation</h2>
                    <p className="text-sm text-muted-foreground">Enter an Order ID to simulate the pricing logic and identify issues.</p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-2 max-w-sm">
                        <Input
                            id="orderId"
                            label="Order ID"
                            value={orderId}
                            onChange={e => setOrderId(e.target.value)}
                            placeholder="e.g., ORD-123 or 123"
                        />
                        <Button onClick={runDebugger} loading={isLoading}>
                            <Search className="h-4 w-4 mr-2" />
                            Run Debug
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {debugResults && (
                <div className="space-y-6 animate-fadeIn">
                    <Card className="bg-primary/5 border-primary/20">
                         <CardHeader className="flex items-center gap-3">
                            <Sparkles className="h-6 w-6 text-primary" />
                            <h2 className="text-xl font-semibold text-primary">AI Analysis</h2>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground italic">{aiSummary || 'Generating analysis...'}</p>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <h2 className="text-lg font-medium">Simulation Results for Order #{orderId}</h2>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {debugResults.map(({ item, product, log }) => (
                                <div key={item.productId} className="p-4 border rounded-lg">
                                    <h3 className="font-bold text-lg text-foreground">{product.name || `Product ID: ${item.productId}`}</h3>
                                    <div className="mt-4 space-y-2">
                                        {log.map((step, index) => (
                                            <div key={index} className="flex items-start gap-3 text-sm">
                                                <ChevronsRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-foreground">{step.title}</p>
                                                    <p className="text-muted-foreground">{step.details}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="text-right">
                             <p className="text-sm text-muted-foreground">Original Order Total</p>
                            <p className="text-lg font-bold text-foreground line-through">₹{debugResults.reduce((sum, r) => sum + r.item.price * r.item.quantity, 0).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground mt-2">Simulated Final Total</p>
                            <p className="text-2xl font-extrabold text-primary">₹{finalTotal.toFixed(2)}</p>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PricingRuleDebugger;
