import React from 'react';
import Card, { CardContent } from '../ui/Card';

const StatCardSkeleton: React.FC = () => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className="p-3 rounded-full skeleton-green w-12 h-12 flex-shrink-0"></div>
            <div className="ml-4 space-y-2 flex-1">
                <div className="h-8 skeleton-green w-20"></div>
                <div className="h-4 skeleton-green w-32"></div>
            </div>
        </CardContent>
    </Card>
);

export default StatCardSkeleton;