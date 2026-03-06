'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Order, OrderStatus } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { formatDate } from '@/api/utils';
import { Clock, Loader2, Truck, CheckCircle, Undo2, XCircle, PackageCheck, ShoppingCart } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import Pagination from '@/components/ui/Pagination';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';

// New StatCard component for the dashboard on top
const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string; }> = ({ title, value, icon: Icon, color }) => (
    <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <p className="text-sm font-medium text-muted-foreground truncate mb-2">{title}</p>
            <div className="flex items-center gap-2 mt-1">
                 <div className={`p-2.5 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold text-foreground">{value}</p>
            </div>
        </CardContent>
    </Card>
);


const OrderStatusTracking: React.FC = () => {
  const { orders, loadOrders, dataState, getProductById, loadProducts } = useAppContext();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders(true); // Force a reload to ensure the latest data is fetched
    loadProducts(); // Ensure products are available for item details
  }, [loadOrders, loadProducts]);
  
  const isDataReady = useMemo(() => dataState.orders.loaded, [dataState]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const paginatedOrders = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sortedOrders.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
  }, [sortedOrders, currentPage]);

  const orderStats = useMemo(() => {
    const stats: Record<OrderStatus, number> = {
        'Pending': 0,
        'Processing': 0,
        'Ready for Pickup': 0,
        'Shipped': 0,
        'Returned': 0,
        'Completed': 0,
        'Cancelled': 0,
    };
    orders.forEach(order => {
        if (stats[order.status] !== undefined) {
            stats[order.status]++;
        }
    });
    return stats;
  }, [orders]);

  const statusMeta: Record<OrderStatus, { icon: React.ElementType; color: string; }> = {
    'Pending': { icon: Clock, color: 'text-slate-500' },
    'Processing': { icon: Loader2, color: 'text-sky-500' },
    'Ready for Pickup': { icon: PackageCheck, color: 'text-cyan-500' },
    'Shipped': { icon: Truck, color: 'text-blue-500' },
    'Completed': { icon: CheckCircle, color: 'text-emerald-500' },
    'Returned': { icon: Undo2, color: 'text-amber-500' },
    'Cancelled': { icon: XCircle, color: 'text-rose-500' }
  };

  const getStatusColor = (status: OrderStatus) => {
      const colors: Record<OrderStatus, string> = {
          Pending: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
          Processing: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
          'Ready for Pickup': 'bg-cyan-100 text-cyan-800',
          Shipped: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
          Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
          Returned: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
          Cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
      };
      return colors[status] || 'bg-slate-200';
  }
  
  const getPriorityColor = (priority: Order['priority']) => {
      const colors: Record<Order['priority'], string> = {
          High: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
          Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
          Low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      };
      return colors[priority];
  };
  
  const headers = ['Customer', 'Item Details', 'Date', 'Total', 'Priority', 'Status'];

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-rose-500"/>
              Order Status Tracking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">A complete overview of all customer orders and their current status.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {isDataReady ? (
                (Object.keys(statusMeta) as OrderStatus[]).map(status => (
                    <StatCard 
                        key={status}
                        title={status}
                        value={orderStats[status]}
                        icon={statusMeta[status].icon}
                        color={statusMeta[status].color}
                    />
                ))
            ) : (
                Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
            )}
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-medium">All Orders</h2>
          </CardHeader>
          <CardContent>
            {!isDataReady ? (
                <TableSkeleton headers={headers} rows={10} />
            ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No Orders Found</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create your first order to see it here.</p>
                </div>
            ) : (
                <Table headers={headers}>
                {paginatedOrders.map((order) => {
                    const total = order.totalAmount ?? 0;
                    return (
                    <tr key={order.id}>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{order.customerName}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {order.items && order.items.length > 0 ? (
                                <ul className="space-y-1">
                                    {order.items.map((item, index) => {
                                        const product = getProductById(item.productId);
                                        return (
                                            <li key={index} className="truncate" title={`${product?.name || item.productId}: ${item.quantity} x ₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                {product?.name || `ID: ${item.productId.slice(0,5)}...`}: {item.quantity} x ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                'No items'
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(order.createdAt)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-100">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                                {order.priority}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </td>
                    </tr>
                    );
                })}
                </Table>
            )}
          </CardContent>
          {orders.length > 0 && (
            <CardFooter>
                <Pagination
                    itemsPerPage={itemsPerPage}
                    totalItems={sortedOrders.length}
                    currentPage={currentPage}
                    paginate={setCurrentPage}
                />
            </CardFooter>
          )}
        </Card>
    </div>
  );
};

export default OrderStatusTracking;