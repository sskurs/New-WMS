
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { formatDate } from '@/api/utils';
import CardSkeleton from '@/components/skeletons/CardSkeleton';
import { ChevronDown, PackageSearch } from 'lucide-react';
import { PickList, PickListItem } from '@/types';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const Picking: React.FC = () => {
    const { 
        pickLists, getProductById, getLocationById, pickAllItemsForOrder,
        loadPickLists, loadProducts, loadLocations, dataState, loadZones
    } = useAppContext();

    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    useEffect(() => {
        loadPickLists(true);
        loadProducts(true);
        loadLocations(true);
        loadZones(true);
    }, [loadPickLists, loadProducts, loadLocations, loadZones]);

    const isDataReady = useMemo(() => (
        dataState.pickLists.loaded && dataState.products.loaded && dataState.locations.loaded
    ), [dataState]);

    const pickListsByOrder = useMemo(() => {
        // Updated filter to include 'Ready for Pickup' which is now the initial status of newly created picklists.
        const activeLists = pickLists.filter(list => 
            list.status === 'Pending' || 
            list.status === 'In Progress' || 
            list.status === 'Ready for Pickup'
        );
        
        const grouped: Record<string, {
            orderId: string;
            createdAt: string;
            items: PickListItem[];
            status: string;
        }> = {};

        activeLists.forEach(list => {
            if (!grouped[list.orderId]) {
                grouped[list.orderId] = {
                    orderId: list.orderId,
                    createdAt: list.createdAt,
                    items: [],
                    // Keep the current list status as the default
                    status: list.status
                };
            }
            // Consolidate all items for the order
            grouped[list.orderId].items.push(...list.items);

            // Transition group status based on items if 'Pending' or 'Ready for Pickup'
            if (list.items.some(i => i.picked)) {
                grouped[list.orderId].status = 'In Progress';
            }
        });

        return Object.values(grouped);
    }, [pickLists]);

    useEffect(() => {
        // Automatically expand the first active list
        if (isDataReady && !expandedOrderId && pickListsByOrder.length > 0) {
            setExpandedOrderId(pickListsByOrder[0].orderId);
        }
    }, [isDataReady, pickListsByOrder, expandedOrderId]);

    const toggleExpand = (orderId: string) => {
        setExpandedOrderId(prevId => (prevId === orderId ? null : orderId));
    };

    if (!isDataReady) {
        return (
            <div className="space-y-6">
                <CardSkeleton lineCount={4} />
                <CardSkeleton lineCount={3} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {pickListsByOrder.length === 0 ? (
                <Card>
                    <CardContent>
                        <EmptyState 
                            icon={PackageSearch}
                            title="No Active Pick Lists"
                            message="When new orders are ready for picking, they will appear here."
                        />
                    </CardContent>
                </Card>
            ) : (
                pickListsByOrder.map((orderGroup) => {
                    const isExpanded = expandedOrderId === orderGroup.orderId;
                    const unpickedItems = orderGroup.items.filter(item => !item.picked);

                    return (
                        <Card key={orderGroup.orderId}>
                            <CardHeader 
                                onClick={() => toggleExpand(orderGroup.orderId)} 
                                className="flex justify-between items-center bg-muted/50 cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h3 className="font-semibold text-foreground">Order {orderGroup.orderId}</h3>
                                        <p className="text-sm text-muted-foreground">Created: {formatDate(orderGroup.createdAt)}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                        orderGroup.status === 'In Progress' ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'}`
                                    }>
                                        {orderGroup.status}
                                    </span>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </CardHeader>
                            {isExpanded && (
                                <>
                                    <CardContent className="animate-fadeIn pt-4">
                                        {unpickedItems.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4 text-center">All items in this list have been picked. It will move to Packing & Shipping shortly.</p>
                                        ) : (
                                            <ul className="divide-y divide-border">
                                                {unpickedItems.map((item, index) => {
                                                    const product = getProductById(item.productId);
                                                    const location = getLocationById(item.locationId);
                                                    return (
                                                        <li key={`${item.productId}-${index}`} className="py-3">
                                                            <p className="font-medium text-foreground">{product?.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Qty: <span className="font-bold">{item.quantity}</span> | Location: <span className="font-bold">{location?.name || 'N/A'} ({location?.code})</span>
                                                            </p>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button 
                                            onClick={() => pickAllItemsForOrder(orderGroup.orderId)} 
                                            disabled={unpickedItems.length === 0}
                                            className="w-full"
                                        >
                                            Mark All Items as Picked
                                        </Button>
                                    </CardFooter>
                                </>
                            )}
                        </Card>
                    )
                })
            )}
        </div>
    );
};

export default Picking;
