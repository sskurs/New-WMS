'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Building2, Plus, Mail, Phone, User, MapPin, Edit } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import CardSkeleton from '@/components/skeletons/CardSkeleton';

const WarehouseManagementPage: React.FC = () => {
    const { warehouseConfigurations, loadWarehouseConfigurations, dataState } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        loadWarehouseConfigurations();
    }, [loadWarehouseConfigurations]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Warehouse Management</h1>
                <Button onClick={() => router.push('/configure/warehouse/new')}>
                    <Plus className="h-4 w-4 mr-2 -ml-1" />
                    Add New Warehouse
                </Button>
            </div>

            {dataState.warehouseConfigurations.loading && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton lineCount={4} />
                    <CardSkeleton lineCount={4} />
                 </div>
            )}

            {!dataState.warehouseConfigurations.loading && warehouseConfigurations.length === 0 && (
                <Card>
                    <CardContent>
                        <EmptyState 
                            icon={Building2}
                            title="No Warehouses Configured"
                            message="Get started by adding your first warehouse configuration."
                            action={{
                                text: 'Add Warehouse',
                                onClick: () => router.push('/configure/warehouse/new')
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            {!dataState.warehouseConfigurations.loading && warehouseConfigurations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {warehouseConfigurations.map(wh => (
                        <Card key={wh.id} className="hover:shadow-lg transition-shadow duration-300">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground">{wh.name}</h2>
                                        <p className="text-sm font-medium text-primary">{wh.code}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/configure/warehouse/${wh.id}/edit`)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-start space-x-3 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{wh.address}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                    <User className="h-4 w-4 shrink-0" />
                                    <span>Manager: {wh.managerName}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                     <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                        <Mail className="h-4 w-4 shrink-0" />
                                        <span>{wh.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4 shrink-0" />
                                        <span>{wh.phone}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WarehouseManagementPage;