'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { WarehouseConfiguration } from '@/types';
import WarehouseForm from '@/components/configure/WarehouseForm';
import { useToast } from '@/contexts/ToastContext';
import FormSkeleton from '@/components/skeletons/FormSkeleton';

const EditWarehousePage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const warehouseId = params.warehouseId as string;
    const { getWarehouseById, updateWarehouseConfiguration, loadWarehouseConfigurations, dataState } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!dataState.warehouseConfigurations.loaded) {
            loadWarehouseConfigurations();
        }
    }, [dataState.warehouseConfigurations.loaded, loadWarehouseConfigurations]);

    const warehouse = useMemo(() => {
        if (!warehouseId || !dataState.warehouseConfigurations.loaded) {
            return undefined; // loading state
        }
        return getWarehouseById(warehouseId) || null; // found or not-found
    }, [warehouseId, getWarehouseById, dataState.warehouseConfigurations.loaded]);

    useEffect(() => {
        if (dataState.warehouseConfigurations.loaded && warehouse === null) {
            addToast({ type: 'error', message: 'Warehouse not found.' });
            router.replace('/configure/warehouse');
        }
    }, [dataState.warehouseConfigurations.loaded, warehouse, router, addToast]);

    const handleSave = async (configData: Omit<WarehouseConfiguration, 'id'>) => {
        if (!warehouse) return;
        setIsSaving(true);
        try {
            await updateWarehouseConfiguration({ ...warehouse, ...configData });
            router.push('/configure/warehouse');
        } catch (error) {
            // Error is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    if (warehouse === undefined) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-foreground">Edit Warehouse</h1>
                <FormSkeleton />
            </div>
        )
    }

    if (warehouse === null) {
        return null; // Render nothing while redirecting
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Edit Warehouse: {warehouse.name}</h1>
            </div>
            <WarehouseForm
                initialConfig={warehouse}
                onSave={handleSave}
                onCancel={() => router.push('/configure/warehouse')}
                isSaving={isSaving}
            />
        </div>
    );
};

export default EditWarehousePage;