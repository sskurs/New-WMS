import React from 'react';
import Card, { CardContent } from '../ui/Card';

const ProductCardSkeleton: React.FC = () => {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="relative">
          <div className="absolute top-2 left-2 z-10">
              <div className="h-5 w-20 skeleton-green rounded-full"></div>
          </div>
          <div className="aspect-square skeleton-green rounded-none"></div>
      </div>
      <CardContent className="flex-grow flex flex-col p-4">
          <div className="h-5 w-24 skeleton-green rounded-full self-start"></div>
          <div className="h-6 w-3/4 skeleton-green mt-2"></div>
          <div className="h-4 w-1/2 skeleton-green mt-1"></div>
          
          <div className="mt-2 flex items-center">
            <div className="h-4 w-4 skeleton-green rounded-full"></div>
            <div className="h-3 w-2/3 skeleton-green ml-1.5"></div>
          </div>
          
          <div className="mt-auto pt-3 flex justify-between items-end">
            <div className="space-y-1.5">
                <div className="h-4 w-28 skeleton-green"></div>
                <div className="h-3 w-20 skeleton-green"></div>
            </div>
            <div className="h-8 w-20 skeleton-green"></div>
          </div>
      </CardContent>
    </Card>
  );
};

export default ProductCardSkeleton;