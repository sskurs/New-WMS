'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
    ArchiveRestore,
    PackageSearch,
    Truck,
    RefreshCw,
    ArrowRight,
    Package,
    Box,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle
} from 'lucide-react';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';

// Stat Card for KPIs
const StatCard = ({ icon: Icon, title, value, color, href }: { icon: React.ElementType, title: string, value: string | number, color: string, href: string }) => (
    <Link href={href}>
        <Card className="hover:-translate-y-1 transition-transform duration-300">
             <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}`}>
                        <Icon className={`h-6 w-6 text-white`} />
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">{value}</p>
                    <p className="text-sm font-medium text-muted-foreground truncate mt-1">{title}</p>
                </div>
            </CardContent>
        </Card>
    </Link>
);

interface OperationSummaryCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
    children: React.ReactNode;
    color: string;
}

// Summary Card for each operation
const OperationSummaryCard: React.FC<OperationSummaryCardProps> = ({ icon: Icon, title, description, href, children, color }) => (
    <Card className="h-full flex flex-col border-l-4" style={{ borderLeftColor: color.includes('sky') ? '#0ea5e9' : color.includes('rose') ? '#e11d48' : '#cbd5e1' }}>
        <CardHeader>
            <div className="flex items-center gap-3">
                <Icon className={`w-7 h-7 ${color}`} />
                <div>
                    <h2 className="font-semibold text-lg text-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            {children}
        </CardContent>
        <CardFooter>
            <Link href={href} className="w-full">
                <Button variant="secondary" className="w-full">
                    Go to {title}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </Link>
        </CardFooter>
    </Card>
);

const OperationsDashboard: React.FC = () => {
    const {
        stocks, pickLists, packedOrders, cycleCounts, getProductById,
        loadStocks, loadPickLists, loadPackedOrders, loadCycleCounts, loadProducts, dataState
    } = useAppContext();

    useEffect(() => {
        loadStocks();
        loadPickLists();
        loadPackedOrders();
        loadCycleCounts();
        loadProducts();
    }, [loadStocks, loadPickLists, loadPackedOrders, loadCycleCounts, loadProducts]);

    const isDataReady = useMemo(() => (
        dataState.stocks.loaded && dataState.pickLists.loaded && dataState.packedOrders.loaded && dataState.cycleCounts.loaded && dataState.products.loaded
    ), [dataState]);

    const stats = useMemo(() => {
        const receivingStock = stocks.filter(s => s.locationId === null && s.quantity > 0);
        const activePickLists = pickLists.filter(p => p.status !== 'Picked');
        const readyToPack = pickLists.filter(p => p.status === 'Picked');
        const readyToShip = packedOrders.filter(p => p.status === 'Packed');
        const activeCycleCounts = cycleCounts.filter(cc => cc.status === 'In Progress' || cc.status === 'Pending');

        return { receivingStock, activePickLists, readyToPack, readyToShip, activeCycleCounts };
    }, [stocks, pickLists, packedOrders, cycleCounts]);

    if (!isDataReady) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-10 animate-fadeIn">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
                <p className="text-muted-foreground">Unified view of warehouse pipelines.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* INBOUND SECTION */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-500 rounded-lg"><ArrowDownLeft className="text-white w-5 h-5" /></div>
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">Inbound Pipeline</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard title="Dock Receipts" value={stats.receivingStock.length} icon={ArchiveRestore} color="bg-sky-500" href="/operations/put-away" />
                        <StatCard title="Put-Away Tasks" value={stats.receivingStock.length} icon={CheckCircle} color="bg-sky-600" href="/operations/put-away-confirmation" />
                    </div>

                    <OperationSummaryCard
                        icon={ArchiveRestore}
                        title="Put-Away"
                        description="Items currently on the receiving dock."
                        href="/operations/put-away"
                        color="text-sky-500"
                    >
                        {stats.receivingStock.length > 0 ? (
                             <ul className="space-y-2 text-sm">
                                {stats.receivingStock.slice(0, 4).map(stock => {
                                    const product = getProductById(stock.productId);
                                    return (
                                        <li key={stock.productId} className="flex justify-between p-2 rounded-md hover:bg-accent">
                                            <span className="text-foreground truncate font-medium" title={product?.name}>{product?.name || 'Loading...'}</span>
                                            <span className="text-sky-600 font-bold">{stock.quantity} Units</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p className="text-center text-muted-foreground py-8">Receiving dock is empty.</p>}
                    </OperationSummaryCard>
                </div>

                {/* OUTBOUND SECTION */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500 rounded-lg"><ArrowUpRight className="text-white w-5 h-5" /></div>
                        <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">Outbound Pipeline</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard title="Open Pick Lists" value={stats.activePickLists.length} icon={PackageSearch} color="bg-rose-500" href="/operations/picking" />
                        <StatCard title="Ready to Ship" value={stats.readyToShip.length} icon={Truck} color="bg-rose-600" href="/operations/packing-shipping" />
                    </div>

                    <OperationSummaryCard
                        icon={PackageSearch}
                        title="Picking"
                        description="Customer orders waiting for fulfillment."
                        href="/operations/picking"
                        color="text-rose-500"
                    >
                        {stats.activePickLists.length > 0 ? (
                            <ul className="space-y-2 text-sm">
                                {stats.activePickLists.slice(0, 4).map(list => (
                                    <li key={list.id} className="flex justify-between p-2 rounded-md hover:bg-accent border-b last:border-0 border-border/50">
                                        <span className="text-foreground font-medium">Order {list.orderId}</span>
                                        <span className={`font-semibold text-xs px-2 py-1 rounded-full ${list.status === 'In Progress' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>{list.status}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center text-muted-foreground py-8">No orders awaiting picking.</p>}
                    </OperationSummaryCard>
                </div>
            </div>
            
            {/* General Utilities */}
            <div className="pt-10 border-t">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-muted-foreground" />
                        Inventory Control
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="hover:border-primary transition-colors">
                        <Link href="/operations/cycle-counting" className="block p-5">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Active Cycle Counts</p>
                            <p className="text-2xl font-bold text-foreground">{stats.activeCycleCounts.length}</p>
                            <p className="text-xs text-primary font-semibold mt-4 flex items-center">Open Confounding Tasks <ArrowRight className="w-3 h-3 ml-1" /></p>
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default OperationsDashboard;