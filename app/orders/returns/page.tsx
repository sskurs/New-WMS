'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { RMA, RMAStatus, Order } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { formatDate } from '@/api/utils';
// FIX: Added XCircle to lucide-react imports to resolve the "Cannot find name 'XCircle'" error on line 181.
import { Undo2, ClipboardCheck, Loader, CircleCheck, Search, Filter, Plus, MoreHorizontal, Check, X, Truck, Archive, Package, Eye, XCircle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useRouter } from 'next/navigation';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4">
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            </div>
        </CardContent>
    </Card>
);

const ReturnsManagementPage: React.FC = () => {
    const { rmas, getOrderById, getProductById, loadRmas, loadOrders, loadProducts, dataState, updateRmaStatus, completeRmaAndRestock } = useAppContext();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingRma, setViewingRma] = useState<RMA | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    useEffect(() => {
        loadRmas(true);
        loadOrders(true);
        loadProducts(true);
    }, [loadRmas, loadOrders, loadProducts]);
    
    const isLoading = dataState.rmas.loading || dataState.orders.loading || dataState.products.loading;
    const isDataReady = dataState.rmas.loaded && dataState.orders.loaded && dataState.products.loaded;

    const allStatuses: RMAStatus[] = ['Pending Review', 'Approved', 'Rejected', 'In Transit', 'Received', 'Completed'];
    const [statusFilter, setStatusFilter] = useState<RMAStatus | 'All Status'>('All Status');
    const filterOptions = ['All Status', ...allStatuses];

    const stats = useMemo(() => ({
        total: rmas.length,
        pending: rmas.filter(r => r.status === 'Pending Review').length,
        inProgress: rmas.filter(r => ['Approved', 'In Transit', 'Received'].includes(r.status)).length,
        completed: rmas.filter(r => r.status === 'Completed').length,
    }), [rmas]);

    const filteredRmas = useMemo(() => {
        return rmas.map(rma => {
            const calculatedRefundAmount = rma.items.reduce((total, rmaItem) => {
                const order = getOrderById(rma.orderId);
                const orderItem = order?.items.find(item => item.productId === rmaItem.productId);
                const price = orderItem?.price ?? getProductById(rmaItem.productId)?.price ?? 0;
                return total + (price * rmaItem.quantity);
            }, 0);
    
            const finalRefundAmount = rma.refundAmount > 0 ? rma.refundAmount : calculatedRefundAmount;
    
            return { ...rma, refundAmount: finalRefundAmount };
        })
        .filter(rma => {
            const order = getOrderById(rma.orderId);
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === '' ||
                rma.id.toLowerCase().includes(searchTermLower) ||
                rma.orderId.toLowerCase().includes(searchTermLower) ||
                (order?.customerName || '').toLowerCase().includes(searchTermLower) ||
                (order?.customerEmail || '').toLowerCase().includes(searchTermLower);

            const matchesStatus = statusFilter === 'All Status' || rma.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [rmas, searchTerm, statusFilter, getOrderById, getProductById]);

    const paginatedRmas = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRmas.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRmas, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);
    
    const headers: TableHeader[] = [
        { content: 'RMA / Order ID', className: 'w-[15%]' },
        { content: 'Customer', className: 'w-[15%]' },
        { content: 'Status', className: 'w-[12%]' },
        { content: 'Reason', className: 'w-[20%]' },
        { content: 'Priority', className: 'w-[8%]' },
        { content: 'Refund', className: 'w-[8%]' },
        { content: 'Date', className: 'w-[10%]' },
        { content: 'Actions', className: 'text-right w-[12%]' },
    ];

    const getStatusPill = (status: RMAStatus) => {
        const classes: Record<RMAStatus, string> = {
            'Pending Review': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
            'Approved': 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Rejected': 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
            'In Transit': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400',
            'Received': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
            'Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
        };
        return `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}`;
    };

    const getPriorityPill = (priority: Order['priority']) => {
        const classes = {
            High: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400',
            Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
            Low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        };
        return `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[priority]}`;
    }

    const renderTableContent = () => {
        if (isLoading && !rmas.length) {
            return <TableSkeleton headers={headers} rows={5} />;
        }

        if (!isDataReady || filteredRmas.length === 0) {
            return (
                 <EmptyState
                    icon={Undo2}
                    title={!isDataReady ? "Loading Returns..." : "No Return Requests Found"}
                    message={!isDataReady ? "Please wait while we sync with the warehouse ledger." : "There are no RMAs matching your current search and filter criteria."}
                />
            );
        }

        return (
            <Table headers={headers} tableClassName="min-w-[1200px]">
                {paginatedRmas.map((rma) => {
                    const order = getOrderById(rma.orderId);
                    return (
                        <tr key={rma.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                             <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-foreground truncate" title={rma.id}>{rma.id}</div>
                                <div className="text-muted-foreground truncate" title={rma.orderId}>Order: {rma.orderId}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={order?.customerName}>
                                {order?.customerName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm"><span className={getStatusPill(rma.status)}>{rma.status}</span></td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 truncate" title={rma.reason}>{rma.reason}</td>
                            <td className="px-6 py-4 text-sm"><span className={getPriorityPill(rma.priority)}>{rma.priority}</span></td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-100">₹{rma.refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(rma.createdAt)}</td>
                            <td className="px-6 py-4 text-right">
                                <Dropdown
                                    align="right"
                                    trigger={
                                        <button className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    }
                                >
                                    <DropdownItem onClick={() => setViewingRma(rma)}>
                                        <div className="flex items-center"><Eye className="h-4 w-4 mr-2" />View Details</div>
                                    </DropdownItem>
                                    {rma.status === 'Pending Review' && (
                                        <>
                                            <DropdownItem onClick={() => updateRmaStatus(rma, 'Approved')}>
                                                <div className="flex items-center text-emerald-600"><Check className="h-4 w-4 mr-2" />Approve</div>
                                            </DropdownItem>
                                            <DropdownItem onClick={() => updateRmaStatus(rma, 'Rejected')}>
                                                <div className="flex items-center text-rose-600"><XCircle className="h-4 w-4 mr-2" />Reject</div>
                                            </DropdownItem>
                                        </>
                                    )}
                                    {rma.status === 'Approved' && (
                                        <DropdownItem onClick={() => updateRmaStatus(rma, 'In Transit')}>
                                            <div className="flex items-center"><Truck className="h-4 w-4 mr-2" />Mark In Transit</div>
                                        </DropdownItem>
                                    )}
                                     {rma.status === 'In Transit' && (
                                        <DropdownItem onClick={() => updateRmaStatus(rma, 'Received')}>
                                            <div className="flex items-center"><Package className="h-4 w-4 mr-2" />Mark as Received</div>
                                        </DropdownItem>
                                    )}
                                    {rma.status === 'Received' && (
                                        <DropdownItem onClick={() => completeRmaAndRestock(rma)}>
                                            <div className="flex items-center text-emerald-600"><Archive className="h-4 w-4 mr-2" />Complete & Restock</div>
                                        </DropdownItem>
                                    )}
                                </Dropdown>
                            </td>
                        </tr>
                    );
                })}
            </Table>
        );
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-foreground">Return Management (RMA)</h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Undo2} title="Total Returns" value={stats.total} color="bg-slate-500" />
                    <StatCard icon={ClipboardCheck} title="Pending Review" value={stats.pending} color="bg-amber-500" />
                    <StatCard icon={Loader} title="In Progress" value={stats.inProgress} color="bg-sky-500" />
                    <StatCard icon={CircleCheck} title="Completed" value={stats.completed} color="bg-emerald-500" />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex-shrink-0">
                                <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">Return Requests</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage customer return requests and RMA processes</p>
                            </div>
                            <div className="flex-1 flex justify-end items-center gap-2 flex-wrap">
                                <div className="relative w-full sm:w-auto sm:max-w-xs">
                                    <Input
                                        id="rma-search"
                                        placeholder="Search by RMA, Order, Customer..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 !py-1.5 text-sm"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                                <div className="relative w-full sm:w-auto">
                                    <Select 
                                        id="status-filter" 
                                        value={statusFilter} 
                                        onChange={e => setStatusFilter(e.target.value as any)}
                                        className="pl-9 !py-1.5 text-sm"
                                    >
                                        {filterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </Select>
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Filter className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                                <Button onClick={() => router.push('/orders/returns/new')} className="flex-shrink-0">
                                    <Plus className="h-4 w-4 mr-2 -ml-1" />
                                    New Return Request
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {renderTableContent()}
                    </CardContent>
                     {isDataReady && filteredRmas.length > itemsPerPage && (
                        <CardFooter>
                            <Pagination
                                itemsPerPage={itemsPerPage}
                                totalItems={filteredRmas.length}
                                currentPage={currentPage}
                                paginate={setCurrentPage}
                            />
                        </CardFooter>
                    )}
                </Card>
            </div>
            
            <Modal isOpen={!!viewingRma} onClose={() => setViewingRma(null)} title={`RMA Details: ${viewingRma?.id}`} size="lg">
                {viewingRma && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Order ID</p>
                                <p className="font-medium text-foreground">{viewingRma.orderId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Customer</p>
                                <p className="font-medium text-foreground">{getOrderById(viewingRma.orderId)?.customerName || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground mb-2">Items to be Returned</h4>
                            <div className="border rounded-md">
                                <Table headers={['Product', 'SKU', 'Quantity']}>
                                    {viewingRma.items.map(item => {
                                        const product = getProductById(item.productId);
                                        return (
                                            <tr key={item.itemId}>
                                                <td className="px-4 py-2 font-medium text-foreground">{product?.name || 'Loading...'}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{product?.sku || 'N/A'}</td>
                                                <td className="px-4 py-2 text-foreground font-bold">{item.quantity}</td>
                                            </tr>
                                        )
                                    })}
                                </Table>
                            </div>
                        </div>
                        <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Refund Amount</p>
                                <p className="font-medium text-lg text-emerald-600">₹{viewingRma.refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                                 <p className="text-sm text-muted-foreground">Reason</p>
                                 <p className="font-medium text-foreground">{viewingRma.reason}</p>
                            </div>
                        </div>
                         {viewingRma.detailedDescription && (
                            <div>
                                <p className="text-sm text-muted-foreground">Details</p>
                                <p className="text-sm text-foreground italic bg-muted p-2 rounded-md">{viewingRma.detailedDescription}</p>
                            </div>
                        )}
                        <div className="flex justify-end pt-4">
                            <Button variant="secondary" onClick={() => setViewingRma(null)}>Close Details</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default ReturnsManagementPage;