
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PricingRule } from '@/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

// --- Component Props ---
interface PricingRuleFormProps {
    initialRule?: PricingRule | null;
    onSave: (rule: Partial<Omit<PricingRule, 'id'>>) => void;
    onCancel: () => void;
    isSaving: boolean;
}

const ToggleSwitch = ({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (enabled: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`} role="switch" aria-checked={enabled}>
            <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
        </button>
    </div>
);

const PricingRuleForm: React.FC<PricingRuleFormProps> = ({ initialRule, onSave, onCancel, isSaving }) => {
    const { addToast } = useToast();
    const [rule, setRule] = useState({
        name: '',
        description: '',
        priority: 'Medium',
        minQuantity: 0,
        maxQuantity: 0,
        startDate: '',
        endDate: '',
        isActive: true,
        actionType: 'discountPercentage', // for form logic: 'discountPercentage', 'fixedPrice', 'markupPercentage'
        actionValue: 0,
    });
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    
    useEffect(() => {
        if (initialRule) {
            let actionType = 'discountPercentage';
            let actionValue = 0;

            if (initialRule.fixedPrice && initialRule.fixedPrice > 0) {
                actionType = 'fixedPrice';
                actionValue = initialRule.fixedPrice;
            } else if (initialRule.markupPercentage && initialRule.markupPercentage > 0) {
                actionType = 'markupPercentage';
                actionValue = initialRule.markupPercentage;
            } else if (initialRule.discountPercentage && initialRule.discountPercentage > 0) {
                actionType = 'discountPercentage';
                actionValue = initialRule.discountPercentage;
            }

            // Fix: Use direct string splitting to extract YYYY-MM-DD to avoid timezone shifting issues
            // causing off-by-one errors when converting Date objects to ISO strings.
            const extractDate = (dateStr?: string) => {
                if (!dateStr) return '';
                // Check if it matches ISO format (YYYY-MM-DD...)
                if (dateStr.includes('T')) {
                    return dateStr.split('T')[0];
                }
                return dateStr;
            };

            setRule({
                name: initialRule.name || '',
                description: initialRule.description || '',
                priority: initialRule.priority || 'Medium',
                minQuantity: initialRule.minQuantity || 0,
                maxQuantity: initialRule.maxQuantity || 0,
                startDate: extractDate(initialRule.startDate),
                endDate: extractDate(initialRule.endDate),
                isActive: initialRule.isActive,
                actionType,
                actionValue,
            });
        }
    }, [initialRule]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number';

        // If action type changes, reset action value
        if (name === 'actionType') {
            setRule(prev => ({...prev, actionValue: 0, [name]: value}));
        } else {
             setRule(prev => ({...prev, [name]: isNumber ? (value ? parseFloat(value) : 0) : value}));
        }
        
        // Clear errors on change
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: undefined}));
        }
        if (name === 'startDate' || name === 'endDate' || name === 'minQuantity' || name === 'maxQuantity') {
            setErrors(prev => ({...prev, startDate: undefined, endDate: undefined, maxQuantity: undefined }));
        }
    };

    const handleIntegerChange = (field: 'minQuantity' | 'maxQuantity', value: string) => {
        const intValue = value.replace(/[^0-9]/g, ''); // Remove non-digits
        setRule(prev => ({
            ...prev,
            [field]: intValue === '' ? 0 : parseInt(intValue, 10)
        }));
         if (errors.maxQuantity) {
            setErrors(prev => ({...prev, maxQuantity: undefined}));
        }
    };
    
    const handleWholeNumberActionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        // Allow only whole numbers by stripping non-digits
        const wholeNumberValue = value.replace(/[^0-9]/g, '');
        
        setRule(prev => ({
            ...prev,
            actionValue: wholeNumberValue === '' ? 0 : parseInt(wholeNumberValue, 10)
        }));
        
        // As the user types, remove the validation error
        if (errors.actionValue) {
            setErrors(prev => ({ ...prev, actionValue: undefined }));
        }
    };

    const handleWholeNumberActionBlur = () => {
        let errorMsg: string | undefined;
        if (rule.actionType === 'discountPercentage' && rule.actionValue <= 0) {
            errorMsg = "Discount must be a whole number greater than 0.";
        } else if (rule.actionType === 'fixedPrice' && rule.actionValue <= 0) {
            errorMsg = "Fixed price must be a whole number greater than 0.";
        }
        
        if (errorMsg) {
            setErrors(prev => ({ ...prev, actionValue: errorMsg }));
        }
    };

    const handleToggle = (field: 'isActive', value: boolean) => {
        setRule(prev => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!rule.name.trim()) newErrors.name = "Rule name is required.";
        
        if (rule.actionValue <= 0) {
            if (rule.actionType === 'discountPercentage') {
                newErrors.actionValue = "Discount must be a whole number greater than 0.";
            } else if (rule.actionType === 'fixedPrice') {
                newErrors.actionValue = "Fixed price must be a whole number greater than 0.";
            } else {
                newErrors.actionValue = "Action value must be greater than 0.";
            }
        }

        // Date validation
        if (rule.startDate && rule.endDate && new Date(rule.endDate) <= new Date(rule.startDate)) {
            newErrors.endDate = 'End date must be after the start date.';
        }
        
        // For new rules, start date cannot be in the past.
        if (!initialRule && rule.startDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to midnight to compare dates only
            if (new Date(rule.startDate) < today) {
                newErrors.startDate = 'Start date cannot be in the past for new rules.';
            }
        }

        // Quantity validation
        if (rule.minQuantity > 0 && rule.maxQuantity > 0 && rule.maxQuantity < rule.minQuantity) {
            newErrors.maxQuantity = 'Max quantity cannot be less than min quantity.';
        }
        
        return newErrors;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            addToast({type: 'error', message: 'Please correct the errors before saving.'});
            return;
        }

        const { actionType, actionValue, ...rest } = rule;
        
        const ruleToSave: Partial<Omit<PricingRule, 'id'>> = {
            ...rest,
            discountPercentage: 0,
            fixedPrice: 0,
            markupPercentage: 0,
            // Dynamically set the correct action property
            [actionType]: actionValue,
        };

        onSave(ruleToSave);
    };
    
    const actionValueLabel = useMemo(() => {
        switch(rule.actionType) {
            case 'discountPercentage': return 'Discount (%)';
            case 'fixedPrice': return 'Fixed Price (₹)';
            case 'markupPercentage': return 'Markup (%)';
            default: return 'Value';
        }
    }, [rule.actionType]);

    const isWholeNumberAction = rule.actionType === 'discountPercentage' || rule.actionType === 'fixedPrice';

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">
                <Input id="name" name="name" label="Rule Name" value={rule.name} onChange={handleChange} required error={errors.name} />
                 <div>
                    <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
                    <textarea id="description" name="description" rows={3} className="block w-full px-3 py-2 border border-input rounded-md bg-background" value={rule.description} onChange={handleChange} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        id="minQuantity" 
                        name="minQuantity" 
                        label="Min Quantity" 
                        inputMode="numeric"
                        value={rule.minQuantity || ''} 
                        onChange={(e) => handleIntegerChange('minQuantity', e.target.value)} 
                    />
                    <Input 
                        id="maxQuantity" 
                        name="maxQuantity" 
                        label="Max Quantity" 
                        inputMode="numeric"
                        value={rule.maxQuantity || ''} 
                        onChange={(e) => handleIntegerChange('maxQuantity', e.target.value)}
                        error={errors.maxQuantity}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input id="startDate" name="startDate" label="Start Date" type="date" value={rule.startDate} onChange={handleChange} error={errors.startDate} />
                    <Input id="endDate" name="endDate" label="End Date" type="date" value={rule.endDate} onChange={handleChange} error={errors.endDate} />
                </div>
                
                <div className="p-4 border rounded-md bg-background space-y-4">
                     <h3 className="text-md font-medium text-foreground">Action</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select id="actionType" name="actionType" label="Action Type" value={rule.actionType} onChange={handleChange}>
                            <option value="discountPercentage">Percentage Discount</option>
                            <option value="fixedPrice">Set Fixed Price</option>
                            <option value="markupPercentage">Percentage Markup</option>
                        </Select>
                        {isWholeNumberAction ? (
                            <Input
                                id="actionValue"
                                name="actionValue"
                                label={actionValueLabel}
                                type="text"
                                inputMode="numeric"
                                value={rule.actionValue === 0 ? '' : rule.actionValue}
                                onChange={handleWholeNumberActionChange}
                                onBlur={handleWholeNumberActionBlur}
                                error={errors.actionValue}
                            />
                        ) : (
                            <Input 
                                id="actionValue" 
                                name="actionValue" 
                                label={actionValueLabel} 
                                type="number" 
                                value={rule.actionValue} 
                                onChange={handleChange} 
                                step="0.01" 
                                error={errors.actionValue}
                            />
                        )}
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select id="priority" name="priority" label="Priority" value={rule.priority} onChange={handleChange}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                    </Select>
                    <div>
                         <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
                         <ToggleSwitch label={rule.isActive ? 'Active' : 'Inactive'} enabled={rule.isActive} onChange={v => handleToggle('isActive', v)} />
                    </div>
                </div>
            </div>
            <div className="mt-8 flex justify-end items-center space-x-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={isSaving}>Save Rule</Button>
            </div>
        </form>
    );
};

export default PricingRuleForm;
