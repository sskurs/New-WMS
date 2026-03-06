'use client';

import React, { useState } from 'react';
import { Permission, Role } from '@/types';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Shield, ShieldCheck } from 'lucide-react';

// --- Data Definitions ---

const permissions: Record<Role, Permission[]> = {
  'Admin': [ 'manageUsers', 'viewReports', 'generateForecasts', 'manageSuppliers', 'managePurchaseOrders', 'manageInventory', 'manageProducts', 'manageAdjustments', 'viewStockLevels', 'viewAlerts', 'manageOperations', 'manageReceiving', 'managePutAway', 'managePicking', 'managePackingShipping', 'manageCycleCounts', 'manageLocations', 'manageOrders', 'manageReturns', 'viewAnalytics', 'viewDashboard', 'manageConfiguration', 'manageUOM', 'managePricing', 'manageWarehouseConfiguration' ],
  'Warehouse Manager': [ 'viewReports', 'manageSuppliers', 'managePurchaseOrders', 'manageInventory', 'manageProducts', 'manageAdjustments', 'viewStockLevels', 'viewAlerts', 'manageOperations', 'manageReceiving', 'managePutAway', 'managePicking', 'managePackingShipping', 'manageCycleCounts', 'manageLocations', 'manageOrders', 'manageReturns', 'viewAnalytics', 'viewDashboard', 'manageConfiguration', 'manageUOM', 'managePricing', 'manageWarehouseConfiguration' ],
  'Picker': [ 'viewDashboard', 'managePicking', 'managePackingShipping' ],
  'Receiver': [ 'viewDashboard', 'manageReceiving', 'managePutAway' ],
  'Analyst': [ 'viewDashboard', 'viewReports', 'generateForecasts', 'viewAnalytics' ],
};

const roles: Role[] = ['Admin', 'Warehouse Manager', 'Picker', 'Receiver', 'Analyst'];

const permissionGroups: Record<string, Permission[]> = {
    'Dashboard': ['viewDashboard'],
    'Inventory': ['manageInventory', 'manageProducts', 'manageAdjustments', 'viewStockLevels', 'viewAlerts'],
    'Operations': ['manageOperations', 'manageReceiving', 'managePutAway', 'managePicking', 'managePackingShipping', 'manageCycleCounts'],
    'Locations': ['manageLocations'],
    'Orders & Returns': ['manageOrders', 'manageReturns'],
    'Suppliers': ['manageSuppliers', 'managePurchaseOrders'],
    'Reporting & Analytics': ['viewReports', 'generateForecasts', 'viewAnalytics'],
    'User Management': ['manageUsers'],
    'System Configuration': ['manageConfiguration', 'manageUOM', 'managePricing', 'manageWarehouseConfiguration'],
};

const allPermissions = Object.values(permissionGroups).flat();

// --- Helper Functions & Components ---

const formatPermissionName = (name: string) => name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled = false }) => (
    <label className="flex items-center space-x-3 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className={`text-sm ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
            {label}
        </span>
    </label>
);

// --- Main Page Component ---

const PermissionsPage: React.FC = () => {
    const [currentPermissions, setCurrentPermissions] = useState(permissions);

    const handlePermissionChange = (role: Role, permission: Permission, isEnabled: boolean) => {
        if (role === 'Admin') return; // Admins cannot have their permissions changed.

        setCurrentPermissions(prev => {
            const rolePermissions = new Set(prev[role]);
            if (isEnabled) {
                rolePermissions.add(permission);
            } else {
                rolePermissions.delete(permission);
            }
            return {
                ...prev,
                [role]: Array.from(rolePermissions)
            };
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Role Permissions</h1>
            <p className="text-muted-foreground">
                View and adjust permissions for each user role. Admin permissions are fixed and cannot be changed.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {roles.map(role => (
                    <Card key={role}>
                        <CardHeader className="flex items-center gap-3">
                            <ShieldCheck className={`w-6 h-6 ${role === 'Admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <h2 className="text-xl font-bold text-foreground">{role}</h2>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
                                <div key={groupName}>
                                    <h3 className="text-md font-semibold text-foreground border-b pb-2 mb-3">{groupName}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        {groupPermissions.map(permission => (
                                            <Checkbox
                                                key={permission}
                                                label={formatPermissionName(permission)}
                                                checked={currentPermissions[role].includes(permission)}
                                                onChange={(isChecked) => handlePermissionChange(role, permission, isChecked)}
                                                disabled={role === 'Admin'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <div className="flex justify-end pt-4">
                <div className="relative group">
                     <Button disabled>
                        Save Changes
                    </Button>
                     <div className="absolute bottom-full mb-2 w-max px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Saving functionality is for demonstration purposes.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PermissionsPage;