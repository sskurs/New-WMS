
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Role } from '@/types';
import UserForm from '@/components/users/UserForm';

const AddUserPage: React.FC = () => {
    const router = useRouter();
    const { addUser } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);
    const availableRoles: Role[] = ['Admin', 'Warehouse Manager', 'Picker', 'Receiver', 'Analyst'];

    const handleSave = async (userData: any) => {
        setIsSaving(true);
        try {
            await addUser(userData);
            router.push('/users');
        } catch (error) {
            // Error toast is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/users');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Add New User</h1>
            <UserForm 
                onSave={handleSave} 
                onCancel={handleCancel} 
                isSaving={isSaving} 
                availableRoles={availableRoles} 
            />
        </div>
    );
};

export default AddUserPage;
