
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Role, User } from '@/types';
import EditUserForm from '@/components/users/EditUserForm';
import { useToast } from '@/contexts/ToastContext';

const EditUserPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const userId = params.userId as string;
    const { fetchUserById, updateUser } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const availableRoles: Role[] = ['Admin', 'Warehouse Manager', 'Picker', 'Receiver', 'Analyst'];

    useEffect(() => {
        if (userId) {
            setIsLoading(true);
            fetchUserById(userId)
                .then(foundUser => {
                    if (foundUser) {
                        setUser(foundUser);
                    } else {
                        // Error toast is handled in the context, which shows "User not found or failed to load."
                        router.replace('/users');
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [userId, fetchUserById, router]);


    const handleSave = async (userData: User) => {
        setIsSaving(true);
        try {
            await updateUser(userData);
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

    if (isLoading || !user) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Loading user details...
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Edit User: {user.name}</h1>
            <EditUserForm
                initialUser={user}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
                availableRoles={availableRoles}
            />
        </div>
    );
};

export default EditUserPage;