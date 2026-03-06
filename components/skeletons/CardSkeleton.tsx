import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';

interface CardSkeletonProps {
    hasHeader?: boolean;
    lineCount?: number;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ hasHeader = true, lineCount = 3 }) => {
    return (
        <Card>
            {hasHeader && (
                <CardHeader>
                    <div className="h-5 skeleton-green w-1/2 mb-2"></div>
                    <div className="h-4 skeleton-green w-3/4"></div>
                </CardHeader>
            )}
            <CardContent className="space-y-4">
                {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                        <div className="h-10 w-10 skeleton-green rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                           <div className="h-4 skeleton-green w-full"></div>
                           {i % 2 === 0 && <div className="h-4 skeleton-green w-5/6"></div>}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default CardSkeleton;