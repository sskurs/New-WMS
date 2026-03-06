
'use client';

import React, { useState, useEffect } from 'react';
import { Role, User } from '@/types';
import Card, { CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '../ui/Select';
import { validateCustomerName } from '@/services/geminiService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface EditUserFormProps {
    initialUser: User;
    onSave: (data: User) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    availableRoles: Role[];
}

const EditUserForm: React.FC<EditUserFormProps> = ({ initialUser, onSave, onCancel, isSaving, availableRoles }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<User>({
        ...initialUser,
        salutation: initialUser.salutation || 'Mr.',
        displayName: initialUser.displayName || initialUser.name,
        doj: initialUser.doj ? new Date(initialUser.doj).toISOString().split('T')[0] : '',
        gender: initialUser.gender || 'Male',
        branchId: initialUser.branchId || '1',
        departmentId: initialUser.departmentId || '3',
        personalEmail: initialUser.personalEmail || '',
        remarks: initialUser.remarks || '',
    });
    
    const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
    const [nameValidation, setNameValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message?: string }>({ status: 'idle' });

    useEffect(() => {
        const isOtherGender = initialUser.gender === 'Other';
        setFormData({
            ...initialUser,
            salutation: isOtherGender ? '' : (initialUser.salutation || 'Mr.'),
            displayName: initialUser.displayName || initialUser.name,
            doj: initialUser.doj ? new Date(initialUser.doj).toISOString().split('T')[0] : '',
            gender: initialUser.gender || 'Male',
            branchId: initialUser.branchId || '1',
            departmentId: initialUser.departmentId || '3',
            personalEmail: initialUser.personalEmail || '',
            remarks: initialUser.remarks || '',
        });
    }, [initialUser]);
    
    const handleChange = (field: keyof User, value: string) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value as any };
            if (field === 'gender') {
                if (value === 'Other') {
                    newState.salutation = '';
                } else if (prev.gender === 'Other') {
                    // When changing from 'Other' back to Male/Female, default to 'Mr.'
                    newState.salutation = 'Mr.';
                }
            }
            return newState;
        });
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
        if (field === 'name') {
            setNameValidation({ status: 'idle' });
        }
    };

    const handleNameChange = (value: string) => {
        const parts = value.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ');
        setFormData(prev => ({
            ...prev,
            name: value,
            firstName: firstName,
            lastName: lastName,
        }));
         if (formErrors.name) setFormErrors(p => ({ ...p, name: undefined }));
         setNameValidation({ status: 'idle' });
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 10) {
            handleChange('contactNo', value);
        }
    };

    const handleNameBlur = async () => {
        const name = formData.name.trim();
        if (!name) return;
        setNameValidation({ status: 'loading' });
        try {
            const result = await validateCustomerName(name);
            if (result.isValid) {
                setNameValidation({ status: 'valid' });
                setFormErrors(p => ({ ...p, name: undefined }));
            } else {
                const message = result.reason || 'Invalid name provided.';
                setNameValidation({ status: 'invalid', message });
                setFormErrors(p => ({ ...p, name: message }));
            }
        } catch (error) {
            setNameValidation({ status: 'idle' });
        }
    };

    const handleEmailBlur = (field: 'officialEmail' | 'personalEmail') => {
        const email = formData[field]?.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFormErrors(p => ({ ...p, [field]: 'Please enter a valid email address.' }));
        } else {
            setFormErrors(p => ({ ...p, [field]: undefined }));
        }
    };

    const handlePhoneBlur = () => {
        if (formData.contactNo && formData.contactNo.length !== 10) {
            setFormErrors(p => ({ ...p, contactNo: 'Phone number must be exactly 10 digits.' }));
        } else {
            setFormErrors(p => ({ ...p, contactNo: undefined }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string | undefined> = {};
        if (!formData.userName.trim()) newErrors.userName = 'Username is required.';
        if (!formData.name.trim()) newErrors.name = 'Full Name is required.';
        if (!formData.officialEmail.trim()) newErrors.officialEmail = 'Official email is required.';
        else handleEmailBlur('officialEmail');
        
        handlePhoneBlur();
        handleEmailBlur('personalEmail');

        const allErrors = { ...formErrors, ...newErrors };
        Object.keys(allErrors).forEach(key => {
            if (allErrors[key] === undefined) delete allErrors[key];
        });

        setFormErrors(allErrors);
        return Object.keys(allErrors).length === 0;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (nameValidation.status === 'invalid' || !validateForm()) {
            addToast({ type: 'error', message: "Please correct the errors before submitting." });
            return;
        }
        if (nameValidation.status === 'loading') {
            addToast({ type: 'info', message: "Please wait for name validation to complete." });
            return;
        }
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <h3 className="text-lg font-medium leading-6 text-foreground">Account Information</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Update the user's login credentials and role.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input id="userName" label="Username" value={formData.userName} onChange={e => handleChange('userName', e.target.value)} required error={formErrors.userName} />
                             <Select id="role" label="Role" value={formData.role} onChange={e => handleChange('role', e.target.value as Role)}>
                                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-medium leading-6 text-foreground">Personal Details</h3>
                         <p className="mt-1 text-sm text-muted-foreground">Update the user's personal and contact information.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <Select id="salutation" label="Salutation" value={formData.salutation} onChange={e => handleChange('salutation', e.target.value as any)} disabled={formData.gender === 'Other'}>
                                <option value=""></option>
                                <option value="Mr.">Mr.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Dr.">Dr.</option>
                            </Select>
                            <div className="relative md:col-span-2">
                                <Input id="name" label="Full Name" value={formData.name} onChange={e => handleNameChange(e.target.value)} onBlur={handleNameBlur} required error={formErrors.name} />
                                <div className="absolute top-9 right-3 flex items-center">
                                    {nameValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                    {nameValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                    {nameValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                </div>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input id="displayName" label="Display Name" value={formData.displayName} onChange={e => handleChange('displayName', e.target.value)} />
                            <Select id="gender" label="Gender" value={formData.gender} onChange={e => handleChange('gender', e.target.value as any)}>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </Select>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input id="officialEmail" label="Official Email" type="email" value={formData.officialEmail} onChange={e => handleChange('officialEmail', e.target.value)} onBlur={() => handleEmailBlur('officialEmail')} required error={formErrors.officialEmail} />
                             <Input id="personalEmail" label="Personal Email" type="email" value={formData.personalEmail} onChange={e => handleChange('personalEmail', e.target.value)} onBlur={() => handleEmailBlur('personalEmail')} error={formErrors.personalEmail} />
                        </div>
                        <Input id="contactNo" label="Contact Number" value={formData.contactNo} onChange={handlePhoneChange} onBlur={handlePhoneBlur} required error={formErrors.contactNo} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <h3 className="text-lg font-medium leading-6 text-foreground">Work Details</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Update the user's employment details.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input id="doj" label="Date of Joining" type="date" value={formData.doj} onChange={e => handleChange('doj', e.target.value)} required />
                        <div>
                             <label htmlFor="remarks" className="block text-sm font-medium text-muted-foreground mb-1.5">Remarks</label>
                            <textarea
                                id="remarks"
                                rows={3}
                                className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                                value={formData.remarks}
                                onChange={e => handleChange('remarks', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
                <CardFooter className="flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" loading={isSaving}>Save Changes</Button>
                </CardFooter>
            </div>
        </form>
    );
};

export default EditUserForm;
