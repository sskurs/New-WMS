'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';

interface LocationUtilizationData {
  id: string;
  name: string;
  utilization: number;
  currentUnits: number;
  capacity: number;
  products: string[];
}

const LocationUtilization: React.FC = () => {
  const { locations, stocks, getProductById } = useAppContext();

  const utilizationData = useMemo<Record<string, LocationUtilizationData[]>>(() => {
    const dataByZone: Record<string, LocationUtilizationData[]> = {};

    locations.forEach(location => {
      const zoneName = location.zone || 'Unzoned';
      if (!dataByZone[zoneName]) {
        dataByZone[zoneName] = [];
      }
      const stockInLocation = stocks.filter(s => s.locationId === location.id);
      const currentUnits = stockInLocation.reduce((sum: number, s) => sum + s.quantity, 0);
      const utilization = location.capacity > 0 ? (currentUnits / location.capacity) * 100 : 0;
      const productsInLocation = stockInLocation.map(s => {
        const product = getProductById(s.productId);
        return `${product?.name || 'Unknown'} (x${s.quantity})`;
      });

      dataByZone[zoneName].push({
        id: location.id,
        name: location.name,
        utilization,
        currentUnits,
        capacity: location.capacity,
        products: productsInLocation,
      });
    });
    return dataByZone;
  }, [locations, stocks, getProductById]);

  const getUtilColor = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-amber-500';
    if (percentage > 0) return 'bg-green-500';
    return 'bg-slate-300 dark:bg-slate-600';
  };

  if (Object.keys(utilizationData).length === 0) {
    return (
        <div className="flex h-full w-full items-center justify-center p-8 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <p className="text-slate-500 dark:text-slate-400">No locations to display utilization for.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(utilizationData).map(([zoneName, locationsInZone]: [string, LocationUtilizationData[]]) => (
        <div key={zoneName}>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">{zoneName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {locationsInZone.map(loc => (
              <div key={loc.id} className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm p-5 border border-slate-200 dark:border-slate-700/60">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={loc.name}>{loc.name}</h3>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{loc.utilization.toFixed(0)}%</span>
                </div>
                <div className="relative pt-1 mt-2">
                  <div className="overflow-hidden h-2.5 text-xs flex rounded bg-slate-200 dark:bg-slate-700">
                    <div style={{ width: `${loc.utilization}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${getUtilColor(loc.utilization)} transition-all duration-500 rounded`}></div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {loc.currentUnits} / {loc.capacity} units used
                </div>
                {loc.products.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Products:</h4>
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {loc.products.slice(0, 3).map((p, index) => <li key={`${loc.id}-${p}-${index}`} className="truncate" title={p}>{p}</li>)}
                      {loc.products.length > 3 && <li className="text-slate-400">...and {loc.products.length - 3} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LocationUtilization;