'use client';

import React, { useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import TableSkeleton from '@/components/skeletons/TableSkeleton';

const InventoryValuation: React.FC = () => {
  const { products, getStockForProduct, loadProducts, loadStocks, dataState } = useAppContext();

  useEffect(() => {
    loadProducts();
    loadStocks();
  }, [loadProducts, loadStocks]);

  const isDataReady = useMemo(() => (
    dataState.products.loaded && dataState.stocks.loaded
  ), [dataState]);

  const valuationData = useMemo(() => {
    const data = products.map(product => {
      const totalStock = getStockForProduct(product.id).reduce((sum: number, s) => sum + s.quantity, 0);
      const value = totalStock * product.price;
      return {
        ...product,
        totalStock,
        value,
      };
    });
    const totalValue = data.reduce((sum: number, p) => sum + p.value, 0);
    return { data, totalValue };
  }, [products, getStockForProduct]);
  
  const headers = ['Product', 'SKU', 'Total Stock', 'Unit Price', 'Total Value'];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-medium">Inventory Valuation Report</h2>
      </CardHeader>
      <CardContent>
        {!isDataReady ? (
            <TableSkeleton headers={headers} rows={10} />
        ) : (
            <Table headers={headers}>
            {valuationData.data.map((item) => (
                <tr key={item.id}>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.sku}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.totalStock}</td>
                <td className="px-6 py-4 text-sm text-slate-500">₹{item.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{item.value.toFixed(2)}</td>
                </tr>
            ))}
            </Table>
        )}
      </CardContent>
      {isDataReady && (
        <CardFooter className="text-right">
              <span className="text-lg font-bold">Grand Total Value:</span>
              <span className="text-xl font-extrabold text-slate-700 ml-2">
                  ₹{valuationData.totalValue.toFixed(2)}
              </span>
          </CardFooter>
      )}
    </Card>
  );
};

export default InventoryValuation;