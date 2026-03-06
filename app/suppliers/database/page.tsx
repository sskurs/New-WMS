'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { MoreHorizontal, Edit, Trash2, Plus, Search, Filter, Building2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';

const SupplierDatabase: React.FC = () => {
    const { suppliers, deleteSupplier, loadSuppliers, dataState } = useAppContext();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [deletingSupplier, setDeletingSupplier] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        loadSuppliers();
    }, [loadSuppliers]);

    const handleDelete = (supplierId: string, supplierName: string) => {
        setDeletingSupplier({ id: supplierId, name: supplierName });
    };

    const confirmDelete = () => {
        if (deletingSupplier) {
            deleteSupplier(deletingSupplier.id);
            setDeletingSupplier(null);
        }
    };
    
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const searchLower = searchTerm.toLowerCase();
            // Use fallbacks to empty strings to avoid 'toLowerCase' on undefined errors
            const name = (supplier.name || '').toLowerCase();
            const contact = (supplier.contactPerson || '').toLowerCase();
            const email = (supplier.email || '').toLowerCase();

            const searchMatch = (
                name.includes(searchLower) ||
                contact.includes(searchLower) ||
                email.includes(searchLower)
            );

            const statusMatch = statusFilter === 'all' || supplier.status === statusFilter;

            return searchMatch && statusMatch;
        });
    }, [suppliers, searchTerm, statusFilter]);
    
    const paginatedSuppliers = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredSuppliers.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [filteredSuppliers, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const getStatusPillClasses = (status: 'Active' | 'Inactive') => {
        return status === 'Active'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    };

    const headers = ['Name', 'Contact', 'Location', 'Status', { content: 'Actions', className: 'text-right' }];
    
    const renderContent = () => {
        if (!dataState.suppliers.loaded) {
            return <TableSkeleton headers={headers} rows={5} />;
        }
        if (suppliers.length === 0) {
            return (
                <EmptyState
                    icon={Building2}
                    title="No suppliers found"
                    message="Get started by adding your first supplier."
                    action={{
                        text: <><Plus className="h-4 w-4 mr-2 -ml-1"/>Add Supplier</>,
                        onClick: () => router.push('/suppliers/database/new')
                    }}
                />
            );
        }
        if (filteredSuppliers.length === 0) {
            return <div className="text-center py-10"><p className="text-muted-foreground">No suppliers match your current search and filter criteria.</p></div>;
        }

        return (
            <Table headers={headers}>
                {paginatedSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-accent">
                        <td className="px-6 py-4">
                            <Link href={`/suppliers/database/${supplier.id}`} className="group">
                                <div className="text-sm font-medium text-primary group-hover:underline">{supplier.name || 'N/A'}</div>
                                <div className="text-xs text-muted-foreground">{supplier.website || 'No website'}</div>
                            </Link>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm text-muted-foreground">{supplier.contactPerson || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{supplier.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{supplier.city ? `${supplier.city}, ${supplier.state}` : 'N/A'}</td>
                        <td className="px-6 py-4 text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusPillClasses(supplier.status)}`}>
                                {supplier.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <Dropdown
                                align="right"
                                trigger={
                                    <button className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </button>
                                }
                            >
                                <DropdownItem onClick={() => router.push(`/suppliers/database/${supplier.id}/edit`)}>
                                    <div className="flex items-center"><Edit className="h-4 w-4 mr-2" />Edit</div>
                                </DropdownItem>
                                <DropdownItem onClick={() => handleDelete(supplier.id, supplier.name)} className="text-rose-600 dark:text-rose-500 hover:!text-rose-700 dark:hover:!text-rose-400">
                                    <div className="flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</div>
                                </DropdownItem>
                            </Dropdown>
                        </td>
                    </tr>
                ))}
            </Table>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-4">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <h2 className="text-xl font-medium">Suppliers</h2>
                            <p className="text-sm text-muted-foreground mt-1">Manage your list of suppliers and vendors.</p>
                        </div>
                        <Button id="add-supplier-button" onClick={() => router.push('/suppliers/database/new')} className="mt-2 sm:mt-0 flex-shrink-0">
                            <Plus className="h-4 w-4 mr-2 -ml-1" />
                            Add Supplier
                        </Button>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative w-full flex-grow">
                            <Input
                                id="supplier-search"
                                placeholder="Search by name, contact, email..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 !py-1.5 text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Select
                                id="status-filter"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="pl-9 !py-1.5 text-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
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
                 {dataState.suppliers.loaded && filteredSuppliers.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredSuppliers.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>
            <Modal isOpen={!!deletingSupplier} onClose={() => setDeletingSupplier(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete supplier <strong className="text-foreground">{deletingSupplier?.name}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingSupplier(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
        </>
    );
};

export default SupplierDatabase;
