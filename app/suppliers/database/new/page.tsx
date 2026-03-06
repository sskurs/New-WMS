'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Supplier } from '@/types';
import SupplierForm from '@/components/suppliers/SupplierForm';

const AddSupplierPage: React.FC = () => {
    const router = useRouter();
    const { addSupplier } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (supplierData: Partial<Supplier>) => {
        setIsSaving(true);
        try {
            await addSupplier(supplierData as Omit<Supplier, 'id'>);
            router.push('/suppliers/database');
        } catch (error) {
            // Error toast is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold text-foreground mb-6">Add New Supplier</h1>
            <SupplierForm
                onSave={handleSave}
                onCancel={() => router.push('/suppliers/database')}
                isSaving={isSaving}
            />
        </div>
    );
};

export default AddSupplierPage;