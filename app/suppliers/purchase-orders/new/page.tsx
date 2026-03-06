'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { PurchaseOrder } from '@/types';
import PurchaseOrderForm from '@/components/suppliers/PurchaseOrderForm';
import Loader from '@/components/ui/Loader';

const NewPurchaseOrderContent: React.FC = () => {
    const { addPurchaseOrder } = useAppContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSaving, setIsSaving] = useState(false);

    const initialSupplierId = searchParams.get('supplierId');
    const initialProductId = searchParams.get('productId');

    const handleSave = async (poData: Partial<Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>>) => {
        setIsSaving(true);
        try {
            await addPurchaseOrder(poData as Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>);
            router.push('/suppliers/purchase-orders');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Create Purchase Order</h1>
            <PurchaseOrderForm
                onSave={handleSave}
                onCancel={() => router.push('/suppliers/purchase-orders')}
                isSaving={isSaving}
                initialSupplierId={initialSupplierId}
                initialProductId={initialProductId}
            />
        </div>
    );
};

const NewPurchaseOrderPage: React.FC = () => {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader size="lg" /></div>}>
            <NewPurchaseOrderContent />
        </Suspense>
    );
}

export default NewPurchaseOrderPage;