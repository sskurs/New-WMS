import React from 'react';
import Card, { CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';

const FormSkeleton: React.FC = () => {
    return (
        <Card>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                    <div className="h-4 w-20 skeleton-green"></div>
                    <div className="h-10 w-full skeleton-green"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="h-4 w-20 skeleton-green"></div>
                        <div className="h-10 w-full skeleton-green"></div>
                    </div>
                     <div className="space-y-2">
                        <div className="h-4 w-20 skeleton-green"></div>
                        <div className="h-10 w-full skeleton-green"></div>
                    </div>
                </div>
                 <div className="space-y-2">
                    <div className="h-4 w-20 skeleton-green"></div>
                    <div className="h-24 w-full skeleton-green"></div>
                </div>
                 <div className="space-y-2">
                    <div className="h-4 w-20 skeleton-green"></div>
                    <div className="h-10 w-full skeleton-green"></div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-3">
                <div className="h-9 w-24 skeleton-green"></div>
                <div className="h-9 w-32 skeleton-green"></div>
            </CardFooter>
        </Card>
    );
};

export default FormSkeleton;