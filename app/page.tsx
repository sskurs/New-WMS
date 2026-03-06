
'use client';

import React, { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/contexts/AppContext';
import { useLocale } from '@/contexts/LocaleContext'; // Import
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { InboundShipment, PackedOrder, OrderStatus, Order, RMA } from '@/types';
import { Package, ShoppingCart, DollarSign, PieChart, ArrowUp, ArrowDown, ShoppingBag, ChevronRight, Zap, AlertTriangle, Clock, Truck, SlidersHorizontal } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/api/utils';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';

// --- Child Components for Dashboard ---

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    trend?: string;
    trendDirection?: 'up' | 'down';
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendDirection, color }) => (
    <Card className="hover:-translate-y-1 transition-transform duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}`}>
                <Icon className={`h-6 w-6 text-white`} />
            </div>
             {trend && (
                <div className={`flex items-center text-xs font-semibold ${trendDirection === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trendDirection === 'up' ? 
                    <ArrowUp className="h-3 w-3 mr-0.5" /> : 
                    <ArrowDown className="h-3 w-3 mr-0.5" />
                }
                <span>{trend}</span>
                </div>
            )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-muted-foreground truncate mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
);

const ActivityItem: React.FC<{ activity: any }> = ({ activity }) => {
    const { getProductById, getSupplierById, purchaseOrders } = useAppContext();
    
    const ICONS: Record<string, React.ReactNode> = {
        adjustment: <SlidersHorizontal className="h-5 w-5 text-amber-500" />,
        receipt: <Truck className="h-5 w-5 text-sky-500" />,
        shipped: <ShoppingCart className="h-5 w-5 text-emerald-500" />
    };

    const renderContent = () => {
        switch(activity.type) {
            case 'adjustment': {
                const rma = activity.data as RMA;
                const match = rma.detailedDescription?.match(/^\[(Increase|Decrease)\]\s*(.*)/);
                const type = match ? match[1] : 'Adjustment';
                const item = rma.items[0];
                if (!item) return null;
                return <p><span className="font-medium text-foreground">Stock {type}</span> for {getProductById(item.productId)?.name || 'Unknown'}: {item.quantity} units.</p>;
            }
            case 'receipt': {
                const ship = activity.data as InboundShipment;
                const po = purchaseOrders.find(p => p.id === ship.purchaseOrderId);
                const supplier = po ? getSupplierById(po.supplierId) : null;
                return <p><span className="font-medium text-foreground">Shipment Received</span> from {supplier?.name || 'N/A'}.</p>;
            }
            case 'shipped': {
                const order = activity.data as PackedOrder;
                return <p><span className="font-medium text-foreground">Order {order.orderId}</span> has been shipped.</p>;
            }
            default: return null;
        }
    };

    return (
        <li className="flex items-start space-x-4 p-4 hover:bg-accent transition-colors">
            <div className="p-2 bg-muted rounded-full mt-1">{ICONS[activity.type]}</div>
            <div className="flex-grow text-sm">
                {renderContent()}
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(activity.date)}</p>
            </div>
        </li>
    );
};

const RecentOrders: React.FC = () => {
    const { orders } = useAppContext();
    const { t } = useLocale();
    const recentOrders = orders
        .filter(o => o.status === 'Pending' || o.status === 'Processing')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-lg text-foreground">{t('dashboard.activeOrdersTitle')}</h2>
                        <p className="text-sm text-muted-foreground">{t('dashboard.activeOrdersDescription')}</p>
                    </div>
                    <Link href="/orders/processing">
                        <Button variant="secondary" size="sm">{t('dashboard.viewAll')}</Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {recentOrders.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {recentOrders.map(order => {
                            const totalValue = order.totalAmount ?? 0;
                            return (
                                <li key={order.id} className="hover:bg-accent transition-colors">
                                    <Link href={`/orders/tracking`} className="block p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-foreground">{order.id}</p>
                                                <p className="text-sm text-muted-foreground">{order.customerName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-foreground">₹{totalValue.toLocaleString('en-IN')}</p>
                                                <p className={`text-xs font-medium mt-1 ${order.priority === 'High' ? 'text-rose-500' : order.priority === 'Medium' ? 'text-amber-500' : 'text-slate-400'}`}>{order.priority} Priority</p>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ) : <p className="text-center text-muted-foreground p-10">{t('dashboard.noPendingOrders')}</p>}
            </CardContent>
        </Card>
    );
};

const Dashboard: React.FC = () => {
    const { 
        dataState,
        products, stocks, orders, locations, 
        inboundShipments, packedOrders, rmas,
        getProductById, getStockForProduct, kpis
    } = useAppContext();
    const { t } = useLocale(); // Use locale
    const { totalProducts, activeOrders, inventoryValue } = kpis;

    const { warehouseUtilization, lowStockProducts, allActivities } = useMemo(() => {
        // Only calculate when necessary data is loaded.
        const canRenderKpis = dataState.products.loaded && dataState.stocks.loaded && dataState.orders.loaded;
        const canRenderUtilization = canRenderKpis && dataState.locations.loaded;

        if (!canRenderKpis) {
            return { warehouseUtilization: 0, lowStockProducts: [], allActivities: [] };
        }
        
        const warehouseUtilization = canRenderUtilization ? (() => {
            const totalStockedUnits = stocks.filter(s => s.locationId !== null).reduce((acc: number, s) => acc + s.quantity, 0);
            const totalCapacity = locations.reduce((acc: number, l) => acc + l.capacity, 0);
            return totalCapacity > 0 ? (totalStockedUnits / totalCapacity) * 100 : 0;
        })() : 0;
        
        const lowStockItems = products
            .map(p => ({
                product: p,
                totalStock: getStockForProduct(p.id).reduce((sum, s) => sum + s.quantity, 0)
            }))
            .filter(({ product, totalStock }) => totalStock <= product.reorderPoint && product.supplierId);


        // Build a dynamic activity feed from any data that has been loaded by the user navigating the app.
        const activities: any[] = [];
        if (dataState.packedOrders.loaded) {
            activities.push(...packedOrders.filter(o => o.shippedAt).map(o => ({ id: o.id, date: new Date(o.shippedAt!), type: 'shipped' as const, data: o })));
        }
        if (dataState.rmas.loaded) {
            activities.push(...rmas.filter(rma => rma.orderId === '0').map(rma => ({ id: rma.id, date: new Date(rma.createdAt), type: 'adjustment' as const, data: rma })));
        }
        if (dataState.inboundShipments.loaded) {
            activities.push(...inboundShipments.map(ship => ({ id: ship.id, date: new Date(ship.receivedAt), type: 'receipt' as const, data: ship })));
        }
        const allActivities = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

        return { warehouseUtilization, lowStockProducts: lowStockItems, allActivities };
    }, [dataState, products, stocks, orders, locations, packedOrders, rmas, inboundShipments, getProductById, getStockForProduct]);

    const kpiCards: StatCardProps[] = [
        { title: t('dashboard.totalProducts'), value: totalProducts.toLocaleString(), icon: Package, color: 'bg-violet-500', trend: '+12%', trendDirection: 'up' },
        { title: t('dashboard.activeOrders'), value: activeOrders.toLocaleString(), icon: ShoppingCart, color: 'bg-sky-500', trend: '+8%', trendDirection: 'up' },
        { title: t('dashboard.inventoryValue'), value: formatCurrency(inventoryValue), icon: DollarSign, color: 'bg-emerald-500', trend: '-2%', trendDirection: 'down' },
        { title: t('dashboard.warehouseUtilization'), value: dataState.locations.loaded ? `${warehouseUtilization.toFixed(0)}%` : '...', icon: PieChart, color: 'bg-amber-500' }
    ];

    if (!dataState.products.loaded || !dataState.stocks.loaded || !dataState.orders.loaded) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
        <h1 className="text-2xl font-semibold text-foreground">{t('dashboard.title')}</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiCards.map(kpi => <StatCard key={kpi.title} {...kpi} />)}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <RecentOrders />
            </div>
            
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                            <div>
                                <h2 className="font-semibold text-lg text-foreground">{t('dashboard.lowStockAlerts')}</h2>
                                <p className="text-sm text-muted-foreground">{t('dashboard.lowStockAlertsDescription')}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-0">
                        {lowStockProducts.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {lowStockProducts.slice(0, 3).map(({ product: p, totalStock }) => {
                                    const status = totalStock <= 0 ? 'Out of Stock' : 'Low Stock';
                                    return (
                                        <li key={p.id}>
                                            <Link
                                                href={`/suppliers/purchase-orders/new?supplierId=${p.supplierId}&productId=${p.id}`}
                                                className="block px-5 py-3 hover:bg-accent transition-colors"
                                            >
                                                <div className="flex justify-between items-center mb-1 text-sm">
                                                    <p className="font-medium text-foreground truncate" title={p.name}>{p.name}</p>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status === 'Out of Stock' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-foreground whitespace-nowrap">
                                                    Stock: <span className={status === 'Out of Stock' ? 'text-rose-500' : 'text-amber-500'}>{totalStock}</span> / {p.reorderPoint}
                                                </p>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p className="text-center text-muted-foreground p-10">{t('dashboard.noOutstandingAlerts')}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <Clock className="h-6 w-6 text-muted-foreground" />
                            <h2 className="font-semibold text-lg text-foreground">{t('dashboard.recentActivity')}</h2>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {allActivities.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {allActivities.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
                            </ul>
                        ) : <p className="text-center text-muted-foreground p-10">{t('dashboard.noRecentActivity')}</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
        </div>
    );
};

export default Dashboard;
