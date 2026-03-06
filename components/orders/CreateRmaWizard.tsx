'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import { Order, Product, RMA, RMAReason, RMAResolution, OrderItem } from '@/types';
import Card, { CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ImageUploader from '@/components/inventory/ImageUploader';
import { ArrowLeft, Check, ChevronRight, Package, Search } from 'lucide-react';
import { formatDateTime } from '@/api/utils';

interface WizardProps {
    onCancel: () => void;
    onSuccess: () => void;
}

interface RmaItemSelection {
    productId: string;
    quantity: number;
    maxQuantity: number;
    price: number;
}

const Stepper = ({ currentStep }: { currentStep: number }) => {
    const steps = ['Select Order', 'Select Items', 'Provide Details'];
    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                        {stepIdx < currentStep ? (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-primary" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                                </div>
                                <span className="block mt-2 text-sm font-medium text-foreground">{step}</span>
                            </>
                        ) : stepIdx === currentStep ? (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                                    <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                                </div>
                                <span className="block mt-2 text-sm font-medium text-primary">{step}</span>
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                                </div>
                                <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
                                    <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                                </div>
                                <span className="block mt-2 text-sm font-medium text-muted-foreground">{step}</span>
                            </>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};


const CreateRmaWizard: React.FC<WizardProps> = ({ onCancel, onSuccess }) => {
    const { orders, getProductById, createRma, loadOrders, loadProducts, dataState, rmas, loadRmas } = useAppContext();
    const { addToast } = useToast();

    const [step, setStep] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedItems, setSelectedItems] = useState<Record<string, RmaItemSelection>>({});
    
    const [returnReason, setReturnReason] = useState<RMAReason>('Defective Product');
    const [priority, setPriority] = useState<Order['priority']>('Medium');
    const [preferredResolution, setPreferredResolution] = useState<RMAResolution>('Full Refund');
    const [detailedDescription, setDetailedDescription] = useState('');
    const [photo, setPhoto] = useState<string>('');
    const [contactPhone, setContactPhone] = useState('');
    const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadOrders();
        loadProducts();
        loadRmas();
    }, [loadOrders, loadProducts, loadRmas]);

    const isDataReady = useMemo(() => dataState.orders.loaded && dataState.products.loaded && dataState.rmas.loaded, [dataState.orders, dataState.products, dataState.rmas]);

    const eligibleOrders = useMemo(() => {
        if (!isDataReady) return [];

        const shippedAndCompletedOrders = orders.filter(o => 
            ['Shipped', 'Completed'].includes(o.status)
        );

        // RESTRICTION: Only one RMA per order.
        // Filter out orders that already have an entry in the 'rmas' list.
        const ordersWithoutExistingRma = shippedAndCompletedOrders.filter(order => {
            const hasExistingRma = rmas.some(rma => rma.orderId === order.id);
            return !hasExistingRma;
        });

        // Now filter by search term
        return ordersWithoutExistingRma.filter(o => 
            o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );

    }, [isDataReady, orders, rmas, searchTerm]);

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
        setContactPhone(order.customerPhone || '');
        
        // Since we now restrict to only ONE RMA per order, 
        // we can assume 0 items have been returned previously for this order.
        const initialItems = order.items.reduce((acc, orderItem: OrderItem) => {
            acc[orderItem.productId] = { 
                productId: orderItem.productId, 
                quantity: orderItem.quantity, // Default to full qty
                maxQuantity: orderItem.quantity, 
                price: orderItem.price 
            };
            return acc;
        }, {} as Record<string, RmaItemSelection>);
        
        setSelectedItems(initialItems);
        setStep(1);
    };

    const handleItemQuantityChange = (productId: string, quantity: number) => {
        const item: RmaItemSelection | undefined = selectedItems[productId];
        if (item) {
            const newQuantity = Math.max(0, Math.min(quantity, item.maxQuantity));
            setSelectedItems(prev => ({
                ...prev,
                [productId]: { ...item, quantity: newQuantity }
            }));
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, ''); // Allow only numbers
        if (value.length <= 10) {
            setContactPhone(value);
            if (phoneError) {
                // Clear error as user is typing
                if (value.length === 10 || value.length === 0) {
                    setPhoneError(undefined);
                } else {
                    setPhoneError('Phone number must be exactly 10 digits.');
                }
            }
        }
    };

    const handlePhoneBlur = () => {
        if (contactPhone && contactPhone.length !== 10) {
            setPhoneError('Phone number must be exactly 10 digits.');
        } else {
            setPhoneError(undefined);
        }
    };
    
    const handleSubmit = async () => {
        if (!selectedOrder) return;

        if (contactPhone && contactPhone.length !== 10) {
            setPhoneError('Phone number must be exactly 10 digits.');
            addToast({type: 'error', message: 'Please provide a valid 10-digit phone number.'});
            return;
        }
        
        const allSelectedItems: RmaItemSelection[] = Object.values(selectedItems);
        const itemsToReturn = allSelectedItems
            .filter((item: RmaItemSelection) => item.quantity > 0)
            .map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                itemId: `new-${item.productId}`,
                recordId: 'new',
            }));

        if(itemsToReturn.length === 0) {
            addToast({type: 'error', message: 'Please select at least one item with a quantity to return.'});
            return;
        }

        setIsSaving(true);
        const rmaData: Omit<RMA, 'id'|'status'|'createdAt'|'refundAmount'> = {
            orderId: selectedOrder.id,
            items: itemsToReturn,
            reason: returnReason,
            preferredResolution,
            detailedDescription,
            photos: photo ? [photo] : [],
            contactPhone,
            priority
        };
        try {
            await createRma(rmaData);
            onSuccess();
        } catch(e) {
            // Toast is handled in context
        } finally {
            setIsSaving(false);
        }
    };
    
    const reasonOptions: RMAReason[] = ['Defective Product', 'Wrong Item', 'Not as Described', 'Customer Changed Mind', 'Size/Fit Issue', 'Quality Issue', 'Other'];
    const resolutionOptions: RMAResolution[] = ['Full Refund', 'Exchange', 'Store Credit', 'Repair'];
    const priorityOptions: Order['priority'][] = ['Low', 'Medium', 'High'];

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <div className="space-y-4">
                        <div className="relative">
                            <Input
                                id="order-search"
                                placeholder="Search by Order ID or Customer Name"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                            {eligibleOrders.length > 0 ? (
                                <ul className="divide-y divide-border">
                                    {eligibleOrders.map(order => (
                                        <li key={order.id} onClick={() => handleSelectOrder(order)} className="p-4 hover:bg-accent cursor-pointer flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-foreground">Order {order.id}</p>
                                                <p className="text-sm text-muted-foreground">{order.customerName}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center p-8 text-muted-foreground">{!isDataReady ? "Loading orders..." : "No eligible orders found (only orders without existing RMAs are shown)."}</p>
                            )}
                        </div>
                    </div>
                );
            case 1:
                if (!selectedOrder) return null;
                return (
                    <div className="space-y-4">
                        <h3 className="font-medium text-foreground">Select items to return from order {selectedOrder.id}</h3>
                        <div className="max-h-96 overflow-y-auto border rounded-lg divide-y divide-border">
                            {Object.values(selectedItems).length > 0 ? (
                                Object.values(selectedItems).map((rmaItem: RmaItemSelection) => {
                                    const product = getProductById(rmaItem.productId);
                                    return (
                                        <div key={rmaItem.productId} className="flex items-center p-4">
                                            <div className="flex-shrink-0 h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                                                {product?.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-md"/> : <Package className="h-6 w-6 text-muted-foreground"/>}
                                            </div>
                                            <div className="ml-4 flex-grow">
                                                <p className="font-medium text-foreground">{product?.name}</p>
                                                <p className="text-sm text-muted-foreground">Price: ₹{rmaItem.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="w-28">
                                                <Input 
                                                    id={`qty-${rmaItem.productId}`}
                                                    label="Return Qty"
                                                    type="number"
                                                    value={rmaItem.quantity ?? 0}
                                                    onChange={e => handleItemQuantityChange(rmaItem.productId, parseInt(e.target.value, 10))}
                                                    max={rmaItem.maxQuantity}
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center p-8 text-muted-foreground">No returnable items found in this order.</p>
                            )}
                        </div>
                    </div>
                );
            case 2:
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-6">
                            <Select id="returnReason" label="Reason for Return" value={returnReason} onChange={e => setReturnReason(e.target.value as RMAReason)}>
                                {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                            <Select id="resolution" label="Preferred Resolution" value={preferredResolution} onChange={e => setPreferredResolution(e.target.value as RMAResolution)}>
                                {resolutionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                             <Select id="priority" label="Priority" value={priority} onChange={e => setPriority(e.target.value as Order['priority'])}>
                                {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                            </Select>
                             <Input 
                                id="contactPhone" 
                                label="Contact Phone" 
                                value={contactPhone} 
                                onChange={handlePhoneChange} 
                                onBlur={handlePhoneBlur}
                                error={phoneError}
                                maxLength={10}
                                placeholder="Enter 10-digit number"
                             />
                        </div>
                         <div className="space-y-6">
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1.5">Detailed Description</label>
                                <textarea
                                    id="description"
                                    rows={4}
                                    className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                                    value={detailedDescription}
                                    onChange={e => setDetailedDescription(e.target.value)}
                                />
                            </div>
                           <ImageUploader onImageChange={(base64) => setPhoto(base64)} />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <Card>
            <CardHeader className="border-b">
                <h1 className="text-xl font-semibold text-foreground">Create New Return (RMA)</h1>
                <p className="text-sm text-muted-foreground">Follow the steps to log a customer return request.</p>
                <div className="mt-6">
                    <Stepper currentStep={step} />
                </div>
            </CardHeader>
            <CardContent className="py-6 min-h-[30rem]">
                {renderStepContent()}
            </CardContent>
            <CardFooter className="flex justify-between">
                <div>
                     {step > 0 ? (
                        <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                </div>

                <div>
                    {step < 2 && (
                         <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && Object.values(selectedItems).every(i => (i as RmaItemSelection).quantity === 0)}>
                            Next
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                    {step === 2 && (
                        <Button onClick={handleSubmit} loading={isSaving}>
                            Submit RMA
                        </Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
};

export default CreateRmaWizard;