'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Supplier } from '@/types';
import SupplierForm from '@/components/suppliers/SupplierForm';
import { useToast } from '@/contexts/ToastContext';

const EditSupplierPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const supplierId = params.supplierId as string;
    const { getSupplierById, updateSupplier, loadSuppliers, dataState } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!dataState.suppliers.loaded) {
            loadSuppliers();
        }
    }, [dataState.suppliers.loaded, loadSuppliers]);
    
    const supplier = useMemo(() => {
        if (!supplierId || !dataState.suppliers.loaded) {
            return undefined; // loading
        }
        return getSupplierById(supplierId) || null; // found or not-found
    }, [supplierId, getSupplierById, dataState.suppliers.loaded]);

    useEffect(() => {
        if (supplierId && dataState.suppliers.loaded && supplier === null) {
            addToast({ type: 'error', message: 'Supplier not found.' });
            router.replace('/suppliers/database');
        }
    }, [dataState.suppliers.loaded, supplier, router, supplierId, addToast]);

    const handleSave = async (supplierData: Partial<Supplier>) => {
        setIsSaving(true);
        try {
            await updateSupplier(supplierData as Supplier);
            router.push('/suppliers/database');
        } catch (error) {
            // Error toast is handled in context
        } finally {
            setIsSaving(false);
        }
    };
    
    if (supplier === undefined) {
        return <div className="p-8 text-center text-muted-foreground">Loading supplier details...</div>
    }

    if (supplier === null) {
        return null; // Render nothing during redirect
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold text-foreground mb-6">Edit Supplier: {supplier.name}</h1>
            <SupplierForm
                initialSupplier={supplier}
                onSave={handleSave}
                onCancel={() => router.push('/suppliers/database')}
                isSaving={isSaving}
            />
        </div>
    );
};

export default EditSupplierPage;