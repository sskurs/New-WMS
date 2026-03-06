
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import { Product } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { AlertTriangle, Archive, DollarSign, Users, Package, Search } from 'lucide-react';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import { formatCurrency } from '@/api/utils';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjQwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz4KICA8cGF0aCBkPSJNMjAwIDIwSDQwQzI5IDIwIDIwIDI5IDIwIDQwVjE2MEMyMCAxNzEgMjkgMTgwIDQwIDE4MEgyMDBDMjExIDE4MCAyMjAgMTcxIDIyMCAxNjBWNDBDMjIwIDI5IDIxMSAyMCAyMDAgMjBaTTEwMCA4MEMxMDAgNjkgOTEgNjAgODAgNjBDNjkgNjAgNjAgNjkgNjAgODBDNjAgOTEgNjkgMTAwIDgwIDEwMEM5MSAxMDAgMTAwIDkxIDEwMCA4MFpNMTgwIDE2MEg2MEw5MCAxMjBMMTIwIDE1MEwxNTAgMTAwTDIwMCAxNjBIMTgwWiIgZmlsbD0iI0NCRDVFMSIvPgo8L3N2Zz4=';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);

type AlertProduct = Product & { currentStock: number; status: 'In Stock' | 'Low Stock' | 'Out of Stock' };

const LowStockAlerts: React.FC = () => {
  const { 
    products, getStockForProduct, getSupplierById,
    loadProducts, loadStocks, loadSuppliers, dataState 
  } = useAppContext();
  const router = useRouter();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadProducts(true);
    loadStocks(true);
    loadSuppliers(true);
  }, [loadProducts, loadStocks, loadSuppliers]);
  
  const isDataReady = useMemo(() => (
    dataState.products.loaded && dataState.stocks.loaded && dataState.suppliers.loaded
  ), [dataState]);

  // Derive alert products from existing state instead of using an effect that updates products.
  const allAlertProducts = useMemo((): AlertProduct[] => {
    if (!isDataReady) return [];

    return products.map(p => {
        const totalStock = getStockForProduct(p.id).reduce((sum, s) => sum + s.quantity, 0);
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        
        if (totalStock <= 0) {
            status = 'Out of Stock';
        } else if (totalStock <= p.reorderPoint) {
            status = 'Low Stock';
        }
        
        return { ...p, currentStock: totalStock, status } as AlertProduct;
    }).filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');
  }, [isDataReady, products, getStockForProduct]);

  const filteredAlertProducts = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return allAlertProducts.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.sku.toLowerCase().includes(lowerSearch)
    );
  }, [allAlertProducts, searchTerm]);

  const paginatedAlertProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAlertProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAlertProducts, currentPage]);

  const stats = useMemo(() => {
    const calculatedStats = allAlertProducts.reduce((acc, product) => {
        const deficit = product.reorderPoint - product.currentStock;
        if (deficit > 0) {
             acc.unitDeficit += deficit;
             acc.replenishmentValue += deficit * product.price;
        }
        if (product.supplierId) {
            acc.suppliers.add(product.supplierId);
        }
        return acc;
    }, {
        unitDeficit: 0,
        replenishmentValue: 0,
        suppliers: new Set<string>()
    });

    return {
        lowStockItemsCount: allAlertProducts.filter(p => p.status === 'Low Stock').length,
        outOfStockItemsCount: allAlertProducts.filter(p => p.status === 'Out of Stock').length,
        unitDeficit: calculatedStats.unitDeficit,
        replenishmentValue: calculatedStats.replenishmentValue,
        suppliersAffected: calculatedStats.suppliers.size,
    };
  }, [allAlertProducts]);


  const getStatusPillClasses = (status: 'Low Stock' | 'Out of Stock') => {
    switch (status) {
        case 'Low Stock': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400';
        case 'Out of Stock': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400';
    }
  };
  
  const handleRowClick = (product: AlertProduct) => {
    if (product.supplierId && product.supplierId !== '0') {
        router.push(`/suppliers/purchase-orders/new?supplierId=${product.supplierId}&productId=${product.id}`);
    } else {
        addToast({
            type: 'info',
            message: `Cannot create PO for "${product.name}". No supplier is assigned.`
        });
    }
  };

  const headers = ['Product', 'SKU', 'Status', 'Current Stock', 'Reorder Point', 'Supplier'];

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {!isDataReady ? (
                <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </>
            ) : (
                <>
                    <StatCard icon={AlertTriangle} title="Low Stock Items" value={stats.lowStockItemsCount} color="text-amber-500" />
                    <StatCard icon={Archive} title="Out of Stock Items" value={stats.outOfStockItemsCount} color="text-rose-500" />
                    <StatCard icon={DollarSign} title="Replenishment Value" value={formatCurrency(stats.replenishmentValue)} color="text-emerald-500" />
                    <StatCard icon={Users} title="Suppliers Affected" value={stats.suppliersAffected} color="text-sky-500" />
                </>
            )}
        </div>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">Stock Alerts</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
                <Input
                    id="alert-search"
                    placeholder="Search by Product or SKU..."
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="pl-9 !py-1.5 text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isDataReady ? (
                 <TableSkeleton headers={headers} rows={5} />
            ) : filteredAlertProducts.length > 0 ? (
              <Table headers={headers}>
                {paginatedAlertProducts.map((product) => {
                  const supplierName = product.supplierName || getSupplierById(product.supplierId)?.name || 'N/A';
                  return (
                    <tr 
                      key={product.id}
                      className="hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => handleRowClick(product)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground flex items-center">
                        <div className="h-8 w-8 rounded bg-muted overflow-hidden flex-shrink-0 mr-3 border border-border">
                            <img 
                                src={product.imageUrl || PLACEHOLDER_IMAGE} 
                                alt={product.name} 
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                            />
                        </div>
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusPillClasses(product.status as 'Low Stock' | 'Out of Stock')}`}>
                              {product.status}
                          </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${product.status === 'Out of Stock' ? 'text-rose-600' : 'text-amber-600'}`}>{product.currentStock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{product.reorderPoint}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{supplierName}</td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
                <EmptyState 
                    icon={Package}
                    title={searchTerm ? "No Matches Found" : "All Good!"}
                    message={searchTerm ? "No products match your search." : "No products are currently low on stock or out of stock."}
                />
            )}
          </CardContent>
          {filteredAlertProducts.length > itemsPerPage && (
              <CardFooter>
                  <Pagination 
                      itemsPerPage={itemsPerPage}
                      totalItems={filteredAlertProducts.length}
                      currentPage={currentPage}
                      paginate={setCurrentPage}
                  />
              </CardFooter>
          )}
        </Card>
    </div>
  );
};

export default LowStockAlerts;
