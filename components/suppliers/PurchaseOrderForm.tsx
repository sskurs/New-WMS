'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, PurchaseOrderItem, SupplierProduct } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { Plus, Trash2 } from 'lucide-react';
import { getProductsBySupplierId } from '@/api/inventoryApi';

interface PurchaseOrderFormProps {
    initialPO?: PurchaseOrder;
    onSave: (po: Partial<PurchaseOrder>) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    initialSupplierId?: string | null;
    initialProductId?: string | null;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ initialPO, onSave, onCancel, isSaving, initialSupplierId, initialProductId }) => {
    const { suppliers, loadSuppliers, loadProducts, dataState, getProductById, fetchProductById } = useAppContext();
    const { addToast } = useToast();
    
    const [poData, setPoData] = useState<Partial<PurchaseOrder>>(
        initialPO || { supplierId: '', items: [{ productId: '', quantity: 1, cost: 0 }] }
    );
    const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: number]: { productId?: string, quantity?: string } }>({});

    useEffect(() => {
        loadSuppliers();
        loadProducts(); // Fix: Load products to ensure cache is available for cross-referencing SKUs
    }, [loadSuppliers, loadProducts]);

    useEffect(() => {
        if (initialSupplierId && !initialPO) {
            setPoData(prev => ({ ...prev, supplierId: initialSupplierId }));
        }
    }, [initialSupplierId, initialPO]);

    const supplierOptions = useMemo((): SelectOption[] => {
        return (suppliers || [])
            .filter(s => s.status === 'Active' || (initialPO && s.id === initialPO.supplierId))
            .map(s => ({
                value: s.id,
                label: s.name,
                description: `${s.contactPerson} | ${s.city}, ${s.state}`
            }));
    }, [suppliers, initialPO]);

    const productOptions = useMemo((): SelectOption[] => {
        return supplierProducts.map(p => {
            // Robust SKU retrieval: try global products list first, then supplier-specific API result.
            const globalProduct = getProductById(p.id);
            const skuLabel = globalProduct?.sku || p.sku || 'N/A';
            return {
                value: p.id,
                label: p.name,
                description: `SKU: ${skuLabel} | Cost: ₹${p.cost.toLocaleString('en-IN')}`
            };
        });
    }, [supplierProducts, getProductById]);

    useEffect(() => {
        if (initialProductId && supplierProducts.length > 0 && !initialPO) {
            const product = supplierProducts.find(p => p.id === initialProductId);
            if (product) {
                setPoData(prev => ({
                    ...prev,
                    items: [{
                        productId: initialProductId,
                        quantity: 1,
                        cost: product.cost,
                    }]
                }));
            } else {
                addToast({ type: 'error', message: `Product ID ${initialProductId} is not associated with the selected supplier.` });
            }
        }
    }, [initialProductId, supplierProducts, initialPO, addToast]);

    useEffect(() => {
        if (initialPO) {
            setPoData(initialPO);
            if (initialPO.supplierId) {
                const fetchInitialProducts = async () => {
                    setIsProductsLoading(true);
                    setSupplierProducts([]);
                    try {
                        const productsFromSupplier = await getProductsBySupplierId(initialPO.supplierId!);
                        
                        const productsOnPOPromises = initialPO.items.map(async (item) => {
                            let productDetails = getProductById(item.productId);
                            if (!productDetails) {
                                try {
                                    productDetails = await fetchProductById(item.productId);
                                } catch (e) {
                                    console.error(`Failed to fetch details for product ${item.productId}`, e);
                                }
                            }
                            return {
                                id: item.productId,
                                name: productDetails?.name || `Product ID: ${item.productId}`,
                                sku: productDetails?.sku || 'N/A',
                                cost: item.cost,
                            };
                        });

                        const productsOnPO = await Promise.all(productsOnPOPromises);
                        const combinedProducts = [...productsFromSupplier, ...productsOnPO];
                        const uniqueProducts = Array.from(new Map(combinedProducts.map(p => [p.id, p])).values());

                        setSupplierProducts(uniqueProducts);
                    } catch (error) {
                        addToast({ type: 'error', message: (error as Error).message || "Failed to load products for this supplier." });
                    } finally {
                        setIsProductsLoading(false);
                    }
                };
                fetchInitialProducts();
            }
        }
    }, [initialPO, getProductById, fetchProductById, addToast]);

    useEffect(() => {
        const supplierIsSet = !!poData.supplierId;
        const isNewPO = !initialPO;
        const supplierChangedOnEdit = initialPO && poData.supplierId !== initialPO.supplierId;

        if (supplierIsSet && (isNewPO || supplierChangedOnEdit)) {
            const fetchProducts = async () => {
                setIsProductsLoading(true);
                setPoData(prev => ({ ...prev, items: [{ productId: '', quantity: 1, cost: 0 }] }));
                setSupplierProducts([]);
                setErrors({});
                try {
                    const products = await getProductsBySupplierId(poData.supplierId!);
                    setSupplierProducts(products);
                    if (products.length === 0) {
                        addToast({ type: 'info', message: "This supplier has no associated products." });
                    }
                } catch (error) {
                    addToast({ type: 'error', message: (error as Error).message || "Failed to load products for this supplier." });
                } finally {
                    setIsProductsLoading(false);
                }
            };
            fetchProducts();
        } else if (!supplierIsSet) {
            setSupplierProducts([]);
            setPoData(prev => ({ ...prev, items: [{ productId: '', quantity: 1, cost: 0 }] }));
            setErrors({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poData.supplierId, initialPO]);


    const handleAddItem = () => {
        if (poData.items && poData.items.some(item => !item.productId)) {
            addToast({ type: 'info', message: 'Please select a product for the existing empty row first.' });
            return;
        }
        setPoData(prev => ({ ...prev, items: [...(prev.items || []), { productId: '', quantity: 1, cost: 0 }] }));
    };

    const handleRemoveItem = (index: number) => {
        setPoData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }));
        setErrors({}); // Clear errors when structure changes to avoid index mismatch
    };

    const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
        if (errors[index] && (field === 'productId' || field === 'quantity')) {
             setErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[index]) {
                    const rowErrors = { ...newErrors[index] };
                    if (field === 'productId') delete rowErrors.productId;
                    if (field === 'quantity') delete rowErrors.quantity;
                    
                    if (Object.keys(rowErrors).length === 0) {
                        delete newErrors[index];
                    } else {
                        newErrors[index] = rowErrors;
                    }
                }
                return newErrors;
            });
        }

        if (field === 'productId') {
            const newProductId = value as string;
    
            if (newProductId && poData.items?.some((item, i) => item.productId === newProductId && i !== index)) {
                addToast({ type: 'error', message: 'This product is already on the purchase order.' });
                return;
            }
        }
    
        setPoData(prev => {
            if (!prev?.items) return prev;
    
            const newItems = [...prev.items];
            const itemToUpdate = { ...newItems[index] };
    
            if (field === 'productId') {
                const productId = value as string;
                if (itemToUpdate.productId !== productId) {
                    itemToUpdate.productId = productId;
                    const product = supplierProducts.find(p => p.id === productId);
                    itemToUpdate.cost = product ? product.cost : 0;
                    itemToUpdate.quantity = 1; 
                }
            } else if (field === 'quantity') {
                const numericValue = Math.max(0, parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0);
                itemToUpdate.quantity = numericValue;
            } else if (field === 'cost') {
                const cost = Math.max(0, parseFloat(String(value)) || 0);
                itemToUpdate.cost = cost;
            }
    
            newItems[index] = itemToUpdate;
            return { ...prev, items: newItems };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!poData.supplierId) {
            addToast({ type: 'error', message: "Please select a supplier." });
            return;
        }

        const newErrors: { [key: number]: { productId?: string, quantity?: string } } = {};
        let hasValidationErrors = false;

        if (!poData.items || poData.items.length === 0) {
             addToast({ type: 'error', message: "Please add at least one item to the PO." });
             return;
        }

        poData.items.forEach((item, index) => {
            if (!item.productId) {
                if (!newErrors[index]) newErrors[index] = {};
                newErrors[index].productId = "Product is required";
                hasValidationErrors = true;
            }
            if (item.quantity <= 0) {
                if (!newErrors[index]) newErrors[index] = {};
                newErrors[index].quantity = "Quantity must be > 0";
                hasValidationErrors = true;
            }
        });

        if (hasValidationErrors) {
            setErrors(newErrors);
            return;
        }

        onSave({ ...poData, items: poData.items });
    };

    const poTotal = useMemo(() => {
        return poData.items?.reduce((sum, item) => sum + (item.cost * item.quantity), 0) || 0;
    }, [poData.items]);
    
    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <SearchableSelect 
                        id="supplier" 
                        data-testid="supplier"
                        label="Supplier" 
                        options={supplierOptions}
                        value={poData.supplierId || ''} 
                        onChange={val => setPoData({ ...poData, supplierId: val })}
                        disabled={!!initialPO || !!initialSupplierId}
                        loading={dataState.suppliers.loading}
                        placeholder="Select a supplier..."
                        required
                    />
                </CardHeader>
                <CardContent>
                     <h4 className="text-md font-medium text-foreground mb-4">Items</h4>
                    <div className="overflow-x-visible">
                        <Table headers={['Product', 'Quantity', 'Cost/Unit', 'Total', '']}>
                            {poData.items?.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-1 py-2 w-2/5 min-w-[250px]">
                                        <SearchableSelect 
                                            id={`item-prod-${index}`} 
                                            value={item.productId} 
                                            options={productOptions}
                                            onChange={val => handleItemChange(index, 'productId', val)} 
                                            disabled={!poData.supplierId || isProductsLoading}
                                            loading={isProductsLoading}
                                            error={errors[index]?.productId}
                                            placeholder={!poData.supplierId ? "Select supplier first" : "Search product..."}
                                        />
                                    </td>
                                    <td className="px-1 py-2">
                                        <Input
                                            id={`item-qty-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={item.quantity || ''}
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                            min="1"
                                            placeholder="1"
                                            error={errors[index]?.quantity}
                                        />
                                    </td>
                                    <td className="px-1 py-2">
                                        <Input id={`item-cost-${index}`} type="number" value={item.cost} min="0" step="0.01" readOnly className="bg-muted/50"/>
                                    </td>
                                    <td className="px-1 py-2 text-sm font-medium text-muted-foreground whitespace-nowrap">₹{(item.quantity * item.cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-1 py-2 text-right">
                                        <Button size="icon" variant="ghost" type="button" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                    </div>
                     <div className="flex justify-between items-center pt-4 mt-4 border-t">
                        <Button type="button" variant="secondary" onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Grand Total</p>
                            <p className="text-xl font-bold text-foreground">₹{poTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" loading={isSaving}>{initialPO ? 'Save Changes' : 'Create PO'}</Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default PurchaseOrderForm;