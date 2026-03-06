'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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


const EditLocationPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const locationId = params.locationId as string;
    
    const { updateLocation, dataState, zones, loadZones, fetchLocationById } = useAppContext();
    const { addToast } = useToast();
    
    const [location, setLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
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

    useEffect(() => {
        if (locationId) {
            setIsLoading(true);
            fetchLocationById(locationId)
                .then(foundLocation => {
                    if (foundLocation) {
                        setLocation(foundLocation);
                        setCoords({
                            latitude: foundLocation.latitude !== undefined ? String(foundLocation.latitude) : '',
                            longitude: foundLocation.longitude !== undefined ? String(foundLocation.longitude) : '',
                        });
                    } else {
                        // Error toast is handled in the context, just redirect
                        router.replace('/locations');
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [locationId, fetchLocationById, router]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!location) return;
        const { name, value } = e.target;
        
        if (name === 'code') setCodeValidation({ status: 'idle', message: '' });
        if (name === 'name') setNameValidation({ status: 'idle', message: '' });
        
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
            return;
        }

        let parsedValue: string | number | undefined = value;
        if (name === 'capacity') {
            parsedValue = parseInt(value, 10) || 0;
        }

        setLocation(prev => prev ? {
            ...prev,
            [name]: parsedValue
        } : null);
    };

    const handleGeocode = async () => {
        if (!location?.address) {
            addToast({ type: 'info', message: 'Please enter an address first.' });
            return;
        }
        setIsGeocoding(true);
        try {
            const { latitude, longitude } = await getCoordinatesFromAddress(location.address);
            setCoords({ latitude: String(latitude), longitude: String(longitude) });
            addToast({ type: 'success', message: 'Coordinates found!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Could not find coordinates for this address.' });
        } finally {
            setIsGeocoding(false);
        }
    };
    
    const handleGenerateCode = async () => {
        if (!location) return;
        setIsGeneratingCode(true);
        try {
            const warehouse = staticWarehouses.find(w => w.id === location.warehouseId);
            const code = await suggestLocationCode({
                type: location.type,
                zone: location.zone,
                warehouseName: warehouse?.name,
            });
            setLocation(prev => prev ? { ...prev, code } : null);
            setCodeValidation({ status: 'valid', message: '' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate location code.' });
        } finally {
            setIsGeneratingCode(false);
        }
    };
    
    const handleGenerateName = async () => {
        if (!location?.code) {
            addToast({ type: 'info', message: 'Please ensure a location code exists.' });
            return;
        }
        setIsGeneratingName(true);
        try {
            const name = await suggestLocationName({
                type: location.type,
                zone: location.zone,
                code: location.code,
            });
            setLocation(prev => prev ? { ...prev, name } : null);
            setNameValidation({ status: 'valid', message: '' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate location name.' });
        } finally {
            setIsGeneratingName(false);
        }
    };

    const handleValidateCode = async () => {
        const code = location?.code?.trim();
        if (!code || !location) return;
        setCodeValidation({ status: 'loading', message: '' });
        try {
            const result = await validateLocationCode(code, location.type);
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
        const name = location?.name?.trim();
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
        if (!location) return;

        const newErrors: FormErrors = {};

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


        if (codeValidation.status === 'invalid') newErrors.code = codeValidation.message;
        if (nameValidation.status === 'invalid') newErrors.name = nameValidation.message;
        if (codeValidation.status === 'loading' || nameValidation.status === 'loading') {
            addToast({ type: 'error', message: "Please wait for AI validation to complete." });
            return;
        }
        
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
             addToast({type: 'error', message: 'Please resolve validation issues before saving.'});
             return;
        }

        setIsSaving(true);
        try {
            await updateLocation({
                ...location,
                latitude: finalLatitude,
                longitude: finalLongitude,
            });
            router.push('/locations');
        } catch (error) {
            addToast({ type: 'error', message: `Failed to update location: ${(error as Error).message}` });
        } finally {
            setIsSaving(false);
        }
    };
    
    const locationTypes: LocationType[] = ['Aisle', 'Rack', 'Shelf', 'Bin'];
    const locationStatuses: LocationStatus[] = ['Available', 'Occupied', 'Reserved', 'Maintenance'];

    if (isLoading || !location) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-foreground">Edit Location</h1>
                <FormSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Edit Location: {location.name}</h1>
            <form onSubmit={handleSave}>
                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="relative">
                                <label htmlFor="code" className="block text-sm font-medium text-muted-foreground mb-1.5">Location Code<span className="text-destructive ml-1">*</span></label>
                                <div className="flex items-center gap-2">
                                    <Input id="code" name="code" value={location.code} onChange={handleChange} onBlur={handleValidateCode} required error={errors.code || (codeValidation.status === 'invalid' ? codeValidation.message : undefined)} />
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
                                    <Input id="name" name="name" value={location.name} onChange={handleChange} onBlur={handleValidateName} required error={errors.name || (nameValidation.status === 'invalid' ? nameValidation.message : undefined)} />
                                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateName} loading={isGeneratingName} disabled={!location.code} aria-label="Generate Location Name">
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
                             <Select id="warehouseId" name="warehouseId" label="Warehouse" value={location.warehouseId || ''} onChange={handleChange} required>
                                <option value="" disabled>Select a warehouse</option>
                                {staticWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </Select>
                            <Select id="zone" name="zone" label="Zone" value={location.zone || ''} onChange={handleChange} required disabled={dataState.zones.loading}>
                                <option value="" disabled>{dataState.zones.loading ? 'Loading...' : 'Select a zone'}</option>
                                {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                            </Select>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Input 
                                id="capacity" 
                                name="capacity" 
                                label="Capacity (units)" 
                                type="number" 
                                value={location.capacity || ''} 
                                onChange={handleChange} 
                                min="0"
                                onKeyDown={(e) => {
                                    if (['e', 'E', '+', '-'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            <Select id="type" name="type" label="Location Type" value={location.type} onChange={handleChange}>
                                {locationTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </Select>
                            <Select id="status" name="status" label="Status" value={location.status} onChange={handleChange}>
                                {locationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                            </Select>
                        </div>
                        
                        <div className="relative">
                           <label htmlFor="address" className="block text-sm font-medium text-muted-foreground mb-1.5">Address</label>
                           <textarea 
                                id="address" 
                                name="address" 
                                value={location.address || ''} 
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
                                value={location.description || ''} 
                                onChange={handleChange}
                                rows={3}
                                className="block w-full px-3 py-2 border border-input rounded-md bg-background"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input id="latitude" name="latitude" label="Latitude" type="text" value={coords.latitude} onChange={handleChange} error={errors.latitude} />
                            <Input id="longitude" name="longitude" label="Longitude" type="text" value={coords.longitude} onChange={handleChange} error={errors.longitude} />
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => router.push('/locations')}>Cancel</Button>
                        <Button type="submit" loading={isSaving} disabled={isSaving || codeValidation.status === 'invalid' || nameValidation.status === 'invalid' || codeValidation.status === 'loading' || nameValidation.status === 'loading'}>Save Changes</Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default EditLocationPage;
