'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { PurchaseOrder, InboundShipment, PurchaseOrderItem } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import CardSkeleton from '@/components/skeletons/CardSkeleton';
import { formatDate } from '@/api/utils';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { Truck, Loader2, Search, Filter } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { getPurchaseOrderById as getPurchaseOrderByIdAPI } from '@/api/suppliersApi';
import ProgressBar from '@/components/ui/ProgressBar';
import Pagination from '@/components/ui/Pagination';

interface ReceivedItemsState {
    [productId: string]: {
        quantity: number;
        error?: string;
        remaining: number;
        previouslyReceived: number;
        selected: boolean;
    };
}

const Receiving: React.FC = () => {
    const { 
        purchaseOrders, getSupplierById, getProductById, receivePurchaseOrderItems,
        loadPurchaseOrders, loadSuppliers, loadProducts, dataState
    } = useAppContext();
    const { addToast } = useToast();

    // State for modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [receivedItems, setReceivedItems] = useState<ReceivedItemsState>({});
    
    // State for filtering and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Issued' | 'Partially Received'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        // Force a refresh of data every time this page is loaded to ensure it's up-to-date
        loadPurchaseOrders(true);
        loadSuppliers(true);
        loadProducts(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isDataReady = useMemo(() => (
        dataState.purchaseOrders.loaded && dataState.suppliers.loaded && dataState.products.loaded
    ), [dataState]);

    const filteredPOs = useMemo(() => {
        const poToReceive = purchaseOrders
            .filter(po => {
                // Robust status check (case-insensitive and trimmed)
                const status = (po.status || '').toString().toLowerCase().trim();
                return status === 'issued' || status === 'partially received';
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        return poToReceive.filter(po => {
            const supplierName = po.supplierName || getSupplierById(po.supplierId)?.name || po.supplierId || '';
            const searchLower = searchTerm.toLowerCase();
            const searchMatch = (
                (po.poNumber || '').toLowerCase().includes(searchLower) ||
                (po.id || '').toLowerCase().includes(searchLower) ||
                (supplierName).toLowerCase().includes(searchLower)
            );
            const statusMatch = statusFilter === 'all' || po.status === statusFilter;
            return searchMatch && statusMatch;
        });
    }, [purchaseOrders, searchTerm, statusFilter, getSupplierById]);
    
    const paginatedPOs = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredPOs.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [filteredPOs, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const openReceiveModal = async (po: PurchaseOrder) => {
        setIsModalOpen(true);
        setIsModalLoading(true);
        setSelectedPO(po); // Set initial PO from context to show title immediately
        setReceivedItems({}); // Clear previous state

        try {
            // Fetch the latest details from the API. This is the source of truth.
            const detailedPOFromAPI = await getPurchaseOrderByIdAPI(po.id);

            if (!detailedPOFromAPI.items || detailedPOFromAPI.items.length === 0) {
                addToast({ type: 'error', message: 'Item details for this purchase order are not available from the server.' });
                // Use the PO from the API but with empty items to show error in modal
                setSelectedPO({ ...detailedPOFromAPI, items: [] });
                setIsModalLoading(false);
                return;
            }

            const initialReceivedItems: ReceivedItemsState = {};
            detailedPOFromAPI.items.forEach(poItem => {
                const previouslyReceived = poItem.receivedQuantity || 0;
                const remaining = poItem.quantity - previouslyReceived;
                initialReceivedItems[poItem.productId] = { 
                    quantity: remaining > 0 ? remaining : 0, 
                    remaining, 
                    previouslyReceived,
                    error: undefined,
                    selected: remaining > 0, // Pre-select items that can be received
                };
            });

            setReceivedItems(initialReceivedItems);
            setSelectedPO(detailedPOFromAPI); // Use the fresh data from the API
        } catch (error) {
            addToast({ type: 'error', message: `Failed to load PO details: ${(error as Error).message}` });
            setIsModalOpen(false);
        } finally {
            setIsModalLoading(false);
        }
    };


    const handleQuantityChange = (productId: string, value: string) => {
        const quantity = parseInt(value, 10);
        const itemState = receivedItems[productId];
        if (!itemState) return;

        if (isNaN(quantity) || quantity < 0) {
             setReceivedItems(prev => ({ ...prev, [productId]: { ...itemState, quantity: 0, error: undefined }}));
        } else if (quantity > itemState.remaining) {
            setReceivedItems(prev => ({ ...prev, [productId]: { ...itemState, quantity, error: `Cannot exceed remaining ${itemState.remaining}` }}));
        } else {
            setReceivedItems(prev => ({ ...prev, [productId]: { ...itemState, quantity, error: undefined }}));
        }
    };

    const handleToggleSelectItem = (productId: string) => {
        setReceivedItems(prev => {
            const itemState = prev[productId];
            if (!itemState) return prev;

            return {
                ...prev,
                [productId]: {
                    ...itemState,
                    selected: !itemState.selected,
                }
            };
        });
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setReceivedItems(prev => {
            const newItems: ReceivedItemsState = {};
            Object.keys(prev).forEach(productId => {
                const item = prev[productId];
                newItems[productId] = {
                    ...item,
                    selected: item.remaining > 0 ? checked : false,
                };
            });
            return newItems;
        });
    };
    
    const handleReceive = () => {
        if (!selectedPO) return;
    
        const itemsJustReceived = Object.entries(receivedItems)
            .filter(([, data]) => (data as ReceivedItemsState[string]).selected && (data as ReceivedItemsState[string]).quantity > 0)
            .map(([productId, data]) => ({ productId, quantity: (data as ReceivedItemsState[string]).quantity }));
    
        if (itemsJustReceived.length === 0) {
            addToast({ type: 'error', message: "Please select at least one item and enter a quantity to receive." });
            return;
        }
    
        const updatedPO: PurchaseOrder = JSON.parse(JSON.stringify(selectedPO));
    
        updatedPO.items.forEach(item => {
            const receivedItem = receivedItems[item.productId];
            if (receivedItem && receivedItem.selected) {
                const receivedNow = receivedItem.quantity || 0;
                 if (receivedNow > 0) {
                    item.receivedQuantity = (item.receivedQuantity || 0) + receivedNow;
                }
            }
        });
    
        const totalOrdered = updatedPO.items.reduce((sum: number, item) => sum + item.quantity, 0);
        const totalReceived = updatedPO.items.reduce((sum: number, item) => sum + (item.receivedQuantity || 0), 0);
    
        if (totalReceived >= totalOrdered) {
            updatedPO.status = 'Received';
        } else if (totalReceived > 0) {
            updatedPO.status = 'Partially Received';
        }
    
        receivePurchaseOrderItems(updatedPO, itemsJustReceived);
    
        setIsModalOpen(false);
        setSelectedPO(null);
        setReceivedItems({});
    };

    const getStatusColor = (status: PurchaseOrder['status']) => {
        const colors = {
            Issued: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Partially Received': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
        };
        return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-800';
    };
    
    // Modal-specific derived state
    const itemsToReceive = useMemo(() => {
        if (!selectedPO?.items) return [];
        // Only show items that have a remaining quantity to be received.
        return selectedPO.items.filter(item => {
            const state = receivedItems[item.productId];
            return state && state.remaining > 0;
        });
    }, [selectedPO, receivedItems]);

    const isAllSelected = useMemo(() => {
        if (itemsToReceive.length === 0) return false;
        // Check if all *receivable* items are selected.
        return itemsToReceive.every(item => {
            const state = receivedItems[item.productId];
            return state && state.selected;
        });
    }, [itemsToReceive, receivedItems]);
    
    const isReceiveDisabled = isModalLoading || Object.values(receivedItems).every(item => !(item as ReceivedItemsState[string]).selected || (item as ReceivedItemsState[string]).quantity <= 0) || Object.values(receivedItems).some(item => (item as ReceivedItemsState[string]).selected && !!(item as ReceivedItemsState[string]).error);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-medium">Purchase Orders Ready for Receiving</h2>
                                <p className="text-sm text-muted-foreground mt-1">Select a PO to log received items against it.</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t">
                            <div className="relative w-full flex-grow">
                                <Input
                                    id="receiving-search"
                                    placeholder="Search by PO#, Order #, or Supplier..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 !py-1.5 text-sm"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="relative w-full sm:w-56">
                                <Select
                                    id="status-filter"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                    className="pl-9 !py-1.5 text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="Issued">Issued</option>
                                    <option value="Partially Received">Partially Received</option>
                                </Select>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                {!isDataReady ? (
                    <div className="space-y-4" data-testid="receiving-loader">
                        <CardSkeleton lineCount={4} />
                        <CardSkeleton lineCount={4} />
                    </div>
                ) : filteredPOs.length === 0 ? (
                    <div data-testid="receiving-empty-state">
                        <EmptyState icon={Truck} title="All Caught Up!" message={searchTerm || statusFilter !== 'all' ? "No purchase orders match your filters." : "No purchase orders are currently awaiting receipt."}/>
                    </div>
                ) : (
                    <div className="space-y-4" data-testid="receiving-po-list">
                    {paginatedPOs.map(po => {
                        const totalCost = po.totalAmount ?? 0;
                        const totalOrdered = po.totalQuantity ?? 0;
                        const totalReceived = po.receivedQuantity ?? 0;
                        const receivingProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : (po.status === 'Received' ? 100 : 0);
                        const supplierName = po.supplierName || getSupplierById(po.supplierId)?.name || po.supplierId || 'N/A';

                        return (
                            <Card key={po.id} className="transition-shadow hover:shadow-md" data-testid="receiving-po-card">
                                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                        <p className="font-semibold text-foreground text-lg"><span className="text-muted-foreground">Order Number: </span>{po.poNumber}</p>
                                        <p className="font-semibold text-foreground text-sm"><span className="text-muted-foreground">PO Number: </span>{po.id}</p>
                                        <p className="text-sm text-muted-foreground mt-1">from {supplierName}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                                        {po.status}
                                    </span>
                                </CardHeader>
                                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                    <div className="sm:col-span-2">
                                         <div className="text-sm text-muted-foreground space-y-1">
                                            <p><strong>Created:</strong> {formatDate(po.createdAt)}</p>
                                            <p><strong>Total Items:</strong> {totalOrdered.toLocaleString()}</p>
                                            <p><strong>Total Cost:</strong> <span className="font-semibold text-foreground">₹{totalCost.toLocaleString('en-IN')}</span></p>
                                         </div>
                                    </div>
                                    <div className="space-y-2">
                                        <ProgressBar value={receivingProgress} />
                                        <p className="text-sm text-center font-medium text-muted-foreground">{totalReceived.toLocaleString()} / {totalOrdered.toLocaleString()} received</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button data-guide-id="receive-goods-button" onClick={() => openReceiveModal(po)}>
                                        Receive Goods
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                    </div>
                )}
                </CardContent>
                 {isDataReady && filteredPOs.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredPOs.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>
            
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={`Receive Goods for Order ${selectedPO?.poNumber} (PO: ${selectedPO?.id})`}
                size="2xl"
                footer={
                    <div className="flex justify-between items-center w-full gap-4">
                        <div className="flex-1">
                            {(!isModalLoading && (!selectedPO?.items || selectedPO.items.length === 0)) && (
                                <p className="text-xs text-destructive text-left">Cannot proceed: Item details are missing from this PO.</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button data-testid="confirm-receive-button" onClick={handleReceive} disabled={isReceiveDisabled}>Confirm & Receive</Button>
                        </div>
                    </div>
                }
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2 sidebar-scrollbar">
                    {isModalLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-4">Select items and enter the quantity received for each. Any unreceived items will remain on the purchase order.</p>
                            <div className="space-y-3">
                                {(!selectedPO?.items || selectedPO.items.length === 0) ? (
                                    <div className="text-center p-8 text-muted-foreground">
                                        <p>Item details for this purchase order are not available.</p>
                                        <p className="text-xs mt-1">Cannot proceed with receiving.</p>
                                    </div>
                                 ) : itemsToReceive.length === 0 ? (
                                    <div className="text-center p-8 text-muted-foreground">
                                        <p>All items on this purchase order have been fully received.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-12 gap-x-4 items-center p-3 rounded-md border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                            <div className="col-span-1 flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-ring"
                                                    checked={isAllSelected}
                                                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                                                    aria-label="Select all items"
                                                />
                                            </div>
                                            <div className="col-span-11 sm:col-span-3">Product</div>
                                            <div className="hidden sm:block col-span-2 text-center">Ordered</div>
                                            <div className="hidden sm:block col-span-2 text-center">Received</div>
                                            <div className="hidden sm:block col-span-2 text-center">To Receive</div>
                                            <div className="hidden sm:block col-span-2">Receiving Now</div>
                                        </div>
                                        {itemsToReceive.map((item, index) => {
                                            const product = getProductById(item.productId);
                                            const state = receivedItems[item.productId];
                                            
                                            if (!product || !state) {
                                                return (
                                                    <div key={item.productId || index} className="p-3 rounded-md border bg-muted/50 text-muted-foreground">
                                                        Loading item details for Product ID: {item.productId}...
                                                    </div>
                                                );
                                            }
                                            const canReceive = state.remaining > 0;
                                            return (
                                                <div 
                                                    key={item.productId} 
                                                    data-testid={`receiving-item-row-${item.productId}`}
                                                    className={`grid grid-cols-12 gap-x-4 gap-y-2 items-center p-3 rounded-md border ${state.selected ? 'bg-background' : 'bg-muted/30 opacity-70'}`}
                                                >
                                                    <div className="col-span-1 flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            data-testid={`receiving-checkbox-${item.productId}`}
                                                            className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-ring disabled:opacity-50"
                                                            checked={state.selected}
                                                            onChange={() => handleToggleSelectItem(item.productId)}
                                                            disabled={!canReceive}
                                                            aria-label={`Select ${product.name}`}
                                                        />
                                                    </div>
                                                    <div className="col-span-11 sm:col-span-3">
                                                        <p className="font-medium text-foreground">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                                    </div>
                                                    <div className="col-span-4 sm:col-span-2 text-sm text-center">
                                                        <p className="text-muted-foreground text-xs uppercase sm:hidden">Ordered</p>
                                                        <p className="font-semibold text-lg text-foreground">{item.quantity}</p>
                                                    </div>
                                                    <div className="col-span-4 sm:col-span-2 text-sm text-center">
                                                        <p className="text-muted-foreground text-xs uppercase sm:hidden">Received</p>
                                                        <p className="font-semibold text-lg text-foreground">{state.previouslyReceived}</p>
                                                    </div>
                                                    <div className="col-span-4 sm:col-span-2 text-sm text-center">
                                                        <p className="text-muted-foreground text-xs uppercase sm:hidden">To Receive</p>
                                                        <p className="font-semibold text-lg text-sky-600">{state.remaining}</p>
                                                    </div>
                                                    <div className="col-span-12 sm:col-span-2">
                                                        <Input
                                                            id={`receive-qty-${item.productId}`}
                                                            type="number"
                                                            label="Receiving Now"
                                                            labelClassName="sm:hidden"
                                                            value={state.quantity}
                                                            onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                                            min={0}
                                                            max={state.remaining}
                                                            className={state.error ? 'border-destructive' : ''}
                                                            disabled={!state.selected || !canReceive}
                                                        />
                                                        {state.selected && state.error && <p className="text-xs text-destructive mt-1">{state.error}</p>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
 )};

export default Receiving;