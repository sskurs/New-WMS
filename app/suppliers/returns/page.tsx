
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { SupplierReturn, SupplierReturnStatus } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { Undo2, Plus, Search, Filter, MoreHorizontal, Edit, CheckCircle, Truck, XCircle, Landmark } from 'lucide-react';
import { formatDate } from '@/api/utils';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';

const SupplierReturnsPage: React.FC = () => {
    const { supplierReturns, loadSupplierReturns, getSupplierById, updateSupplierReturnStatus, dataState } = useAppContext();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<SupplierReturnStatus | 'all'>('Draft');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Load data when status filter changes - this leverages the new backend filtering
    useEffect(() => {
        loadSupplierReturns(statusFilter, true);
    }, [loadSupplierReturns, statusFilter]);

    const filteredReturns = useMemo(() => {
        return supplierReturns.filter(ret => {
            const supplier = getSupplierById(ret.supplierId);
            const searchLower = searchTerm.toLowerCase();
            
            const searchMatch = (
                ret.id.toLowerCase().includes(searchLower) ||
                (supplier?.name || '').toLowerCase().includes(searchLower)
            );

            return searchMatch;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [supplierReturns, searchTerm, getSupplierById]);

    const paginatedReturns = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReturns.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReturns, currentPage]);

    const getStatusPillClasses = (status: SupplierReturnStatus) => {
        const classes = {
            'Draft': 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
            'Approved': 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Shipped': 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
            'Settled': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
            'Rejected': 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
        };
        return `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status] || classes['Draft']}`;
    };

    const headers: TableHeader[] = ['Return ID', 'Supplier', 'Items', 'Status', 'Date', { content: 'Actions', className: 'text-right' }];

    const renderContent = () => {
        if (dataState.supplierReturns.loading) {
            return <TableSkeleton headers={headers} rows={5} />;
        }
        if (supplierReturns.length === 0 && !searchTerm) {
            return (
                <EmptyState
                    icon={Undo2}
                    title={`No Returns in '${statusFilter}' status`}
                    message="Use the filter to view other stages or create a new return request."
                    action={{
                        text: <><Plus className="h-4 w-4 mr-2 -ml-1"/>New Return</>,
                        onClick: () => router.push('/suppliers/returns/new')
                    }}
                />
            );
        }
        if (filteredReturns.length === 0) {
            return <div className="text-center py-10"><p className="text-muted-foreground">No returns match your search.</p></div>;
        }

        return (
            <Table headers={headers}>
                {paginatedReturns.map(ret => {
                    const supplier = getSupplierById(ret.supplierId);
                    const itemCount = ret.items.reduce((sum, i) => sum + i.quantity, 0);

                    return (
                        <tr key={ret.id} className="hover:bg-accent">
                            <td className="px-6 py-4 font-medium text-foreground">{ret.id}</td>
                            <td className="px-6 py-4 text-muted-foreground">{supplier?.name || 'Unknown Supplier'}</td>
                            <td className="px-6 py-4 text-muted-foreground">{itemCount} units</td>
                            <td className="px-6 py-4"><span className={getStatusPillClasses(ret.status)}>{ret.status}</span></td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(ret.createdAt)}</td>
                            <td className="px-6 py-4 text-right">
                                <Dropdown
                                    align="right"
                                    trigger={
                                        <button className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    }
                                >
                                    {ret.status === 'Draft' && (
                                        <>
                                            <DropdownItem onClick={() => updateSupplierReturnStatus(ret.id, 'Approved')}>
                                                <div className="flex items-center text-emerald-600"><CheckCircle className="h-4 w-4 mr-2" />Approve</div>
                                            </DropdownItem>
                                            <DropdownItem onClick={() => updateSupplierReturnStatus(ret.id, 'Rejected')}>
                                                <div className="flex items-center text-rose-600"><XCircle className="h-4 w-4 mr-2" />Reject</div>
                                            </DropdownItem>
                                        </>
                                    )}
                                    {ret.status === 'Approved' && (
                                        <DropdownItem onClick={() => updateSupplierReturnStatus(ret.id, 'Shipped')}>
                                            <div className="flex items-center text-blue-600"><Truck className="h-4 w-4 mr-2" />Dispatch Goods</div>
                                        </DropdownItem>
                                    )}
                                     {ret.status === 'Shipped' && (
                                        <DropdownItem onClick={() => updateSupplierReturnStatus(ret.id, 'Settled')}>
                                            <div className="flex items-center text-emerald-600"><Landmark className="h-4 w-4 mr-2" />Mark as Settled</div>
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
        <Card>
            <CardHeader className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium text-foreground">Vendor Returns (RTV)</h2>
                    <Button onClick={() => router.push('/suppliers/returns/new')}>
                        <Plus className="h-4 w-4 mr-2 -ml-1" />
                        New Return
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full flex-grow">
                         <Input
                            id="return-search"
                            placeholder="Search by ID or Supplier..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 !py-1.5 text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="relative w-full sm:w-56">
                         <Select
                            id="status-filter"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="pl-9 !py-1.5 text-sm"
                        >
                            <option value="all">All Stages</option>
                            <option value="Draft">Draft (Pending Inspection)</option>
                            <option value="Approved">Approved (Ready to Ship)</option>
                            <option value="Shipped">Shipped (In Transit)</option>
                            <option value="Settled">Settled (Completed)</option>
                            <option value="Rejected">Rejected</option>
                        </Select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
            {filteredReturns.length > itemsPerPage && (
                <CardFooter>
                     <Pagination
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredReturns.length}
                        currentPage={currentPage}
                        paginate={setCurrentPage}
                    />
                </CardFooter>
            )}
        </Card>
    );
};

export default SupplierReturnsPage;
