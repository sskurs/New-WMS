

'use client';

import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatTime } from '@/api/utils';
import CardSkeleton from '@/components/skeletons/CardSkeleton';
import { PickList } from '@/types';
import { Box, Package, Truck } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

const PackingShipping: React.FC = () => {
    const { 
        pickLists, packedOrders, packFullOrder, shipFullOrder, getProductById,
        loadPickLists, loadPackedOrders, loadProducts, dataState
    } = useAppContext();

    useEffect(() => {
        loadPickLists(true);
        loadPackedOrders(true);
        loadProducts(true);
    }, [loadPickLists, loadPackedOrders, loadProducts]);

    const isDataReady = useMemo(() => (
        dataState.pickLists.loaded && dataState.packedOrders.loaded && dataState.products.loaded
    ), [dataState]);

    const readyToPackByOrder = useMemo(() => {
        const pickedLists = pickLists.filter(pl => pl.status === 'Picked');
        const grouped: Record<string, { orderId: string, items: { productId: string, quantity: number }[] }> = {};
        
        pickedLists.forEach(list => {
            if (!grouped[list.orderId]) {
                grouped[list.orderId] = { orderId: list.orderId, items: [] };
            }
            list.items.forEach(item => {
                grouped[list.orderId].items.push({ productId: item.productId, quantity: item.quantity });
            });
        });

        return Object.values(grouped);
    }, [pickLists]);

    const readyToShipByOrder = useMemo(() => {
        const ordersToShip = packedOrders.filter(po => po.status === 'Packed');
        const grouped: Record<string, { 
            orderId: string; 
            items: { productId: string, quantity: number }[];
            packedAt: string;
        }> = {};

        ordersToShip.forEach(order => {
            if (!grouped[order.orderId]) {
                grouped[order.orderId] = { 
                    orderId: order.orderId, 
                    items: [],
                    packedAt: order.packedAt,
                };
            }
            // Combine items, summing quantities for the same product
            order.items.forEach(item => {
                const existingItem = grouped[order.orderId].items.find(i => i.productId === item.productId);
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    grouped[order.orderId].items.push({ productId: item.productId, quantity: item.quantity });
                }
            });

            // Use the latest packed time for the group
            if (new Date(order.packedAt) > new Date(grouped[order.orderId].packedAt)) {
                grouped[order.orderId].packedAt = order.packedAt;
            }
        });

        return Object.values(grouped);
    }, [packedOrders]);
    
    if (!isDataReady) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                    <div className="h-7 w-40 bg-muted rounded-md animate-pulse mb-4"></div>
                    <div className="space-y-4">
                        <CardSkeleton lineCount={3} />
                    </div>
                </section>
                <section>
                    <div className="h-7 w-40 bg-muted rounded-md animate-pulse mb-4"></div>
                     <div className="space-y-4">
                        <CardSkeleton lineCount={3} />
                    </div>
                </section>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Ready to Pack Section */}
        <section>
            <h2 className="text-xl font-medium mb-4 text-foreground flex items-center gap-2">
                <Package className="h-6 w-6 text-violet-500" />
                Ready to Pack
            </h2>
            <div className="space-y-4">
                {readyToPackByOrder.length === 0 ? (
                    <Card>
                        <CardContent>
                             <EmptyState icon={Package} title="Nothing to Pack" message="No orders are fully picked and ready for packing." />
                        </CardContent>
                    </Card>
                ) : (
                    readyToPackByOrder.map(orderGroup => (
                        <Card key={orderGroup.orderId}>
                            <CardHeader>
                                <h3 className="font-medium text-foreground">Order {orderGroup.orderId}</h3>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-sm space-y-1 text-muted-foreground">
                                    {orderGroup.items.map((item, index) => (
                                        <li key={`${item.productId}-${index}`}>{getProductById(item.productId)?.name} (x{item.quantity})</li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => packFullOrder(orderGroup.orderId)}>Mark as Packed</Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </section>

        {/* Ready to Ship Section */}
        <section id="ready-to-ship-section">
            <h2 className="text-xl font-medium mb-4 text-foreground flex items-center gap-2">
                <Box className="h-6 w-6 text-emerald-500" />
                Ready to Ship
            </h2>
            <div className="space-y-4">
                {readyToShipByOrder.length === 0 ? (
                    <Card>
                        <CardContent>
                             <EmptyState icon={Box} title="Nothing to Ship" message="No orders have been packed and are ready for shipping." />
                        </CardContent>
                    </Card>
                ) : (
                    readyToShipByOrder.map(orderGroup => (
                        <Card key={orderGroup.orderId}>
                            <CardHeader>
                                <h3 className="font-medium text-foreground">Order {orderGroup.orderId}</h3>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-sm space-y-1 text-muted-foreground">
                                    {orderGroup.items.map((item, index) => (
                                        <li key={`${item.productId}-${index}`}>{getProductById(item.productId)?.name} (x{item.quantity})</li>
                                    ))}
                                </ul>
                                <p className="text-xs text-muted-foreground mt-2">Packed At: {formatTime(orderGroup.packedAt)}</p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant="secondary" onClick={() => shipFullOrder(orderGroup.orderId)}>Mark as Shipped</Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </section>
        </div>
    );
};

export default PackingShipping;