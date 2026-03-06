

'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Order } from '@/types';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { CurrencyDollarIcon } from '@/components/icons/CurrencyDollarIcon';
import { ArchiveBoxIcon } from '@/components/icons/ArchiveBoxIcon';
import { CubeIcon } from '@/components/icons/CubeIcon';
import { ChartBarIcon } from '@/components/icons/ChartBarIcon';
import { formatDate, formatCurrency } from '@/api/utils';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import Pagination from '@/components/ui/Pagination';

const Analytics: React.FC = () => {
    const { orders, getProductById, loadOrders, loadProducts, dataState } = useAppContext();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadOrders();
        loadProducts();
    }, [loadOrders, loadProducts]);

    const isDataReady = useMemo(() => dataState.orders.loaded && dataState.products.loaded, [dataState]);

    const analyticsData = useMemo(() => {
        const historicalOrders = orders
            .filter(o => ['Shipped', 'Completed', 'Returned', 'Cancelled'].includes(o.status))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const totalRevenue = historicalOrders.reduce((sum: number, order) => {
            if (order.status === 'Cancelled' || order.status === 'Returned') return sum;
            return sum + (order.totalAmount ?? 0);
        }, 0);

        const totalOrders = historicalOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const productSales = historicalOrders.reduce((acc, order) => {
        if (order.status === 'Cancelled' || order.status === 'Returned') return acc;
        order.items.forEach(item => {
            acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        });
        return acc;
        }, {} as Record<string, number>);

        const bestSellingProductId = Object.keys(productSales).sort((a, b) => productSales[b] - productSales[a])[0];
        const bestSellingProduct = getProductById(bestSellingProductId);

        const monthlyData = historicalOrders.reduce((acc, order) => {
            if (order.status === 'Cancelled' || order.status === 'Returned') return acc;
            const month = new Date(order.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
            const orderTotal = order.totalAmount ?? 0;
            if(!acc[month]) {
                acc[month] = { revenue: 0, orders: 0 };
            }
            acc[month].revenue += orderTotal;
            acc[month].orders += 1;
            return acc;
        }, {} as Record<string, {revenue: number; orders: number}>);
        
        const sortedMonths = Object.keys(monthlyData).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        const maxMonthlyRevenue = Math.max(...Object.values(monthlyData).map((d: { revenue: number }) => d.revenue));


        return {
        historicalOrders,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        bestSellingProduct: bestSellingProduct ? `${bestSellingProduct.name} (${productSales[bestSellingProductId]} units)` : 'N/A',
        monthlyData,
        sortedMonths,
        maxMonthlyRevenue
        };
    }, [orders, getProductById]);
    
    const paginatedHistoricalOrders = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return analyticsData.historicalOrders.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [analyticsData.historicalOrders, currentPage]);

    if (!isDataReady) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={CurrencyDollarIcon} title="Total Revenue" value={formatCurrency(analyticsData.totalRevenue)} />
            <StatCard icon={ArchiveBoxIcon} title="Total Orders" value={analyticsData.totalOrders.toString()} />
            <StatCard icon={CurrencyDollarIcon} title="Avg. Order Value" value={formatCurrency(analyticsData.averageOrderValue)} />
            <StatCard icon={CubeIcon} title="Best Seller" value={analyticsData.bestSellingProduct} className="truncate" />
        </div>

        <Card>
            <CardHeader className="flex items-center space-x-2">
                <ChartBarIcon className="h-6 w-6 text-slate-500" />
                <h2 className="text-xl font-medium">Monthly Performance</h2>
            </CardHeader>
            <CardContent>
                {analyticsData.sortedMonths.length > 0 ? (
                    <div className="flex items-end space-x-4 h-64 overflow-x-auto pb-4">
                        {analyticsData.sortedMonths.map(month => {
                            const monthData = analyticsData.monthlyData[month];
                            const barHeight = analyticsData.maxMonthlyRevenue > 0 ? (monthData.revenue / analyticsData.maxMonthlyRevenue) * 100 : 0;
                            return (
                                <div key={month} className="flex flex-col items-center flex-shrink-0 w-24 text-center">
                                    <div className="text-sm font-bold text-slate-700">₹{monthData.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="w-12 h-full bg-slate-200 rounded-t-md flex items-end mt-1">
                                        <div className="w-full bg-primary-500 rounded-t-md" style={{height: `${barHeight}%`}}></div>
                                    </div>
                                    <div className="mt-2 text-xs font-medium text-slate-500">{month}</div>
                                </div>
                            )
                        })}
                    </div>
                ) : <p className="text-center text-slate-500 py-8">No sales data available to generate chart.</p>}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
            <h2 className="text-xl font-medium">Order History</h2>
            </CardHeader>
            <CardContent>
                {!isDataReady ? (
                    <TableSkeleton headers={['Order ID', 'Customer', 'Date', 'Total', 'Status']} rows={itemsPerPage} />
                ) : analyticsData.historicalOrders.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No historical orders found.</p>
                ) : (
                    <Table headers={['Order ID', 'Customer', 'Date', 'Total', 'Status']}>
                        {paginatedHistoricalOrders.map((order: Order) => {
                        const total = order.totalAmount ?? 0;
                        return (
                            <tr key={order.id}>
                            <td className="px-6 py-4 text-sm font-medium">{order.id}</td>
                            <td className="px-6 py-4 text-sm">{order.customerName}</td>
                            <td className="px-6 py-4 text-sm">{formatDate(order.createdAt)}</td>
                            <td className="px-6 py-4 text-sm">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-6 py-4 text-sm">{order.status}</td>
                            </tr>
                        );
                        })}
                    </Table>
                )}
            </CardContent>
            {analyticsData.historicalOrders.length > 0 && (
                <CardFooter>
                    <Pagination
                        itemsPerPage={itemsPerPage}
                        totalItems={analyticsData.historicalOrders.length}
                        currentPage={currentPage}
                        paginate={setCurrentPage}
                    />
                </CardFooter>
            )}
        </Card>
        </div>
    );
};

interface StatCardProps {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title: string;
    value: string;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, className }) => (
    <Card>
        <CardContent className="flex items-center space-x-4 p-4">
            <div className="bg-slate-100 p-3 rounded-full">
                <Icon className="h-6 w-6 text-slate-600" />
            </div>
            <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className={`text-2xl font-bold text-slate-800 ${className}`}>{value}</p>
            </div>
        </CardContent>
    </Card>
)

export default Analytics;