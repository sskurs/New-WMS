
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import PricingRuleForm from '@/components/configure/PricingRuleForm';
import { useToast } from '@/contexts/ToastContext';
import FormSkeleton from '@/components/skeletons/FormSkeleton';
import { PricingRule } from '@/types';

const EditPricingRulePage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const ruleId = params.ruleId as string;
    const { getPricingRuleById, updatePricingRule, loadPricingRules, dataState } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!dataState.pricingRules.loaded) {
            loadPricingRules();
        }
    }, [dataState.pricingRules.loaded, loadPricingRules]);

    const rule = useMemo(() => {
        if (!ruleId || !dataState.pricingRules.loaded) return undefined;
        return getPricingRuleById(ruleId) || null;
    }, [ruleId, getPricingRuleById, dataState.pricingRules.loaded]);
    
    useEffect(() => {
        // Only show "not found" error if data is loaded, rule is null, AND we are not currently saving/redirecting.
        // This prevents a race condition where the rule might temporarily appear missing during a state refresh after update.
        if (!isSaving && ruleId && dataState.pricingRules.loaded && rule === null) {
            addToast({ type: 'error', message: 'Pricing rule not found.' });
            router.replace('/configure/pricing');
        }
    }, [dataState.pricingRules.loaded, rule, router, ruleId, addToast, isSaving]);


    const handleSave = async (ruleData: Partial<Omit<PricingRule, 'id'>>) => {
        if (!rule) return;
        setIsSaving(true);
        try {
            await updatePricingRule({ ...rule, ...ruleData, id: ruleId });
            // The success toast is already handled inside updatePricingRule context function
            router.push('/configure/pricing');
        } catch (error) {
            // Error toast is handled in context, but we reset isSaving here to allow retry
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/configure/pricing');
    };

    if (rule === undefined) {
        return (
            <div>
                 <h1 className="text-2xl font-semibold text-foreground mb-6">Edit Pricing Rule</h1>
                 <FormSkeleton />
            </div>
        )
    }

    if (rule === null) {
        return null;
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold text-foreground mb-6">Edit Pricing Rule</h1>
            <PricingRuleForm
                initialRule={rule}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
            />
        </div>
    );
};

export default EditPricingRulePage;
