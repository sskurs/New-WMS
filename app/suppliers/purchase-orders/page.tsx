'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { PurchaseOrder } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import { formatDate } from '@/api/utils';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { Plus, Edit, Trash2, MoreHorizontal, Search, Filter, CheckCircle, XCircle, Send, Eye } from 'lucide-react';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { Building2 } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';

const PurchaseOrders: React.FC = () => {
    const { 
        purchaseOrders, getSupplierById, deletePurchaseOrder,
        loadPurchaseOrders, loadSuppliers, dataState, updatePurchaseOrderStatus,
        getProductById, loadProducts
    } = useAppContext();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PurchaseOrder['status'] | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [deletingPO, setDeletingPO] = useState<PurchaseOrder | null>(null);
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

    useEffect(() => {
        loadPurchaseOrders(true);
        loadSuppliers(true);
        loadProducts(true);
    }, [loadPurchaseOrders, loadSuppliers, loadProducts]);
    
    const handleDelete = (po: PurchaseOrder) => {
        setDeletingPO(po);
    };

    const confirmDelete = () => {
        if (deletingPO) {
            deletePurchaseOrder(deletingPO.id);
            setDeletingPO(null);
        }
    };
    
    const filteredPOs = useMemo(() => {
        const processed = purchaseOrders.map(po => ({
            ...po,
            supplierName: po.supplierName || getSupplierById(po.supplierId)?.name || po.supplierId || 'N/A'
        }));

        const filtered = processed.filter(po => {
            const searchLower = searchTerm.toLowerCase();
            const searchMatch = (
                (po.poNumber || '').toLowerCase().includes(searchLower) ||
                (po.id || '').toLowerCase().includes(searchLower) ||
                (po.supplierName || '').toLowerCase().includes(searchLower)
            );
            const statusMatch = statusFilter === 'all' || po.status === statusFilter;
            return searchMatch && statusMatch;
        });

        // Newest first
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    }, [purchaseOrders, searchTerm, statusFilter, getSupplierById]);
    
    const paginatedPOs = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredPOs.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [filteredPOs, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const getStatusColor = (status: PurchaseOrder['status']) => {
        const colors = {
            Draft: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
            Issued: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Partially Received': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
            Received: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
            Cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
        };
        return colors[status];
    };
    
    const headers: TableHeader[] = [
        'Order / PO Number',
        'Supplier',
        'Receiving Progress',
        'Total Cost',
        'Status',
        'Created',
        { content: 'Actions', className: 'text-right' }
    ];
    const statusOptions: (PurchaseOrder['status'] | 'all')[] = ['all', 'Draft', 'Issued', 'Partially Received', 'Received', 'Cancelled'];

    const renderContent = () => {
        if (!dataState.purchaseOrders.loaded || !dataState.suppliers.loaded) {
            return <TableSkeleton headers={headers} rows={5} />;
        }
        if (purchaseOrders.length === 0) {
            return <EmptyState icon={Building2} title="No Purchase Orders" message="Create your first PO to get started." action={{text: 'Create PO', onClick: () => router.push('/suppliers/purchase-orders/new')}} />;
        }
        if (filteredPOs.length === 0) {
            return <div className="text-center py-10"><p className="text-muted-foreground">No purchase orders match your current filters.</p></div>;
        }

        return (
            <Table headers={headers}>
                {paginatedPOs.map((po) => {
                    const totalCost = po.totalAmount ?? 0;
                    const totalOrdered = po.totalQuantity ?? 0;
                    const totalReceived = po.receivedQuantity ?? 0;
                    const receivingProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
                    
                    const canEdit = po.status === 'Draft';
                    const canDelete = ['Draft', 'Issued', 'Cancelled'].includes(po.status);
                    const canIssue = po.status === 'Draft';
                    const canCancel = ['Draft', 'Issued'].includes(po.status);

                    return (
                        <tr key={po.id} className="hover:bg-accent" data-testid={`po-row-${po.id}`}>
                            <td className="px-6 py-4 text-sm">
                                <button 
                                    onClick={() => setViewingPO(po)}
                                    className="text-left group"
                                >
                                    <div className="font-medium text-primary group-hover:underline">Order Number: {po.poNumber}</div>
                                    <div className="text-xs text-muted-foreground">PO Number: {po.id}</div>
                                </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{po.supplierName}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                <div className="flex flex-col">
                                    <span className="mb-1.5">{totalReceived} / {totalOrdered} Received</span>
                                    <ProgressBar value={receivingProgress} />
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-foreground">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-6 py-4 text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(po.status)}`}>
                                {po.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(po.createdAt)}</td>
                            <td className="px-6 py-4 text-right">
                                <Dropdown
                                    align="right"
                                    trigger={
                                        <button className="p-1 rounded-full text-muted-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring" data-testid={`po-actions-trigger-${po.id}`}>
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    }
                                >
                                    <DropdownItem onClick={() => setViewingPO(po)}>
                                        <div className="flex items-center text-primary"><Eye className="h-4 w-4 mr-2" />View Details</div>
                                    </DropdownItem>
                                    {canIssue && (
                                        <DropdownItem 
                                            onClick={() => updatePurchaseOrderStatus(po.id, 'Issued')}
                                            data-testid="issue-po-menu-item"
                                        >
                                            <div className="flex items-center text-emerald-600"><Send className="h-4 w-4 mr-2" />Issue PO</div>
                                        </DropdownItem>
                                    )}
                                    <DropdownItem 
                                        onClick={() => router.push(`/suppliers/purchase-orders/${po.id}/edit`)}
                                        disabled={!canEdit}
                                        title={!canEdit ? "Only Draft orders can be edited." : "Edit PO"}
                                    >
                                        <div className="flex items-center"><Edit className="h-4 w-4 mr-2" />Edit</div>
                                    </DropdownItem>
                                    {canCancel && (
                                        <DropdownItem onClick={() => updatePurchaseOrderStatus(po.id, 'Cancelled')} className="text-amber-600 hover:!text-amber-700">
                                            <div className="flex items-center"><XCircle className="h-4 w-4 mr-2" />Cancel PO</div>
                                        </DropdownItem>
                                    )}
                                    <DropdownItem 
                                        onClick={() => handleDelete(po)} 
                                        className="text-rose-600 dark:text-rose-500 hover:!text-rose-700 dark:hover:!text-rose-400"
                                        disabled={!canDelete}
                                        title={!canDelete ? "This PO cannot be deleted due to its status." : "Delete PO"}
                                    >
                                        <div className="flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</div>
                                    </DropdownItem>
                                </Dropdown>
                            </td>
                        </tr>
                    );
                })}
            </Table>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-4">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-medium">Purchase Orders</h2>
                            <p className="text-sm text-muted-foreground mt-1">Track and manage orders from your suppliers.</p>
                        </div>
                        <Button id="create-po-button" onClick={() => router.push('/suppliers/purchase-orders/new')} className="mt-2 sm:mt-0 flex-shrink-0">
                            <Plus className="h-4 w-4 mr-2 -ml-1"/>
                            Create PO
                        </Button>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative w-full flex-grow">
                            <Input
                                id="po-search"
                                placeholder="Search by PO# or Supplier..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 !py-1.5 text-sm"
                            />
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="relative w-full sm:w-56">
                            <Select
                                id="status-filter"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="pl-9 !py-1.5 text-sm"
                            >
                                {statusOptions.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>)}
                            </Select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                     </div>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
                {dataState.purchaseOrders.loaded && filteredPOs.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredPOs.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!deletingPO} onClose={() => setDeletingPO(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete Purchase Order <strong className="text-foreground">#{deletingPO?.poNumber}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingPO(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>

            {/* PO Details Modal */}
            <Modal 
                isOpen={!!viewingPO} 
                onClose={() => setViewingPO(null)} 
                title={`Purchase Order: ${viewingPO?.poNumber}`}
                size="lg"
            >
                {viewingPO && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Supplier</p>
                                <p className="font-bold text-foreground text-base mt-0.5">{viewingPO.supplierName || getSupplierById(viewingPO.supplierId)?.name || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Status</p>
                                <span className={`mt-1 inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(viewingPO.status)}`}>
                                    {viewingPO.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Created Date</p>
                                <p className="font-medium text-foreground mt-0.5">{formatDate(viewingPO.createdAt)}</p>
                            </div>
                             <div className="text-right">
                                <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">PO ID</p>
                                <p className="font-mono text-foreground mt-0.5">{viewingPO.id}</p>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table headers={['Product Name', 'SKU', { content: 'Qty', className: 'text-center' }, { content: 'Received', className: 'text-center' }, { content: 'Unit Cost', className: 'text-right' }, { content: 'Total', className: 'text-right' }]}>
                                {viewingPO.items.map((item, idx) => {
                                    const product = getProductById(item.productId);
                                    return (
                                        <tr key={idx} className="text-xs">
                                            <td className="px-4 py-3 font-medium text-foreground">{product?.name || 'Loading...'}</td>
                                            <td className="px-4 py-3 text-muted-foreground font-mono">{product?.sku || 'N/A'}</td>
                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={item.receivedQuantity === item.quantity ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
                                                    {item.receivedQuantity || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">₹{item.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-bold">₹{(item.cost * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )
                                })}
                            </Table>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-right space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Grand Total Amount</p>
                                <p className="text-2xl font-extrabold text-primary">₹{(viewingPO.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setViewingPO(null)}>Close</Button>
                            {viewingPO.status === 'Draft' && (
                                <Button onClick={() => router.push(`/suppliers/purchase-orders/${viewingPO.id}/edit`)}>Edit PO</Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default PurchaseOrders;