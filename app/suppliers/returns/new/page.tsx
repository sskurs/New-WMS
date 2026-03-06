'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Supplier, Stock, PurchaseOrder } from '@/types';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { useToast } from '@/contexts/ToastContext';
import { Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import Table from '@/components/ui/Table';
import { formatDate } from '@/api/utils';

interface ReturnItemInput {
    productId: string;
    locationId: string;
    quantity: number;
    reason: string;
    maxQty: number;
    batchId: string;
    error?: string;
}

const NewSupplierReturnPage: React.FC = () => {
    const { suppliers, products, stocks, purchaseOrders, loadSuppliers, loadProducts, loadStocks, loadLocations, loadPurchaseOrders, locations, zones, addSupplierReturn, getProductById, getLocationById, loadZones } = useAppContext();
    const router = useRouter();
    const { addToast } = useToast();

    const [supplierId, setSupplierId] = useState('');
    const [purchaseOrderId, setPurchaseOrderId] = useState('');
    const [warehouseId, setWarehouseId] = useState('1'); 
    const [items, setItems] = useState<ReturnItemInput[]>([]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSuppliers();
        loadProducts();
        loadStocks();
        loadLocations();
        loadZones();
        loadPurchaseOrders();
    }, []);

    const filteredPOs = useMemo(() => {
        if (!supplierId) return [];
        return purchaseOrders.filter(po => String(po.supplierId) === String(supplierId));
    }, [purchaseOrders, supplierId]);

    const availableStockOptions = useMemo((): SelectOption[] => {
        if (!supplierId) return [];
        
        return stocks
            .filter(s => {
                const product = getProductById(s.productId);
                // Only show stock that belongs to the selected supplier
                return s.quantity > 0 && String(product?.supplierId) === String(supplierId);
            })
            .map(s => {
                const product = getProductById(s.productId);
                const location = getLocationById(s.locationId);
                const locationName = location?.name || 'Receiving Dock';
                const productName = product?.name || 'Unknown Product';
                
                const locKey = (s.locationId === null || s.locationId === undefined) ? 'DOCK' : String(s.locationId);
                const batchId = `BATCH-${s.productId}-${s.id.slice(-4)}`;
                
                return {
                    value: `${s.productId}|${locKey}|${batchId}`,
                    label: `${productName} @ ${locationName}`,
                    description: `Units: ${s.quantity} | SKU: ${product?.sku || 'N/A'} | Batch: ${batchId}`
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [stocks, getProductById, getLocationById, supplierId]);

    const handleAddItem = () => {
        setItems(prev => [...prev, { productId: '', locationId: '', quantity: 0, reason: '', maxQty: 0, batchId: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof ReturnItemInput | 'stockKey', value: string | number) => {
        setItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index] };

            if (field === 'stockKey') {
                const stockKey = value as string;
                if (!stockKey) return prev;
                
                const [pid, lid, bid] = stockKey.split('|');
                
                item.productId = pid;
                item.locationId = (lid === 'DOCK' || !lid) ? '' : String(lid); 
                item.batchId = bid;
                
                const targetLid = (lid === 'DOCK' || !lid) ? null : lid;
                const stockRecord = stocks.find(s => 
                    String(s.productId) === String(pid) && 
                    String(s.locationId ?? null) === String(targetLid ?? null)
                );
                
                item.maxQty = stockRecord?.quantity || 0;
                item.quantity = Math.min(1, item.maxQty);
                item.error = undefined;
            } else if (field === 'quantity') {
                // Ensure only whole numbers
                const numericString = String(value).replace(/[^0-9]/g, '');
                const qty = numericString === '' ? 0 : parseInt(numericString, 10);
                
                item.quantity = qty;
                
                if (qty > item.maxQty) {
                    item.error = `Alert: Quantity (${qty}) exceeds current stock (${item.maxQty}).`;
                } else if (qty <= 0 && numericString !== '') {
                    item.error = "Quantity must be greater than 0.";
                } else {
                    item.error = undefined;
                }
            } else if (field === 'reason') {
                item.reason = String(value);
            }

            newItems[index] = item;
            return newItems;
        });
    };

    const handleSubmit = async () => {
        if (!supplierId) {
            addToast({ type: 'error', message: 'Please select a supplier.' });
            return;
        }
        if (!purchaseOrderId) {
            addToast({ type: 'error', message: 'Please select a Purchase Order.' });
            return;
        }
        if (items.length === 0) {
            addToast({ type: 'error', message: 'Please add at least one item to return.' });
            return;
        }

        const invalidItems = items.filter(i => !i.productId || i.quantity <= 0 || !!i.error || !i.reason);
        if (invalidItems.length > 0) {
            addToast({ type: 'error', message: 'Please correct the errors in the items list. Ensure return quantity does not exceed stock.' });
            return;
        }

        setIsSaving(true);
        try {
            await addSupplierReturn({
                supplierId,
                purchaseOrderId,
                warehouseId,
                items: items.map(i => ({
                    id: '', 
                    productId: i.productId,
                    quantity: i.quantity,
                    locationId: i.locationId, 
                    reason: i.reason,
                    batchId: i.batchId,
                    reasonCode: i.reason.toUpperCase().replace(/\s+/g, '_')
                })),
                notes,
                createdByUserId: '0' 
            });
            router.push('/suppliers/returns');
        } catch (error) {
             // Handled by context
        } finally {
            setIsSaving(false);
        }
    };

    const isGlobalError = items.some(i => !!i.error) || items.length === 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Create Vendor Return (RTV)</h1>
            </div>

            <Card>
                <CardHeader className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            id="supplier"
                            label="1. Select Supplier"
                            value={supplierId}
                            onChange={e => {
                                setSupplierId(e.target.value);
                                setPurchaseOrderId(''); 
                                setItems([]);
                            }}
                        >
                            <option value="">Select Supplier</option>
                            {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Select
                            id="purchaseOrder"
                            label="2. Original Reference PO"
                            value={purchaseOrderId}
                            onChange={e => setPurchaseOrderId(e.target.value)}
                            disabled={!supplierId}
                        >
                            <option value="">Select PO Reference</option>
                            {filteredPOs.map(po => <option key={po.id} value={po.id}>#{po.poNumber} ({formatDate(po.createdAt)})</option>)}
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="font-semibold text-foreground">3. Items to Return</h3>
                                <p className="text-xs text-muted-foreground">Select product/location combinations. System will validate quantity against live stock levels.</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={handleAddItem} disabled={!supplierId}>
                                <Plus className="h-4 w-4 mr-2" /> Add Item Row
                            </Button>
                        </div>
                        
                        <div className="border rounded-lg overflow-x-visible shadow-sm">
                            <Table headers={[
                                'Inventory Spot (Item, Location, Batch)', 
                                { content: 'Current Stock', className: 'text-center w-32' }, 
                                { content: 'Return Qty', className: 'w-36' }, 
                                'Reason / Code', 
                                ''
                            ]}>
                                {items.map((item, index) => {
                                    const locKey = (!item.locationId || item.locationId === '') ? 'DOCK' : item.locationId;
                                    const currentVal = item.productId ? `${item.productId}|${locKey}|${item.batchId}` : '';
                                    
                                    return (
                                        <tr key={index} className={item.error ? "bg-destructive/5" : ""}>
                                            <td className="px-4 py-3 min-w-[350px]">
                                                <SearchableSelect
                                                    id={`item-${index}`}
                                                    value={currentVal}
                                                    options={availableStockOptions}
                                                    onChange={val => handleItemChange(index, 'stockKey', val)}
                                                    placeholder={!supplierId ? "Select supplier first..." : "Find stock..."}
                                                    disabled={!supplierId}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.productId ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-bold text-foreground">{item.maxQty}</span>
                                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Available</span>
                                                    </div>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1.5">
                                                    <Input
                                                        id={`qty-${index}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                        className={item.error ? 'border-destructive focus-visible:ring-destructive' : ''}
                                                        disabled={!item.productId}
                                                        placeholder="Qty"
                                                    />
                                                    {item.error && (
                                                        <div className="flex items-start gap-1 p-1.5 bg-destructive/10 rounded border border-destructive/20 animate-fadeIn">
                                                            <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                                                            <p className="text-[10px] font-bold text-destructive leading-tight">
                                                                {item.error}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    id={`reason-${index}`}
                                                    placeholder="e.g. Expired"
                                                    value={item.reason}
                                                    onChange={e => handleItemChange(index, 'reason', e.target.value)}
                                                    disabled={!item.productId}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                 <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(index)} className="text-muted-foreground hover:text-rose-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Table>
                            {items.length === 0 && (
                                <div className="p-8 text-center bg-muted/20">
                                    <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Click 'Add Item Row' to start building your return request.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <label className="block text-sm font-semibold text-foreground mb-1.5">Internal Notes</label>
                        <textarea
                            className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder:text-muted-foreground/50 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Optional explanation for the vendor or internal audit trail..."
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center bg-muted/20 border-t">
                    <div className="text-xs text-muted-foreground">
                        {items.length} items staged for return.
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
                        <Button 
                            onClick={handleSubmit} 
                            loading={isSaving} 
                            disabled={isGlobalError || isSaving}
                        >
                            Create Return Request
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default NewSupplierReturnPage;