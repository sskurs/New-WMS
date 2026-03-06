
'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseConfiguration } from '@/types';
import Card, { CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/contexts/ToastContext';
import { indianStates, indianStatesAndCities } from '@/data/indian-states-cities';

interface WarehouseFormProps {
    initialConfig?: WarehouseConfiguration;
    onSave: (config: Omit<WarehouseConfiguration, 'id'>) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const WarehouseForm: React.FC<WarehouseFormProps> = ({ initialConfig, onSave, onCancel, isSaving }) => {
    const { addToast } = useToast();
    const [config, setConfig] = useState(initialConfig || {
        pkWarehouseId: '',
        name: '',
        warehouseType: 'Distribution Center',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pin: '',
        address: '' // Keep for type compatibility, but won't be used in form
    });
    
    const [citiesForSelectedState, setCitiesForSelectedState] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    useEffect(() => {
        if (initialConfig) {
            setConfig({
                ...initialConfig,
                name: initialConfig.name || initialConfig.warehouseName || '',
            });
            if (initialConfig.state) {
                setCitiesForSelectedState(indianStatesAndCities[initialConfig.state] || []);
            }
        }
    }, [initialConfig]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        setConfig(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'state') {
                newState.city = '';
                setCitiesForSelectedState(indianStatesAndCities[value] || []);
            }
            if (name === 'phone' || name === 'pin') {
                 const numericValue = value.replace(/[^0-9]/g, '');
                 const maxLength = name === 'phone' ? 10 : 6;
                 newState[name as 'phone' | 'pin'] = numericValue.slice(0, maxLength);
            }
            return newState;
        });

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!config.name.trim()) newErrors.name = "Warehouse Name is required.";
        if (!config.warehouseType?.trim()) newErrors.warehouseType = "Warehouse Type is required.";
        if (!config.phone?.trim()) newErrors.phone = "Phone number is required.";
        else if (config.phone.trim().length !== 10) newErrors.phone = "Phone number must be 10 digits.";
        if (!config.addressLine1?.trim()) newErrors.addressLine1 = "Address Line 1 is required.";
        if (!config.state) newErrors.state = "State is required.";
        if (!config.city) newErrors.city = "City is required.";
        if (!config.pin?.trim()) newErrors.pin = "PIN code is required.";
        else if (config.pin.trim().length !== 6) newErrors.pin = "PIN code must be 6 digits.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(config);
        } else {
            addToast({ type: 'error', message: "Please fill all required fields correctly." });
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input id="name" name="name" label="Warehouse Name" value={config.name} onChange={handleChange} required error={errors.name} />
                        <Select id="warehouseType" name="warehouseType" label="Warehouse Type" value={config.warehouseType} onChange={handleChange} required error={errors.warehouseType}>
                            <option>Distribution Center</option>
                            <option>Fulfillment Center</option>
                            <option>Retail Store</option>
                            <option>Cold Storage</option>
                            <option>General</option>
                        </Select>
                    </div>
                     <Input id="phone" name="phone" label="Phone Number" type="tel" value={config.phone || ''} onChange={handleChange} required error={errors.phone} />
                    
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-medium text-foreground">Address</h3>
                        <div className="mt-4 space-y-4">
                            <Input id="addressLine1" name="addressLine1" label="Address Line 1" value={config.addressLine1 || ''} onChange={handleChange} required error={errors.addressLine1} />
                            <Input id="addressLine2" name="addressLine2" label="Address Line 2 (Optional)" value={config.addressLine2 || ''} onChange={handleChange} />
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Select id="state" name="state" label="State" value={config.state || ''} onChange={handleChange} required error={errors.state}>
                                    <option value="" disabled>Select a state</option>
                                    {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                                <Select id="city" name="city" label="City" value={config.city || ''} onChange={handleChange} required disabled={!config.state} error={errors.city}>
                                    <option value="" disabled>{config.state ? "Select a city" : "Select a state first"}</option>
                                    {citiesForSelectedState.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                                <Input id="pin" name="pin" label="PIN Code" type="tel" value={config.pin || ''} onChange={handleChange} required error={errors.pin} />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" loading={isSaving}>
                        {initialConfig ? 'Save Changes' : 'Create Warehouse'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default WarehouseForm;