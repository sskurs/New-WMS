
'use client';
import React from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { GalleryVertical } from 'lucide-react';

const GalleryViewPage = () => {
    return (
        <Card>
            <CardContent>
                <EmptyState
                    icon={GalleryVertical}
                    title="Gallery View"
                    message="A gallery view with images of your locations is coming soon."
                />
            </CardContent>
        </Card>
    );
};
export default GalleryViewPage;
