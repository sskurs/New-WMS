'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Location, LocationStatus, LocationType } from '@/types';
import Card, { CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/contexts/ToastContext';
import FormSkeleton from '@/components/skeletons/FormSkeleton';
import { getCoordinatesFromAddress, suggestLocationCode, suggestLocationName, validateLocationCode, validateLocationName } from '@/services/geminiService';
import { MapPin, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';

const staticWarehouses = [
    { id: '1000', name: 'Mumbai Central Warehouse' },
    { id: '1001', name: 'Delhi North Hub' },
    { id: '1002', name: 'Bangalore South Depot' },
    { id: '1003', name: 'Kolkata East Hub' },
];

interface FormErrors {
    code?: string;
    name?: string;
    zone?: string;
    warehouseId?: string;
    capacity?: string;
    latitude?: string;
    longitude?: string;
}

const AddNewLocationPage: React.FC = () => {
    const router = useRouter();
    const { addLocation, zones, loadZones, dataState } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [newLocation, setNewLocation] = useState<Omit<Location, 'id' | 'latitude' | 'longitude'>>({
        code: '',
        name: '',
        type: 'Bin',
        status: 'Available',
        capacity: 0,
        currentCapacity: 0,
        zone: '',
        address: '',
        description: '',
        warehouseId: '',
    });
    const [coords, setCoords] = useState({ latitude: '', longitude: '' });
    const [errors, setErrors] = useState<FormErrors>({});

    // AI-related state
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [isGeneratingName, setIsGeneratingName] = useState(false);
    const [codeValidation, setCodeValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message: string }>({ status: 'idle', message: '' });
    const [nameValidation, setNameValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message: string }>({ status: 'idle', message: '' });

    useEffect(() => {
        loadZones();
    }, [loadZones]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'code') setCodeValidation({ status: 'idle', message: '' });
        if (name === 'name') setNameValidation({ status: 'idle', message: '' });

        // Clear existing error for the field being changed
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof FormErrors];
                return newErrors;
            });
        }

        if (name === 'latitude' || name === 'longitude') {
            // Allow only numeric-style characters
            if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                setCoords(prev => ({ ...prev, [name]: value }));
            }
            return; // Early return for coord fields
        }

        setNewLocation(prev => {
            let parsedValue: string | number | undefined = value;
            if (name === 'capacity') {
                parsedValue = parseInt(value, 10) || 0;
            }
            return {
                ...prev,
                [name]: parsedValue
            };
        });
    };

    const handleGeocode = async () => {
        if (!newLocation.address) {
            addToast({ type: 'info', message: 'Please enter an address first.' });
            return;
        }
        setIsGeocoding(true);
        try {
            const { latitude, longitude } = await getCoordinatesFromAddress(newLocation.address);
            setCoords({ latitude: String(latitude), longitude: String(longitude) });
            addToast({ type: 'success', message: 'Coordinates found!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Could not find coordinates for this address.' });
        } finally {
            setIsGeocoding(false);
        }
    };
    
    const handleGenerateCode = async () => {
        setIsGeneratingCode(true);
        try {
            const warehouse = staticWarehouses.find(w => w.id === newLocation.warehouseId);
            const code = await suggestLocationCode({
                type: newLocation.type,
                zone: newLocation.zone,
                warehouseName: warehouse?.name,
            });
            setNewLocation(prev => ({ ...prev, code }));
            setCodeValidation({ status: 'valid', message: '' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate location code.' });
        } finally {
            setIsGeneratingCode(false);
        }
    };
    
    const handleGenerateName = async () => {
        if (!newLocation.code) {
            addToast({ type: 'info', message: 'Please generate or enter a location code first.' });
            return;
        }
        setIsGeneratingName(true);
        try {
            const name = await suggestLocationName({
                type: newLocation.type,
                zone: newLocation.zone,
                code: newLocation.code,
            });
            setNewLocation(prev => ({ ...prev, name }));
            setNameValidation({ status: 'valid', message: '' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate location name.' });
        } finally {
            setIsGeneratingName(false);
        }
    };

    const handleValidateCode = async () => {
        const code = newLocation.code.trim();
        if (!code) return;
        setCodeValidation({ status: 'loading', message: '' });
        try {
            const result = await validateLocationCode(code, newLocation.type);
            if (result.isValid) {
                setCodeValidation({ status: 'valid', message: '' });
            } else {
                setCodeValidation({ status: 'invalid', message: result.reason });
            }
        } catch (error) {
            setCodeValidation({ status: 'idle', message: '' });
            addToast({ type: 'info', message: 'AI code validation failed.' });
        }
    };

    const handleValidateName = async () => {
        const name = newLocation.name.trim();
        if (!name) return;
        setNameValidation({ status: 'loading', message: '' });
        try {
            const result = await validateLocationName(name);
            if (result.isValid) {
                setNameValidation({ status: 'valid', message: '' });
            } else {
                setNameValidation({ status: 'invalid', message: result.reason });
            }
        } catch (error) {
            setNameValidation({ status: 'idle', message: '' });
            addToast({ type: 'info', message: 'AI name validation failed.' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: FormErrors = {};

        // Basic field validation
        if (!newLocation.name) newErrors.name = "Location Name is required.";
        if (!newLocation.code) newErrors.code = "Location Code is required.";
        if (!newLocation.zone) newErrors.zone = "Zone is required.";
        if (!newLocation.warehouseId) newErrors.warehouseId = "Warehouse is required.";
        if (newLocation.type !== 'Zone' && newLocation.capacity <= 0) newErrors.capacity = "Capacity must be greater than 0 for non-zone locations.";

        // AI validation status check
        if (codeValidation.status === 'invalid') newErrors.code = codeValidation.message;
        if (nameValidation.status === 'invalid') newErrors.name = nameValidation.message;
        if (codeValidation.status === 'loading' || nameValidation.status === 'loading') {
            addToast({ type: 'error', message: "Please wait for AI validation to complete." });
            return;
        }

        // Latitude and Longitude validation
        const latStr = coords.latitude.trim();
        const lonStr = coords.longitude.trim();
        let finalLatitude: number | undefined = undefined;
        let finalLongitude: number | undefined = undefined;

        if (latStr !== '') {
            const latNum = parseFloat(latStr);
            if (isNaN(latNum) || latStr === '.' || latStr === '-') {
                newErrors.latitude = "Latitude must be a numeric value.";
            } else if (latNum < -90 || latNum > 90) {
                newErrors.latitude = "Latitude must be between -90 and 90.";
            } else {
                finalLatitude = latNum;
            }
        }
    
        if (lonStr !== '') {
            const lonNum = parseFloat(lonStr);
            if (isNaN(lonNum) || lonStr === '.' || lonStr === '-') {
                newErrors.longitude = "Longitude must be a numeric value.";
            } else if (lonNum < -180 || lonNum > 180) {
                newErrors.longitude = "Longitude must be between -180 and 180.";
            } else {
                finalLongitude = lonNum;
            }
        }
        
        if ((latStr !== '' && lonStr === '') || (latStr === '' && lonStr !== '')) {
             newErrors.latitude = newErrors.latitude || "Both Latitude and Longitude must be provided together.";
             newErrors.longitude = newErrors.longitude || "Both Latitude and Longitude must be provided together.";
        }
        
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            addToast({ type: 'error', message: "Please fix the validation errors before saving." });
            return;
        }
        
        setIsSaving(true);
        try {
            await addLocation({
                ...newLocation,
                latitude: finalLatitude,
                longitude: finalLongitude,
            });
            router.push('/locations');
        } catch (error) {
            // Error is handled by context
        } finally {
            setIsSaving(false);
        }
    };

    const locationTypes: LocationType[] = ['Aisle', 'Rack', 'Shelf', 'Bin'];
    const locationStatuses: LocationStatus[] = ['Available', 'Occupied', 'Reserved', 'Maintenance'];
    
    if (!dataState.zones.loaded) {
        return (
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Add New Location</h1>
                </div>
                <FormSkeleton />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Add New Location</h1>
            </div>
            <form onSubmit={handleSave}>
                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="relative">
                                <label htmlFor="code" className="block text-sm font-medium text-muted-foreground mb-1.5">Location Code<span className="text-destructive ml-1">*</span></label>
                                <div className="flex items-center gap-2">
                                    <Input id="code" name="code" value={newLocation.code} onChange={handleChange} onBlur={handleValidateCode} required error={errors.code || (codeValidation.status === 'invalid' ? codeValidation.message : undefined)} />
                                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateCode} loading={isGeneratingCode} aria-label="Generate Location Code">
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="absolute top-9 right-14 flex items-center pointer-events-none">
                                    {codeValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                    {codeValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                    {codeValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                </div>
                            </div>
                             <div className="relative">
                                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1.5">Location Name<span className="text-destructive ml-1">*</span></label>
                                <div className="flex items-center gap-2">
                                    <Input id="name" name="name" value={newLocation.name} onChange={handleChange} onBlur={handleValidateName} required error={errors.name || (nameValidation.status === 'invalid' ? nameValidation.message : undefined)} />
                                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateName} loading={isGeneratingName} disabled={!newLocation.code} aria-label="Generate Location Name">
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="absolute top-9 right-14 flex items-center pointer-events-none">
                                    {nameValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                    {nameValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                    {nameValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Select id="warehouseId" name="warehouseId" label="Warehouse" value={newLocation.warehouseId || ''} onChange={handleChange} required error={errors.warehouseId}>
                                <option value="" disabled>Select a warehouse</option>
                                {staticWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </Select>
                            <Select id="zone" name="zone" label="Zone" value={newLocation.zone || ''} onChange={handleChange} required error={errors.zone}>
                                <option value="" disabled>Select a zone</option>
                                {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                            </Select>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Input 
                                id="capacity" 
                                name="capacity" 
                                label="Capacity (units)" 
                                type="number" 
                                value={newLocation.capacity || ''} 
                                onChange={handleChange} 
                                error={errors.capacity}
                                min="0"
                                onKeyDown={(e) => {
                                    if (['e', 'E', '+', '-'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            <Select id="type" name="type" label="Location Type" value={newLocation.type} onChange={handleChange}>
                                {locationTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </Select>
                            <Select id="status" name="status" label="Status" value={newLocation.status} onChange={handleChange}>
                                {locationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                            </Select>
                        </div>
                        
                        <div className="relative">
                           <label htmlFor="address" className="block text-sm font-medium text-muted-foreground mb-1.5">Address</label>
                           <textarea 
                                id="address" 
                                name="address" 
                                value={newLocation.address || ''} 
                                onChange={handleChange}
                                rows={3}
                                className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 mt-1 mr-1 text-primary hover:bg-accent"
                                onClick={handleGeocode}
                                loading={isGeocoding}
                            >
                                {!isGeocoding && <MapPin className="h-4 w-4 mr-1" />}
                                Geocode
                            </Button>
                        </div>
                        
                        <div>
                           <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
                           <textarea 
                                id="description" 
                                name="description" 
                                value={newLocation.description || ''} 
                                onChange={handleChange}
                                rows={3}
                                className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input id="latitude" name="latitude" label="Latitude" type="text" value={coords.latitude} onChange={handleChange} error={errors.latitude}/>
                            <Input id="longitude" name="longitude" label="Longitude" type="text" value={coords.longitude} onChange={handleChange} error={errors.longitude}/>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => router.push('/locations')}>Cancel</Button>
                        <Button type="submit" loading={isSaving} disabled={isSaving || codeValidation.status === 'invalid' || nameValidation.status === 'invalid' || codeValidation.status === 'loading' || nameValidation.status === 'loading'}>Save Location</Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default AddNewLocationPage;
