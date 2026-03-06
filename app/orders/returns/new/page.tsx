
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CreateRmaWizard from '@/components/orders/CreateRmaWizard';


const NewRmaPage = () => {
    const router = useRouter();

    return (
        <CreateRmaWizard
            onCancel={() => router.push('/orders/returns')}
            onSuccess={() => router.push('/orders/returns')}
        />
    );
};

export default NewRmaPage;
