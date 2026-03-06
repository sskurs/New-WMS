import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import StatCardSkeleton from './StatCardSkeleton';

const ListCardSkeleton = ({ title, rows = 5 }: { title: string, rows?: number }) => (
    <Card className="h-full">
        <CardHeader>
            <div className="space-y-2">
                <div className="h-6 w-1/2 skeleton-green"></div>
                <div className="h-4 w-3/4 skeleton-green"></div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ul className="divide-y divide-border">
                {Array.from({ length: rows }).map((_, i) => (
                     <li key={i} className="p-4 space-y-2">
                         <div className="flex justify-between items-center">
                            <div className="h-4 w-1/3 skeleton-green"></div>
                            <div className="h-4 w-1/4 skeleton-green"></div>
                         </div>
                          <div className="h-3 w-1/2 skeleton-green"></div>
                     </li>
                ))}
            </ul>
        </CardContent>
    </Card>
)

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
        <div className="h-10 w-48 skeleton-green"></div>
      
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <ListCardSkeleton title="Active Orders" />
            </div>
            
            <div className="space-y-8">
                <ListCardSkeleton title="Low Stock Alerts" rows={3} />
                <ListCardSkeleton title="Recent Activity" rows={3} />
            </div>
        </div>
    </div>
  );
};

export default DashboardSkeleton;