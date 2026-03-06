

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { AdjustmentType, StockAdjustment } from '@/types';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import { formatDateTime } from '@/api/utils';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);

const Adjustments: React.FC = () => {
    const { 
        stockAdjustments, getProductById,
        loadStockAdjustments, loadProducts, dataState 
    } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        loadStockAdjustments(true);
        loadProducts(true);
    }, [loadStockAdjustments, loadProducts]);

    const adjustments = useMemo(() => {
        if (!stockAdjustments) return [];
        return [...stockAdjustments].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [stockAdjustments]);

    const isDataReady = useMemo(() => (
        dataState.stockAdjustments.loaded && dataState.products.loaded
    ), [dataState]);
    
    const stats = useMemo(() => {
        if (!isDataReady || !stockAdjustments) {
            return { totalAdjustments: 0, valueIncreased: 0, valueDecreased: 0 };
        }
        
        const valueIncreased = stockAdjustments
            .filter(adj => adj.type === AdjustmentType.INCREASE)
            .reduce((sum, adj) => {
                const product = getProductById(adj.productId);
                return sum + (adj.quantity * (product?.price || 0));
            }, 0);

        const valueDecreased = stockAdjustments
            .filter(adj => adj.type === AdjustmentType.DECREASE)
            .reduce((sum, adj) => {
                const product = getProductById(adj.productId);
                return sum + (adj.quantity * (product?.price || 0));
            }, 0);
            
        return {
            totalAdjustments: stockAdjustments.length,
            valueIncreased,
            valueDecreased,
        };
    }, [isDataReady, stockAdjustments, getProductById]);


    const headers = ['Product & Date', 'Type', 'Quantity', 'Reason'];
  
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {!isDataReady ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatCard icon={SlidersHorizontal} title="Total Adjustments" value={stats.totalAdjustments} color="bg-sky-500" />
                        <StatCard icon={ArrowUp} title="Value Increased" value={`₹${stats.valueIncreased.toLocaleString('en-IN')}`} color="bg-emerald-500" />
                        <StatCard icon={ArrowDown} title="Value Decreased" value={`₹${stats.valueDecreased.toLocaleString('en-IN')}`} color="bg-rose-500" />
                    </>
                )}
            </div>
            <Card>
                <CardHeader className="flex justify-between items-center">
                <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">Stock Adjustment History</h2>
                <Button onClick={() => router.push('/inventory/adjustments/new')}>Make Adjustment</Button>
                </CardHeader>
                <CardContent>
                {!isDataReady ? (
                    <TableSkeleton headers={headers} rows={5} />
                ) : adjustments.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-500 dark:text-slate-400">No adjustment history found.</p>
                    </div>
                ) : (
                    <Table headers={headers}>   
                        {adjustments.map((adjustment) => {
                            const product = getProductById(adjustment.productId);
                            
                            return (
                                <tr key={adjustment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-foreground">{product?.name || 'N/A'}</div>
                                        <div className="text-sm text-muted-foreground">{formatDateTime(adjustment.createdAt)}</div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${adjustment.type === AdjustmentType.INCREASE ? 'text-green-600' : 'text-orange-600'}`}>{adjustment.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{adjustment.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{adjustment.reason}</td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Adjustments;
