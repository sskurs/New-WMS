'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { AdjustmentType, StockAdjustment, Stock, Location } from '@/types';
import Card, { CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { useToast } from '@/contexts/ToastContext';
import { AlertTriangle, MapPin, Check, Info, Lock } from 'lucide-react';
import Loader from '@/components/ui/Loader';

type AdjustmentMode = 'quantity' | 'value';

const NewStockAdjustmentContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { 
        products, getProductById, adjustStock, loadProducts, dataState, 
        getStockForProduct, locations, zones, loadLocations, loadZones, stocks, loadStocks
    } = useAppContext();
    const { addToast } = useToast();

    const adjustmentReasons = [
        'Stocktaking results',
        'Damaged goods',
        'Stolen goods',
        'Stock Written off',
        'Inventory Revaluation',
        'Stock on fire',
    ];

    const [mode, setMode] = useState<AdjustmentMode>('quantity');
    const [productId, setProductId] = useState<string>('');
    const [locationId, setLocationId] = useState<string | null>(null);
    const [type, setType] = useState<AdjustmentType>(AdjustmentType.DECREASE);
    const [quantity, setQuantity] = useState<number>(0);
    const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
    const [reason, setReason] = useState<string>(adjustmentReasons[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{ quantity?: string }>({});

    // Check if this is a guided adjustment from the discrepancy report
    const isGuidedMode = useMemo(() => {
        return !!searchParams.get('productId') && !!searchParams.get('quantity') && !!searchParams.get('type');
    }, [searchParams]);

    // Pre-populate from URL if available
    useEffect(() => {
        const pId = searchParams.get('productId');
        const lId = searchParams.get('locationId');
        const aType = searchParams.get('type');
        const aQty = searchParams.get('quantity');
        const aReason = searchParams.get('reason');

        if (pId) setProductId(pId);
        if (lId) setLocationId(lId === 'null' ? null : lId);
        
        // Safety for type parameter
        if (aType) {
            const normalized = aType.toLowerCase();
            if (normalized === 'increase' || aType === AdjustmentType.INCREASE) setType(AdjustmentType.INCREASE);
            else if (normalized === 'decrease' || aType === AdjustmentType.DECREASE) setType(AdjustmentType.DECREASE);
        }
        
        if (aQty) setQuantity(parseInt(aQty, 10) || 0);
        if (aReason) setReason(aReason);

        // Force 'quantity' mode for guided discrepancy adjustments
        if (isGuidedMode) {
            setMode('quantity');
        }
    }, [searchParams, isGuidedMode]);

    useEffect(() => {
        loadProducts();
        loadLocations();
        loadZones();
        loadStocks();
    }, [loadProducts, loadLocations, loadZones, loadStocks]);

    const productOptions = useMemo((): SelectOption[] => {
        return (products || []).map(p => ({
            value: p.id,
            label: p.name,
            description: `SKU: ${p.sku} | Price: ₹${p.price.toLocaleString('en-IN')}`
        }));
    }, [products]);

    const selectedProduct = useMemo(() => getProductById(productId), [productId, getProductById]);

    // Locations where the selected product has stock
    const availableStockLocations = useMemo(() => {
        if (!productId) return [];
        const productStocks = stocks.filter(s => s.productId === productId && s.quantity > 0);
        
        return productStocks.map(stock => {
            const loc = [...locations, ...zones].find(l => l.id === stock.locationId);
            return {
                stockId: stock.id,
                locationId: stock.locationId,
                locationName: loc?.name || (stock.locationId === null ? 'Receiving Dock' : 'Unknown'),
                locationCode: loc?.code || 'DOCK',
                quantity: stock.quantity
            };
        }).sort((a,b) => a.locationName.localeCompare(b.locationName));
    }, [productId, stocks, locations, zones]);

    // Handle auto-selection when product changes (only if not pre-populated)
    useEffect(() => {
        if (productId && locationId === null && availableStockLocations.length === 1 && !searchParams.get('locationId')) {
            setLocationId(availableStockLocations[0].locationId);
        }
    }, [productId, availableStockLocations, locationId, searchParams]);
    
    const finalQuantity = useMemo(() => {
        if (mode === 'value' && selectedProduct && selectedProduct.price > 0) {
            return Math.abs(Math.round(adjustmentValue / selectedProduct.price));
        }
        return quantity;
    }, [mode, adjustmentValue, quantity, selectedProduct]);
    
    const availableStock = useMemo(() => {
        if (!productId) return 0;
        const stockAtLocation = stocks.find(s => s.productId === productId && s.locationId === locationId);
        return stockAtLocation?.quantity || 0;
    }, [productId, locationId, stocks]);
    
    useEffect(() => {
        const newErrors: { quantity?: string } = {};

        if (productId) {
            if (mode === 'value' && adjustmentValue > 0 && finalQuantity === 0) {
                const minVal = selectedProduct ? (selectedProduct.price / 2).toFixed(2) : '0.50';
                newErrors.quantity = `Value is too low. Min value to adjust 1 unit is ~₹${minVal}.`;
            } else if (finalQuantity <= 0 && (quantity > 0 || adjustmentValue > 0)) {
                 newErrors.quantity = 'Adjustment quantity must be greater than zero.';
            }
    
            if (type === AdjustmentType.DECREASE && finalQuantity > availableStock && locationId !== null) {
                newErrors.quantity = `Cannot decrease by more than available stock (${availableStock}).`;
            }
        }
        
        setErrors(newErrors);

    }, [finalQuantity, type, availableStock, productId, locationId, mode, adjustmentValue, selectedProduct, quantity]);

    const handleSave = async () => {
        if (Object.keys(errors).length > 0) {
            addToast({ type: 'error', message: 'Please fix the validation errors before saving.' });
            return;
        }

        if (!productId) {
            addToast({ type: 'error', message: 'Please select a product.' });
            return;
        }

        if (finalQuantity <= 0) {
            addToast({ type: 'error', message: 'Please enter a valid quantity or value greater than zero.' });
            return;
        }

        setIsSaving(true);
        try {
            await adjustStock(productId, finalQuantity, reason, type, locationId);
            router.push('/inventory/adjustments');
        } catch (error) {
            // Error is handled in context
        } finally {
            setIsSaving(false);
        }
    };
    
    const isSaveDisabled = isSaving || Object.keys(errors).length > 0 || !productId || finalQuantity <= 0;
    
    const newStockLevel = useMemo(() => {
        if (type === AdjustmentType.INCREASE) {
            return availableStock + finalQuantity;
        }
        return availableStock - finalQuantity;
    }, [availableStock, finalQuantity, type]);


    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Stock Adjustment</h1>
                    <p className="text-sm text-muted-foreground">Adjust inventory levels for specific products by quantity or total value.</p>
                </div>
                {isGuidedMode && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Lock className="h-3 w-3" />
                        Guided Correction Mode
                    </div>
                )}
            </div>
            
            <Card>
                <CardContent className="p-6 space-y-8">
                    {/* Step 1: Product Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-foreground uppercase tracking-wider">Step 1: Select Product</label>
                        <div className={isGuidedMode ? 'pointer-events-none opacity-80' : ''}>
                            <SearchableSelect 
                                id="product" 
                                value={productId} 
                                options={productOptions}
                                onChange={val => !isGuidedMode && setProductId(val)} 
                                disabled={!dataState.products.loaded || isGuidedMode}
                                loading={dataState.products.loading}
                                placeholder="Search for a product by name or SKU..."
                            />
                        </div>
                        {isGuidedMode && (
                            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" /> Product selection locked for discrepancy correction.
                            </p>
                        )}
                    </div>

                    {/* Step 2: Location Labels */}
                    {productId && (
                        <div className="space-y-4 pt-4 border-t border-border animate-slideInFromBottom">
                            <label className="block text-sm font-semibold text-foreground uppercase tracking-wider">Step 2: Select Location Badge</label>
                            {availableStockLocations.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {availableStockLocations.map((loc) => (
                                        <button
                                            key={String(loc.locationId)}
                                            type="button"
                                            onClick={() => !isGuidedMode && setLocationId(loc.locationId)}
                                            disabled={isGuidedMode && locationId !== loc.locationId}
                                            className={`flex flex-col p-3 text-left rounded-lg border-2 transition-all duration-200 group ${
                                                locationId === loc.locationId
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : isGuidedMode ? 'border-border opacity-40 cursor-not-allowed grayscale' : 'border-border hover:border-primary/50 bg-background'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className={`h-4 w-4 ${locationId === loc.locationId ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <span className={`font-bold ${locationId === loc.locationId ? 'text-primary' : 'text-foreground'}`}>
                                                        {loc.locationCode}
                                                    </span>
                                                </div>
                                                {locationId === loc.locationId && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 truncate">{loc.locationName}</p>
                                            <div className="mt-2 flex items-baseline gap-1">
                                                <span className="text-lg font-bold text-foreground">{loc.quantity}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold">In Stock</span>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => !isGuidedMode && setLocationId(null)}
                                        disabled={isGuidedMode && locationId !== null}
                                        className={`flex flex-col p-3 text-left rounded-lg border-2 border-dashed transition-all duration-200 ${
                                            locationId === null
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : isGuidedMode ? 'border-border opacity-40 cursor-not-allowed grayscale' : 'border-border hover:border-primary/50 bg-background'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-2">
                                                <MapPin className={`h-4 w-4 ${locationId === null ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <span className={`font-bold ${locationId === null ? 'text-primary' : 'text-foreground'}`}>DOCK</span>
                                            </div>
                                            {locationId === null && <Check className="h-4 w-4 text-primary" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Receiving Dock</p>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-foreground">0</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Base</span>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6 bg-muted/30 rounded-xl border border-dashed text-center flex flex-col items-center gap-3">
                                    <div className="p-3 rounded-full bg-background border shadow-sm">
                                        <Info className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">No existing stock found</p>
                                        <p className="text-sm text-muted-foreground">Adjusting for this product will default to the Receiving Dock.</p>
                                    </div>
                                    {!isGuidedMode && (
                                        <Button 
                                            variant={locationId === null ? "primary" : "secondary"}
                                            onClick={() => setLocationId(null)}
                                            size="sm"
                                        >
                                            Use Receiving Dock
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Adjustment Mode & Value */}
                    {productId && (
                        <div className="space-y-6 pt-4 border-t border-border animate-slideInFromBottom">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <label className="block text-sm font-semibold text-foreground uppercase tracking-wider">Step 3: Define Adjustment</label>
                                {!isGuidedMode && (
                                    <div className="flex p-1 bg-muted rounded-lg w-full sm:w-auto">
                                        <Button 
                                            type="button" variant="ghost" size="sm" 
                                            className={`px-6 !border-0 ${mode === 'quantity' ? 'bg-background shadow-sm' : 'hover:bg-accent'}`}
                                            onClick={() => setMode('quantity')}
                                        >
                                            By Quantity
                                        </Button>
                                        <Button 
                                            type="button" variant="ghost" size="sm" 
                                            className={`px-6 !border-0 ${mode === 'value' ? 'bg-background shadow-sm' : 'hover:bg-accent'}`}
                                            onClick={() => setMode('value')}
                                        >
                                            By Value
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={isGuidedMode ? 'pointer-events-none opacity-80' : ''}>
                                    <Select 
                                        id="type" 
                                        label="Adjustment Logic" 
                                        value={type} 
                                        onChange={e => !isGuidedMode && setType(e.target.value as AdjustmentType)}
                                        disabled={isGuidedMode}
                                    >
                                        <option value={AdjustmentType.DECREASE}>Correction: Decrease Stock (Loss/Damage)</option>
                                        <option value={AdjustmentType.INCREASE}>Correction: Increase Stock (Surplus)</option>
                                    </Select>
                                </div>

                                {mode === 'quantity' ? (
                                    <div className={isGuidedMode ? 'pointer-events-none opacity-80' : ''}>
                                        <Input 
                                            id="quantity" label="Change Quantity" type="text" inputMode="numeric"
                                            value={quantity || ''} 
                                            onChange={e => !isGuidedMode && setQuantity(Math.abs(parseInt(e.target.value, 10) || 0))}
                                            placeholder="e.g. 10" error={errors.quantity}
                                            disabled={isGuidedMode}
                                        />
                                    </div>
                                ) : (
                                    <div className={`relative ${isGuidedMode ? 'pointer-events-none opacity-80' : ''}`}>
                                        <Input 
                                            id="value" label={`Financial Impact (₹)`} type="number" 
                                            value={adjustmentValue || ''} 
                                            onChange={e => !isGuidedMode && setAdjustmentValue(Math.abs(parseFloat(e.target.value) || 0))}
                                            placeholder="e.g. 5000" error={errors.quantity}
                                            disabled={isGuidedMode}
                                        />
                                        {finalQuantity > 0 && selectedProduct && !errors.quantity && (
                                            <p className="text-xs font-bold text-primary mt-1.5 uppercase tracking-tighter">
                                                &raquo; Impact: {finalQuantity} Units
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-muted/50 border border-border rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-4 items-center shadow-sm">
                                <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Current</p>
                                    <p className="text-xl font-bold text-foreground">{availableStock}</p>
                                </div>
                                <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Change</p>
                                    <p className={`text-xl font-bold ${type === AdjustmentType.INCREASE ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {type === AdjustmentType.INCREASE ? '+' : '-'}{finalQuantity}
                                    </p>
                                </div>
                                <div className="text-center sm:text-left border-r border-border col-span-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">New Level</p>
                                    <p className="text-xl font-extrabold text-foreground">{newStockLevel}</p>
                                </div>
                                <div className="text-center sm:text-left col-span-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Unit Price</p>
                                    <p className="text-lg font-medium text-muted-foreground">₹{selectedProduct?.price || 0}</p>
                                </div>
                            </div>

                            <div className={isGuidedMode ? 'pointer-events-none' : ''}>
                                <Select 
                                    id="reason" 
                                    label="Audit Reason" 
                                    value={reason} 
                                    onChange={e => setReason(e.target.value)}
                                    disabled={isGuidedMode && reason.includes('Discrepancy Correction')}
                                >
                                    {adjustmentReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                    {isGuidedMode && !adjustmentReasons.includes(reason) && <option value={reason}>{reason}</option>}
                                </Select>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end space-x-3 bg-muted/20 border-t">
                    <Button type="button" variant="secondary" onClick={() => router.push('/inventory/adjustments')}>Discard</Button>
                    <Button onClick={handleSave} loading={isSaving} disabled={isSaveDisabled}>
                        Commit Adjustment
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const NewStockAdjustment: React.FC = () => {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader size="lg" /></div>}>
            <NewStockAdjustmentContent />
        </Suspense>
    );
};

export default NewStockAdjustment;