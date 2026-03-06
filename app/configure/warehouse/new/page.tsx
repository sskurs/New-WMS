'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { WarehouseConfiguration } from '@/types';
import WarehouseForm from '@/components/configure/WarehouseForm';

const NewWarehousePage: React.FC = () => {
    const router = useRouter();
    const { addWarehouse } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (configData: Omit<WarehouseConfiguration, 'id'>) => {
        setIsSaving(true);
        try {
            await addWarehouse(configData);
            router.push('/configure/warehouse');
        } catch (error) {
            // Error is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/configure/warehouse');
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Create New Warehouse</h1>
            </div>
            <WarehouseForm
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
            />
        </div>
    );
};

export default NewWarehousePage;