

'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';

const steps = ['Location', 'Zone', 'Rack', 'Shelf', 'Bin', 'Review'];

const Stepper = ({ currentStep }: { currentStep: number }) => (
    <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
            {steps.map((step, stepIdx) => (
                <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-16' : ''}`}>
                    {stepIdx < currentStep ? (
                        <>
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="h-0.5 w-full bg-primary" />
                            </div>
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                                <Check className="h-5 w-5 text-white" aria-hidden="true" />
                            </div>
                        </>
                    ) : stepIdx === currentStep ? (
                        <>
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                            </div>
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
                            </div>
                            <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
                                <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                            </div>
                        </>
                    )}
                     <span className="absolute mt-2 text-sm font-medium text-center w-full left-1/2 -translate-x-1/2">{step}</span>
                </li>
            ))}
        </ol>
    </nav>
);

const staticWarehouses = [
    { id: '1000', name: 'Mumbai Central Warehouse' },
    { id: '1001', name: 'Delhi North Hub' },
    { id: '1002', name: 'Bangalore South Depot' },
    { id: '1003', name: 'Kolkata East Hub' },
];


const LocationHierarchyForm: React.FC = () => {
    const { addLocation, addZone } = useAppContext();
    const { addToast } = useToast();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        warehouseId: '',
        locationName: '',
        zoneName: '',
        zoneType: 'Putaway Zone',
        zoneDescription: '',
        rackName: '',
        shelfName: '',
        shelfCapacity: '100',
        binName: '',
        binCapacity: '20',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => {
        // Validation before proceeding
        switch (currentStep) {
            case 0:
                if (!formData.warehouseId) return addToast({type: 'error', message: 'Please select a warehouse.'});
                break;
            case 1:
                if (!formData.zoneName.trim()) return addToast({type: 'error', message: 'Please enter a zone name.'});
                break;
            case 2:
                if (!formData.rackName.trim()) return addToast({type: 'error', message: 'Please enter a rack name.'});
                break;
            case 3:
                if (!formData.shelfName.trim() || parseInt(formData.shelfCapacity) <= 0) return addToast({type: 'error', message: 'Please enter a shelf name and valid capacity.'});
                break;
            case 4:
                if (!formData.binName.trim() || parseInt(formData.binCapacity) <= 0) return addToast({type: 'error', message: 'Please enter a bin name and valid capacity.'});
                break;
        }
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => setCurrentStep(prev => prev - 1);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // 1. Create Zone
            const newZone = await addZone({
                name: formData.zoneName,
                zoneType: formData.zoneType,
                description: formData.zoneDescription,
                warehouseId: formData.warehouseId,
            });
            if (!newZone) throw new Error("Failed to create Zone.");
            addToast({ type: 'info', message: `Zone '${newZone.name}' created.` });
    
            // 2. Create Rack
            const newRack = await addLocation({
                name: formData.rackName,
                code: `${newZone.code}-R1`,
                // FIX: Added missing 'currentCapacity' property to satisfy the Location type.
                type: 'Rack', status: 'Available', capacity: 0, currentCapacity: 0, zone: newZone.name,
                description: `Rack ${formData.rackName} in zone ${formData.zoneName}`,
                warehouseId: formData.warehouseId,
            });
            if (!newRack) throw new Error("Failed to create Rack.");
            addToast({ type: 'info', message: `Rack '${newRack.name}' created.` });
    
            // 3. Create Shelf
            const newShelf = await addLocation({
                name: formData.shelfName,
                code: `${newRack.code}-S1`,
                // FIX: Added missing 'currentCapacity' property to satisfy the Location type.
                type: 'Shelf', status: 'Available', capacity: parseInt(formData.shelfCapacity, 10), currentCapacity: 0, zone: newRack.zone,
                description: `Shelf ${formData.shelfName} on rack ${formData.rackName}`,
                warehouseId: formData.warehouseId,
            });
            if (!newShelf) throw new Error("Failed to create Shelf.");
            addToast({ type: 'info', message: `Shelf '${newShelf.name}' created.` });
    
            // 4. Create Bin
            await addLocation({
                name: formData.binName,
                code: `${newShelf.code}-B1`,
                // FIX: Added missing 'currentCapacity' property to satisfy the Location type.
                type: 'Bin', status: 'Available', capacity: parseInt(formData.binCapacity, 10), currentCapacity: 0, zone: newShelf.zone,
                description: `Bin ${formData.binName} on shelf ${formData.shelfName}`,
                warehouseId: formData.warehouseId,
            });
    
            addToast({ type: 'success', message: 'Location hierarchy created successfully!' });
            router.push('/locations');
    
        } catch (error) {
            addToast({ type: 'error', message: `Failed during creation: ${(error as Error).message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const renderContent = () => {
        switch (currentStep) {
            case 0: return (
                <div className="space-y-4 max-w-lg mx-auto">
                    <h3 className="text-lg font-medium text-foreground">Base Location</h3>
                    <p className="text-sm text-muted-foreground">Select the parent warehouse and give this location group a descriptive name.</p>
                    <Select id="warehouseId" name="warehouseId" label="Warehouse" value={formData.warehouseId} onChange={handleInputChange} required>
                        <option value="">Select Warehouse</option>
                        {staticWarehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                    </Select>
                    <Input id="locationName" name="locationName" label="Location Name" value={formData.locationName} onChange={handleInputChange} placeholder="e.g. Main Storage Area" />
                </div>
            );
            case 1: return (
                <div className="space-y-4 max-w-lg mx-auto">
                    <h3 className="text-lg font-medium text-foreground">Define Zone</h3>
                     <p className="text-sm text-muted-foreground">Zones are large areas within a warehouse used for different purposes.</p>
                    <Input id="zoneName" name="zoneName" label="Zone Name" value={formData.zoneName} onChange={handleInputChange} required />
                    <Select id="zoneType" name="zoneType" label="Zone Type" value={formData.zoneType} onChange={handleInputChange}>
                        <option>Putaway Zone</option> <option>Picking Zone</option> <option>Staging Zone</option> <option>Damage Zone</option>
                    </Select>
                    <textarea id="zoneDescription" name="zoneDescription" rows={3} placeholder="Optional description..."
                        className="block w-full px-3 py-2 border border-input rounded-md bg-background"
                        value={formData.zoneDescription} onChange={handleInputChange}
                    />
                </div>
            );
            case 2: return (
                <div className="space-y-4 max-w-lg mx-auto">
                    <h3 className="text-lg font-medium text-foreground">Define Rack</h3>
                    <p className="text-sm text-muted-foreground">Racks are large structures within zones that hold shelves.</p>
                    <Input id="rackName" name="rackName" label="Rack Name / Number" value={formData.rackName} onChange={handleInputChange} required placeholder="e.g., Rack A-01"/>
                </div>
            );
            case 3: return (
                <div className="space-y-4 max-w-lg mx-auto">
                    <h3 className="text-lg font-medium text-foreground">Define Shelf</h3>
                    <p className="text-sm text-muted-foreground">Shelves are individual levels on a rack.</p>
                    <Input id="shelfName" name="shelfName" label="Shelf Name / Number" value={formData.shelfName} onChange={handleInputChange} required placeholder="e.g., Shelf 3" />
                    <Input id="shelfCapacity" name="shelfCapacity" label="Shelf Capacity (units)" type="number" value={formData.shelfCapacity} onChange={handleInputChange} required />
                </div>
            );
            case 4: return (
                <div className="space-y-4 max-w-lg mx-auto">
                    <h3 className="text-lg font-medium text-foreground">Define Bin</h3>
                    <p className="text-sm text-muted-foreground">Bins are specific slots on a shelf for storing items.</p>
                    <Input id="binName" name="binName" label="Bin Name / Number" value={formData.binName} onChange={handleInputChange} required placeholder="e.g., Bin B-05"/>
                    <Input id="binCapacity" name="binCapacity" label="Bin Capacity (units)" type="number" value={formData.binCapacity} onChange={handleInputChange} required />
                </div>
            );
            case 5:
                const warehouse = staticWarehouses.find(w => w.id === formData.warehouseId);
                return (
                    <div className="space-y-4 max-w-lg mx-auto">
                        <h3 className="text-lg font-medium text-foreground">Review & Save</h3>
                        <p className="text-sm text-muted-foreground">Please review the details of the new location hierarchy. Click 'Save' to create all entities.</p>
                        <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                            <p><strong>Warehouse:</strong> {warehouse?.name || 'N/A'}</p>
                            <p><strong>Location Group:</strong> {formData.locationName || '(Not specified)'}</p>
                            <div className="border-t pt-3 mt-3">
                                <p><strong>New Path:</strong></p>
                                <p className="pl-4">{formData.zoneName} &rarr; {formData.rackName} &rarr; {formData.shelfName} &rarr; {formData.binName}</p>
                            </div>
                             <div className="border-t pt-3 mt-3 grid grid-cols-2 gap-4">
                                <p><strong>Zone Type:</strong> {formData.zoneType}</p>
                                <p><strong>Shelf Capacity:</strong> {formData.shelfCapacity}</p>
                                <p><strong>Bin Capacity:</strong> {formData.binCapacity}</p>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="flex flex-col">
            <div className="p-4 mb-8">
                <Stepper currentStep={currentStep} />
            </div>
            <div className="py-6 min-h-[20rem] animate-fadeIn flex-grow">
                {renderContent()}
            </div>
            <div className="flex justify-between items-center pt-6 border-t">
                <Button variant="secondary" onClick={prevStep} disabled={currentStep === 0 || isSaving}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                {currentStep < steps.length - 1 ? (
                    <Button onClick={nextStep}>Next</Button>
                ) : (
                    <Button onClick={handleSaveAll} loading={isSaving}>Save Hierarchy</Button>
                )}
            </div>
        </div>
    );
};

export default LocationHierarchyForm;
