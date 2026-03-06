
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DeprecatedPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.replace('/inventory/catalog');
    }, [router]);
    return <div className="p-8 text-center text-muted-foreground">Redirecting to the correct page...</div>;
};

export default DeprecatedPage;
