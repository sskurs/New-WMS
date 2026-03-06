
'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const DeprecatedDynamicPage = () => {
    const router = useRouter();
    const params = useParams();
    const productId = params.productId as string;

    useEffect(() => {
        if (productId) {
            router.replace(`/inventory/catalog/${productId}/edit`);
        }
    }, [router, productId]);
    return <div className="p-8 text-center text-muted-foreground">Redirecting to the correct page...</div>;
};

export default DeprecatedDynamicPage;
