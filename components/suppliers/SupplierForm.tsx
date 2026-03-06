
'use client';

import React, { useState, useEffect } from 'react';
import { Supplier } from '@/types';
import Card, { CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '../ui/Select';
import { useToast } from '@/contexts/ToastContext';
import { validateSupplierName, validateCustomerName } from '@/services/geminiService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { indianStates, indianStatesAndCities } from '@/data/indian-states-cities';

interface SupplierFormProps {
    initialSupplier?: Supplier;
    onSave: (supplier: Partial<Supplier>) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ initialSupplier, onSave, onCancel, isSaving }) => {
    const { addToast } = useToast();
    const [supplier, setSupplier] = useState<Partial<Supplier>>(initialSupplier || {
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        website: '',
        status: 'Active',
        rating: 3,
        notes: '',
    });
    
    const [citiesForSelectedState, setCitiesForSelectedState] = useState<string[]>([]);

    const [supplierNameValidation, setSupplierNameValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message?: string }>({ status: 'idle' });
    const [contactPersonValidation, setContactPersonValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message?: string }>({ status: 'idle' });
    const [formErrors, setFormErrors] = useState<{ name?: string, contactPerson?: string, phone?: string, email?: string, zipCode?: string }>({});

    useEffect(() => {
        if (initialSupplier) {
            setSupplier(initialSupplier);
            if (initialSupplier.state) {
                setCitiesForSelectedState(indianStatesAndCities[initialSupplier.state] || []);
            }
        }
    }, [initialSupplier]);

    const handleChange = (field: keyof Supplier, value: string | number) => {
        setSupplier(prev => {
            const newState = { ...prev, [field]: value };
            if (field === 'state') {
                newState.city = ''; // Reset city when state changes
                setCitiesForSelectedState(indianStatesAndCities[value as string] || []);
            }
            return newState;
        });
    };

    const handleSupplierNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange('name', e.target.value);
        setSupplierNameValidation({ status: 'idle' });
        if (formErrors.name) setFormErrors(p => ({ ...p, name: undefined }));
    };

    const handleSupplierNameBlur = async () => {
        const name = supplier.name?.trim();
        if (!name) return;
        setSupplierNameValidation({ status: 'loading' });
        try {
            const result = await validateSupplierName(name);
            if (result.isValid) {
                setSupplierNameValidation({ status: 'valid' });
                 if (formErrors.name) setFormErrors(p => ({ ...p, name: undefined }));
            } else {
                setSupplierNameValidation({ status: 'invalid', message: result.reason });
                setFormErrors(p => ({ ...p, name: result.reason }));
            }
        } catch (error) {
            setSupplierNameValidation({ status: 'idle' });
        }
    };

    const handleContactPersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange('contactPerson', e.target.value);
        setContactPersonValidation({ status: 'idle' });
        if (formErrors.contactPerson) setFormErrors(p => ({ ...p, contactPerson: undefined }));
    };

    const handleContactPersonBlur = async () => {
        const name = supplier.contactPerson?.trim();
        if (!name) return;
        setContactPersonValidation({ status: 'loading' });
        try {
            const result = await validateCustomerName(name);
            if (result.isValid) {
                setContactPersonValidation({ status: 'valid' });
                if (formErrors.contactPerson) setFormErrors(p => ({ ...p, contactPerson: undefined }));
            } else {
                setContactPersonValidation({ status: 'invalid', message: result.reason });
                setFormErrors(p => ({ ...p, contactPerson: result.reason }));
            }
        } catch (error) {
            setContactPersonValidation({ status: 'idle' });
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange('email', e.target.value);
        if (formErrors.email) setFormErrors(p => ({ ...p, email: undefined }));
    };

    const handleEmailBlur = () => {
        const email = supplier.email?.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFormErrors(p => ({ ...p, email: 'Please enter a valid email address.' }));
        } else {
            setFormErrors(p => ({ ...p, email: undefined }));
        }
    };

     const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 10) {
            handleChange('phone', value);
            if (formErrors.phone) setFormErrors(p => ({ ...p, phone: undefined }));
        }
    };

    const handlePhoneBlur = () => {
        if (supplier.phone && supplier.phone.length > 0 && supplier.phone.length !== 10) {
            setFormErrors(p => ({ ...p, phone: 'Phone number must be exactly 10 digits.' }));
        } else {
            setFormErrors(p => ({ ...p, phone: undefined }));
        }
    };

    const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 6) {
            handleChange('zipCode', value);
            if (formErrors.zipCode) setFormErrors(p => ({ ...p, zipCode: undefined }));
        }
    };

    const handleZipCodeBlur = () => {
        if (supplier.zipCode && supplier.zipCode.length > 0 && supplier.zipCode.length !== 6) {
            setFormErrors(p => ({ ...p, zipCode: 'Zip code must be exactly 6 digits.' }));
        } else {
            setFormErrors(p => ({ ...p, zipCode: undefined }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Trigger all blur validations at once to show all errors
        handlePhoneBlur();
        handleEmailBlur();
        handleZipCodeBlur();

        // Re-check after setting state
        let hasErrors = false;
        
        if (supplier.phone && supplier.phone.length > 0 && supplier.phone.length !== 10) {
            hasErrors = true;
        }
        
        const email = supplier.email?.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
             setFormErrors(p => ({ ...p, email: 'Please enter a valid email address.' }));
            hasErrors = true;
        }

        if (supplier.zipCode && supplier.zipCode.length > 0 && supplier.zipCode.length !== 6) {
             setFormErrors(p => ({ ...p, zipCode: 'Zip code must be exactly 6 digits.' }));
            hasErrors = true;
        }
        
        if (supplierNameValidation.status === 'invalid' || contactPersonValidation.status === 'invalid') {
            hasErrors = true;
        }
        
        if (hasErrors) {
            addToast({ type: 'error', message: "Please correct the errors before submitting." });
            return;
        }

        if (supplierNameValidation.status === 'loading' || contactPersonValidation.status === 'loading') {
            addToast({ type: 'info', message: "Please wait for AI validation to complete." });
            return;
        }

        onSave(supplier);
    };

    const saveDisabled = isSaving || supplierNameValidation.status === 'loading' || contactPersonValidation.status === 'loading';

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardContent className="space-y-6 pt-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                         <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                             <div className="relative md:col-span-2">
                                <Input
                                    id="name"
                                    label="Supplier Name"
                                    value={supplier.name || ''}
                                    onChange={handleSupplierNameChange}
                                    onBlur={handleSupplierNameBlur}
                                    required
                                    error={formErrors.name}
                                />
                                <div className="absolute top-9 right-3 flex items-center">
                                    {supplierNameValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                    {supplierNameValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                    {supplierNameValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                </div>
                            </div>
                            <Select id="status" label="Status" value={supplier.status || 'Active'} onChange={e => handleChange('status', e.target.value as 'Active' | 'Inactive')}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </Select>
                        </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium text-foreground">Contact Details</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                             <div className="relative">
                                <Input
                                    id="contactPerson"
                                    label="Contact Person"
                                    value={supplier.contactPerson || ''}
                                    onChange={handleContactPersonChange}
                                    onBlur={handleContactPersonBlur}
                                    required
                                    error={formErrors.contactPerson}
                                />
                                 <div className="absolute top-9 right-3 flex items-center">
                                    {contactPersonValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                    {contactPersonValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                    {contactPersonValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                </div>
                            </div>
                             <Input
                                id="phone"
                                label="Phone"
                                type="tel"
                                value={supplier.phone || ''}
                                onChange={handlePhoneChange}
                                onBlur={handlePhoneBlur}
                                error={formErrors.phone}
                                maxLength={10}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <Input
                                id="email"
                                label="Email"
                                type="email"
                                value={supplier.email || ''}
                                onChange={handleEmailChange}
                                onBlur={handleEmailBlur}
                                required
                                error={formErrors.email}
                            />
                             <Input
                                id="website"
                                label="Website (Optional)"
                                value={supplier.website || ''}
                                onChange={e => handleChange('website', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Address */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium text-foreground">Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select id="country" label="Country" value={supplier.country || 'India'} onChange={e => handleChange('country', e.target.value)}>
                                <option value="India">India</option>
                            </Select>
                            <Select id="state" label="State/Province" value={supplier.state || ''} onChange={e => handleChange('state', e.target.value)}>
                                <option value="" disabled>Select a state</option>
                                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select id="city" label="City" value={supplier.city || ''} onChange={e => handleChange('city', e.target.value)} disabled={!supplier.state}>
                                <option value="" disabled>{supplier.state ? "Select a city" : "Select a state first"}</option>
                                {citiesForSelectedState.map(c => <option key={c} value={c}>{c}</option>)}
                            </Select>
                            <Input 
                                id="zipCode" 
                                label="Zip/Postal Code" 
                                value={supplier.zipCode || ''} 
                                onChange={handleZipCodeChange} 
                                onBlur={handleZipCodeBlur}
                                error={formErrors.zipCode}
                                maxLength={6}
                            />
                        </div>
                        <Input id="address" label="Address Line" value={supplier.address || ''} onChange={e => handleChange('address', e.target.value)} />
                    </div>

                    {/* Additional Info */}
                     <div className="space-y-4 pt-4 border-t">
                         <h3 className="text-lg font-medium text-foreground">Additional Information</h3>
                         <div>
                            <label htmlFor="rating" className="block text-sm font-medium text-muted-foreground mb-1.5">Rating (1-5)</label>
                            <Input id="rating" type="range" min="1" max="5" step="1" value={supplier.rating || 3} onChange={e => handleChange('rating', Number(e.target.value))} />
                         </div>
                          <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1.5">Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={4}
                                className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder-muted-foreground"
                                value={supplier.notes || ''}
                                onChange={e => handleChange('notes', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button id="create-supplier-button" type="submit" loading={isSaving} disabled={saveDisabled}>
                        {initialSupplier ? 'Save Changes' : 'Create Supplier'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default SupplierForm;
