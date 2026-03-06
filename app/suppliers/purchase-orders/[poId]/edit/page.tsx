
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { PurchaseOrder } from '@/types';
import PurchaseOrderForm from '@/components/suppliers/PurchaseOrderForm';
import { useToast } from '@/contexts/ToastContext';
import FormSkeleton from '@/components/skeletons/FormSkeleton';
import { getPurchaseOrderById as getPurchaseOrderByIdAPI } from '@/api/suppliersApi';

const EditPurchaseOrderPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const poId = params.poId as string;
    const { updatePurchaseOrder } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (poId) {
            setIsLoading(true);
            getPurchaseOrderByIdAPI(poId)
                .then(po => {
                    if (po) {
                        setPurchaseOrder(po);
                    } else {
                        addToast({ type: 'error', message: 'Purchase Order not found.' });
                        router.replace('/suppliers/purchase-orders');
                    }
                })
                .catch(error => {
                    addToast({ type: 'error', message: (error as Error).message || 'Failed to fetch PO.' });
                    router.replace('/suppliers/purchase-orders');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [poId, router, addToast]);

    const handleSave = async (poData: Partial<PurchaseOrder>) => {
        setIsSaving(true);
        try {
            await updatePurchaseOrder(poData as PurchaseOrder);
            addToast({ type: 'success', message: 'Purchase Order updated successfully!' });
            router.push('/suppliers/purchase-orders');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading || !purchaseOrder) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-foreground">Edit Purchase Order</h1>
                <FormSkeleton />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Edit Purchase Order #{purchaseOrder.poNumber}</h1>
            <PurchaseOrderForm
                initialPO={purchaseOrder}
                onSave={handleSave}
                onCancel={() => router.push('/suppliers/purchase-orders')}
                isSaving={isSaving}
            />
        </div>
    );
};

export default EditPurchaseOrderPage;
