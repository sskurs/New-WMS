

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import PricingRuleForm from '@/components/configure/PricingRuleForm';
import { PricingRule } from '@/types';

const NewPricingRulePage: React.FC = () => {
    const router = useRouter();
    const { addPricingRule } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (ruleData: Partial<Omit<PricingRule, 'id'>>) => {
        setIsSaving(true);
        try {
            await addPricingRule(ruleData);
            router.push('/configure/pricing');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/configure/pricing');
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-foreground mb-6">Create New Pricing Rule</h1>
            <PricingRuleForm
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
            />
        </div>
    );
};

export default NewPricingRulePage;