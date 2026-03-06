'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Order, OrderItem } from '@/types';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { useToast } from '@/contexts/ToastContext';
import { Trash2, Plus, AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Table from '@/components/ui/Table';
import { indianStates, indianStatesAndCities } from '@/data/indian-states-cities';
import { validateCustomerName } from '@/services/geminiService';

interface OrderItemWithStock extends OrderItem {
    availableStock: number;
}

interface OrderItemWithStockAndLoading extends OrderItemWithStock {
    isLoadingPrice?: boolean;
}


interface FormErrors {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: {
        address1?: string;
        address2?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
    items?: (string | undefined)[];
    general?: string;
}

const NewOrderPage: React.FC = () => {
    const router = useRouter();
    const { 
        products, addOrder, getStockForProduct,
        loadProducts, loadStocks, dataState, fetchPricingRuleById
    } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const [customerName, setCustomerName] = useState('');
    const [nameValidation, setNameValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message?: string }>({ status: 'idle' });
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [priority, setPriority] = useState<Order['priority']>('Medium');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<OrderItemWithStockAndLoading[]>([]);
    
    useEffect(() => {
        loadProducts(true);
        loadStocks(true);
    }, [loadProducts, loadStocks]);
    
    const [citiesForSelectedState, setCitiesForSelectedState] = useState<string[]>([]);

    const [shippingAddress, setShippingAddress] = useState({
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
    });

    const productOptions = useMemo((): SelectOption[] => {
        return products.map(p => ({
            value: p.id,
            label: p.name,
            description: `SKU: ${p.sku} | ₹${p.price.toLocaleString('en-IN')}`
        }));
    }, [products]);

    const handleShippingAddressChange = (field: keyof typeof shippingAddress, value: string) => {
        setShippingAddress(prev => {
            if (field === 'state') {
                setCitiesForSelectedState(indianStatesAndCities[value as keyof typeof indianStatesAndCities] || []);
                return { ...prev, state: value, city: '' }; // Reset city when state changes
            }
            if (field === 'zipCode') {
                const numericValue = value.replace(/[^0-9]/g, '');
                if (numericValue.length <= 6) {
                    return { ...prev, zipCode: numericValue };
                }
                return prev;
            }
            return { ...prev, [field]: value };
        });
    
        // Clear validation error for the field being changed, and for city if state changes
        setErrors(prevErrors => {
            if (!prevErrors.shippingAddress) {
                return prevErrors;
            }
    
            const newShippingErrors = { ...prevErrors.shippingAddress };
            let errorsWereCleared = false;
            
            if (newShippingErrors[field as keyof typeof newShippingErrors]) {
                delete newShippingErrors[field as keyof typeof newShippingErrors];
                errorsWereCleared = true;
            }
    
            if (field === 'state' && newShippingErrors.city) {
                delete newShippingErrors.city;
                errorsWereCleared = true;
            }
            
            if (!errorsWereCleared) {
                return prevErrors;
            }
            
            if (Object.keys(newShippingErrors).length === 0) {
                const { shippingAddress, ...rest } = prevErrors;
                return rest;
            }
    
            return { ...prevErrors, shippingAddress: newShippingErrors };
        });
    };

    const handleAddItem = () => {
        setItems([...items, { productId: '', quantity: 1, price: 0, availableStock: 0 }]);
    };
    
    const validateAndSetErrors = (currentItems: OrderItemWithStockAndLoading[]) => {
        const newItemsErrors = currentItems.map(item => {
            if (!item.productId) return undefined; // No error if no product selected
            if (item.quantity <= 0) return 'Quantity must be at least 1.';
            if (item.quantity > item.availableStock) return `Insufficient stock. Only ${item.availableStock} available.`;
            return undefined;
        });
        setErrors(prev => ({ ...prev, items: newItemsErrors }));
    };

    const handleItemChange = (index: number, field: keyof OrderItemWithStockAndLoading, value: string | number) => {
        if (field === 'productId') {
            const newProductId = value as string;

            if (newProductId && items.some((item, i) => item.productId === newProductId && i !== index)) {
                addToast({ type: 'error', message: 'This product is already added to the order.' });
                return;
            }

            const product = products.find(p => p.id === newProductId);
            if (product) {
                const productStocks = getStockForProduct(product.id);
                const availableStock = productStocks.reduce((sum, s) => sum + s.quantity, 0);
                
                setItems(prevItems => {
                    const newItems = [...prevItems];
                    newItems[index] = {
                        productId: newProductId,
                        quantity: 1,
                        price: product.price,
                        availableStock: availableStock,
                        isLoadingPrice: true,
                    };
                    return newItems;
                });
                
                (async () => {
                    let finalPrice = product.price;
                    const rule = await fetchPricingRuleById(product.pricingRuleId || '0');
                    if (rule && rule.isActive && rule.discountPercentage && rule.discountPercentage > 0) {
                        finalPrice = product.price * (1 - (rule.discountPercentage / 100));
                        addToast({ type: 'info', message: `Applied '${rule.name}' (${rule.discountPercentage}% off) to ${product.name}.` });
                    }

                    setItems(prevItems => {
                        const finalItems = [...prevItems];
                        if (finalItems[index] && finalItems[index].productId === newProductId) {
                             finalItems[index] = {
                                ...finalItems[index],
                                price: parseFloat(finalPrice.toFixed(2)),
                                isLoadingPrice: false,
                            };
                            validateAndSetErrors(finalItems);
                        }
                        return finalItems;
                    });
                })();
            } else {
                setItems(prevItems => {
                    const newItems = [...prevItems];
                    newItems[index] = { productId: '', quantity: 1, price: 0, availableStock: 0 };
                    validateAndSetErrors(newItems);
                    return newItems;
                });
            }
        } else if (field === 'quantity') {
            const sanitizedValue = String(value).replace(/[^0-9]/g, '');
            const newQuantity = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10);
            setItems(prevItems => {
                const newItems = [...prevItems];
                newItems[index] = { ...newItems[index], quantity: newQuantity };
                validateAndSetErrors(newItems);
                return newItems;
            });
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        setErrors(prevErrors => {
            if (!prevErrors.items) return prevErrors;
            const newItemsErrors = [...prevErrors.items];
            newItemsErrors.splice(index, 1);
            return { ...prevErrors, items: newItemsErrors };
        });
    };

    const handleEmailBlur = () => {
        if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            setErrors(prev => ({ ...prev, customerEmail: 'Please enter a valid email address.' }));
        } else {
            setErrors(prev => ({ ...prev, customerEmail: undefined }));
        }
    };

    const handlePhoneBlur = () => {
        if (customerPhone && customerPhone.length !== 10) {
            setErrors(prev => ({ ...prev, customerPhone: 'Phone number must be exactly 10 digits.' }));
        } else {
            setErrors(prev => ({ ...prev, customerPhone: undefined }));
        }
    };

    const handleNameValidation = async () => {
        const trimmedName = customerName.trim();
        if (!trimmedName) {
            setNameValidation({ status: 'idle' });
            setErrors(prev => ({ ...prev, customerName: undefined }));
            return;
        }
        
        setNameValidation({ status: 'loading' });
        try {
            const result = await validateCustomerName(trimmedName);
            if (result.isValid) {
                setNameValidation({ status: 'valid' });
                setErrors(prev => ({ ...prev, customerName: undefined }));
            } else {
                const message = result.reason || 'Invalid name provided.';
                setNameValidation({ status: 'invalid', message: message });
                setErrors(prev => ({ ...prev, customerName: message }));
            }
        } catch (error) {
            console.error("Name validation failed:", error);
            setNameValidation({ status: 'idle' });
            addToast({ type: 'info', message: 'Could not perform AI name validation. Please proceed.' });
        }
    };
    
    const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerName(e.target.value);
        if (nameValidation.status !== 'idle') {
            setNameValidation({ status: 'idle' });
        }
        if (errors.customerName) {
            setErrors(prev => ({ ...prev, customerName: undefined }));
        }
    };

    const validateForm = () => {
        const newErrors: FormErrors = { items: [] };
        let isValid = true;
        
        // Customer Info
        if (!customerName.trim()) {
            newErrors.customerName = 'Customer name is required.';
            isValid = false;
        } else if (nameValidation.status === 'invalid') {
            newErrors.customerName = nameValidation.message || 'Please enter a valid name.';
            isValid = false;
        } else if (nameValidation.status === 'loading') {
            newErrors.customerName = 'Please wait for name validation to complete.';
            isValid = false;
        }

        if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            newErrors.customerEmail = 'Please enter a valid email address.';
            isValid = false;
        }

        if (customerPhone && customerPhone.length !== 10) {
            newErrors.customerPhone = 'Phone number must be exactly 10 digits.';
            isValid = false;
        }

        // Shipping Address
        newErrors.shippingAddress = {};
        if (!shippingAddress.address1.trim()) {
            newErrors.shippingAddress.address1 = 'Address Line 1 is required.';
            isValid = false;
        }
        if (!shippingAddress.address2.trim()) {
            newErrors.shippingAddress.address2 = 'Address Line 2 is required.';
            isValid = false;
        }
        if (!shippingAddress.city.trim()) {
            newErrors.shippingAddress.city = 'City is required.';
            isValid = false;
        }
        if (!shippingAddress.state.trim()) {
            newErrors.shippingAddress.state = 'State is required.';
            isValid = false;
        }
        if (!shippingAddress.zipCode.trim()) {
            newErrors.shippingAddress.zipCode = 'Zip Code is required.';
            isValid = false;
        } else if (shippingAddress.zipCode.trim().length !== 6) {
            newErrors.shippingAddress.zipCode = 'Zip Code must be 6 digits.';
            isValid = false;
        }
        if (Object.keys(newErrors.shippingAddress).length === 0) {
            delete newErrors.shippingAddress;
        }

        // Items
        if (items.length === 0) {
            newErrors.general = 'Please add at least one item to the order.';
            isValid = false;
        } else {
            items.forEach((item, index) => {
                if (!item.productId) {
                    newErrors.items![index] = 'Please select a product.';
                    isValid = false;
                } else if (item.quantity <= 0) {
                    newErrors.items![index] = 'Quantity must be at least 1.';
                    isValid = false;
                } else if (item.quantity > item.availableStock) {
                    newErrors.items![index] = `Insufficient stock. Only ${item.availableStock} available.`;
                    isValid = false;
                } else {
                     newErrors.items![index] = undefined;
                }
            });
            if (newErrors.items!.every(e => e === undefined)) {
                delete newErrors.items;
            }
        }
        
        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            addToast({ type: 'error', message: "Please fix the errors before submitting." });
            return;
        }

        setIsSaving(true);
        const orderData: Omit<Order, 'id'|'status'|'createdAt'|'updatedAt'> = {
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress,
            items: items.map(({ availableStock, isLoadingPrice, ...item }) => item), // Remove client-side fields
            priority,
            notes
        };

        try {
            await addOrder(orderData);
            router.push('/orders/processing');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
            console.error("Failed to place order:", errorMessage);
            setErrors(prev => ({ ...prev, general: errorMessage }));
        } finally {
            setIsSaving(false);
        }
    };
    
    const totalValue = items.reduce((acc: number, item) => acc + (item.price * item.quantity), 0);

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Create New Order</h1>
            </div>

            {errors.general && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Could not place order</p>
                        <p className="text-sm">{errors.general}</p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Order Details</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Enter customer, shipping, and order specific details.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Customer and Order Info section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="relative">
                            <Input 
                                id="customerName" 
                                label="Customer Name" 
                                placeholder="Enter customer name"
                                value={customerName}
                                onChange={handleCustomerNameChange}
                                onBlur={handleNameValidation}
                                error={errors.customerName}
                                required
                            />
                            <div className="absolute top-9 right-3 flex items-center">
                                {nameValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                {nameValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                {nameValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>
                        </div>
                        <Input 
                            id="customerEmail" 
                            label="Email Address" 
                            type="email"
                            placeholder="customer@example.com"
                            value={customerEmail}
                            onChange={(e) => {
                                setCustomerEmail(e.target.value);
                                if (errors.customerEmail) setErrors(p => ({ ...p, customerEmail: undefined }));
                            }}
                            onBlur={handleEmailBlur}
                            error={errors.customerEmail}
                        />
                        <Input 
                            id="customerPhone" 
                            label="Phone Number" 
                            type="tel"
                            placeholder="Enter 10-digit phone number"
                            value={customerPhone}
                            onChange={(e) => {
                                setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''));
                                if (errors.customerPhone) setErrors(p => ({ ...p, customerPhone: undefined }));
                            }}
                            onBlur={handlePhoneBlur}
                            error={errors.customerPhone}
                            maxLength={10}
                        />
                        <Select
                            id="priority"
                            label="Priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Order['priority'])}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </Select>
                        <div className="md:col-span-2 lg:col-span-2">
                             <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Order Notes</label>
                            <textarea
                                id="notes"
                                rows={1}
                                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 transition-colors duration-150"
                                placeholder="Instructions..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Shipping Address section */}
                    <div className="pt-6 border-t border-border">
                        <h3 className="text-md font-medium text-slate-800 dark:text-slate-100 mb-4">Shipping Address (India)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input id="address1" label="Address Line 1" value={shippingAddress.address1} onChange={e => handleShippingAddressChange('address1', e.target.value)} error={errors.shippingAddress?.address1} required />
                            <Input id="address2" label="Address Line 2" value={shippingAddress.address2} onChange={e => handleShippingAddressChange('address2', e.target.value)} error={errors.shippingAddress?.address2} required />
                             <Select id="state" label="State / Province" value={shippingAddress.state} onChange={e => handleShippingAddressChange('state', e.target.value)} error={errors.shippingAddress?.state} required>
                                <option value="" disabled>Select a state</option>
                                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                             <Select id="city" label="City" value={shippingAddress.city} onChange={e => handleShippingAddressChange('city', e.target.value)} error={errors.shippingAddress?.city} required disabled={!shippingAddress.state}>
                                <option value="" disabled>{shippingAddress.state ? "Select a city" : "Select a state first"}</option>
                                {citiesForSelectedState.map(c => <option key={c} value={c}>{c}</option>)}
                            </Select>
                            <Input id="zipCode" label="Zip / Postal Code" value={shippingAddress.zipCode} onChange={e => handleShippingAddressChange('zipCode', e.target.value)} error={errors.shippingAddress?.zipCode} required type="tel" pattern="[0-9]{6}" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-medium">Order Items</h2>
                </CardHeader>
                <CardContent>
                    {/* Note: Standard absolute-positioned elements like SearchableSelect 
                        get clipped by 'overflow-x-auto'. Using 'overflow-x-visible' 
                        instead, with Table handles responsiveness. */}
                    <div className="overflow-x-visible">
                        <Table headers={['Product', 'Available Stock', 'Quantity', 'Unit Price', 'Total', '']}>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-1 py-2 w-2/5 min-w-[250px]">
                                        <SearchableSelect 
                                            id={`item-prod-${index}`} 
                                            value={item.productId} 
                                            options={productOptions}
                                            onChange={val => handleItemChange(index, 'productId', val)} 
                                            error={errors.items?.[index]} 
                                            disabled={!dataState.products.loaded}
                                            loading={dataState.products.loading}
                                            placeholder="Search product..."
                                        />
                                    </td>
                                     <td className="px-1 py-2">
                                        <p className={`text-sm text-center ${item.availableStock < item.quantity ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>{item.availableStock}</p>
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
                                            error={errors.items?.[index]}
                                        />
                                    </td>
                                    <td className="px-1 py-2 text-sm text-muted-foreground whitespace-nowrap">
                                        {item.isLoadingPrice ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : `₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </td>
                                    <td className="px-1 py-2 text-sm font-medium text-foreground whitespace-nowrap">
                                        {item.isLoadingPrice ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : `₹${(item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </td>
                                    <td className="px-1 py-2 text-right">
                                        <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                    </div>
                    <div className="flex justify-between items-center pt-4 mt-4 border-t">
                        <Button variant="secondary" onClick={handleAddItem} id="add-order-item-button">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Grand Total</p>
                            <p className="text-2xl font-bold text-foreground">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end items-center gap-3 pt-6 border-t border-border mt-8">
                <Button variant="secondary" onClick={() => router.push('/orders/processing')}>Cancel</Button>
                <Button id="place-order-button" onClick={handleSave} loading={isSaving}>Place Order</Button>
            </div>
        </div>
    );
};

export default NewOrderPage;