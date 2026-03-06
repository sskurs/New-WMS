
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { generateSalesForecast } from '@/services/geminiService';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';

interface ForecastResult {
    forecast: { month: string, predictedSales: number }[];
    reasoning: string;
}

const Forecasting: React.FC = () => {
    const { products, orders, loadProducts, loadOrders, dataState } = useAppContext();
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);

    useEffect(() => {
        loadProducts();
        loadOrders();
    }, [loadProducts, loadOrders]);

    const isDataReady = useMemo(() => dataState.products.loaded && dataState.orders.loaded, [dataState]);

    const historicalData = useMemo(() => {
        if (!selectedProductId || !isDataReady) return [];
        
        const salesByMonth: Record<string, number> = {};

        orders.forEach(order => {
            if (['Shipped', 'Completed'].includes(order.status)) {
                const item = order.items.find(i => i.productId === selectedProductId);
                if (item) {
                    const month = new Date(order.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
                    salesByMonth[month] = (salesByMonth[month] || 0) + item.quantity;
                }
            }
        });

        return Object.entries(salesByMonth).map(([month, sales]) => ({ month, sales }))
            .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    }, [selectedProductId, orders, isDataReady]);

    const handleGenerateForecast = async () => {
        if (!selectedProductId || historicalData.length === 0) {
            alert("Please select a product with historical sales data.");
            return;
        }
        setIsLoading(true);
        setForecastResult(null);
        try {
            const productName = products.find(p => p.id === selectedProductId)?.name || '';
            const result = await generateSalesForecast(productName, historicalData);
            setForecastResult(result);
        } catch (error) {
            console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: "error",
                component: "ForecastingPage",
                function: "handleGenerateForecast",
                message: "AI forecast generation failed",
                error: (error instanceof Error) ? { name: error.name, message: error.message } : error,
                context: { selectedProductId }
            }));
            alert("An error occurred while generating the forecast.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-medium">Sales Forecasting Tool</h2>
                </CardHeader>
                <CardContent className="flex items-end space-x-4">
                    <div className="flex-grow">
                        <Select id="product-select" label="Select a Product to Forecast" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} disabled={!isDataReady}>
                            <option value="">-- Choose a product --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </div>
                    <Button onClick={handleGenerateForecast} disabled={isLoading || !selectedProductId || !isDataReady}>
                        {isLoading ? 'Generating...' : 'Generate Forecast'}
                    </Button>
                </CardContent>
            </Card>

            {forecastResult && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-medium">Forecast for {products.find(p => p.id === selectedProductId)?.name}</h3>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <h4 className="font-medium mb-2">AI-Generated Reasoning:</h4>
                            <p className="text-sm text-slate-600 italic p-4 bg-slate-100 rounded-md">
                                {forecastResult.reasoning}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Predicted Sales (Next 3 Months):</h4>
                            <ul className="space-y-2">
                                {forecastResult.forecast.map(item => (
                                    <li key={item.month} className="flex justify-between p-2 bg-slate-100 rounded-md">
                                        <span className="font-medium">{item.month}</span>
                                        <span className="font-bold">{Math.round(item.predictedSales)} units</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Forecasting;
