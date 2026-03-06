
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { PricingRule } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { MoreHorizontal, Edit, Trash2, Plus, Tag, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/api/utils';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';

// StatCard component
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

const PricingConfiguration: React.FC = () => {
    const { pricingRules, deletePricingRule, loadPricingRules, dataState } = useAppContext();
    const router = useRouter();

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof PricingRule | string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [deletingRule, setDeletingRule] = useState<PricingRule | null>(null);

    useEffect(() => {
        loadPricingRules(true);
    }, [loadPricingRules]);

    const { filteredAndSortedRules, stats } = useMemo(() => {
        if (!dataState.pricingRules.loaded) {
            return { filteredAndSortedRules: [], stats: { total: 0, active: 0 } };
        }

        const calculatedStats = {
            total: pricingRules.length,
            active: pricingRules.filter(r => r.isActive).length
        };
        
        let filtered = [...pricingRules];
        
        // Apply filters
        if (statusFilter !== 'all') {
            filtered = filtered.filter(rule => (statusFilter === 'Active' ? rule.isActive : !rule.isActive));
        }
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(rule => rule.priority === priorityFilter);
        }
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(rule =>
                rule.name.toLowerCase().includes(lowercasedFilter) ||
                (rule.description || '').toLowerCase().includes(lowercasedFilter)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const key = sortConfig.key as keyof PricingRule;
            const aValue = a[key];
            const bValue = b[key];

            if (aValue == null || bValue == null) return 0;
            
            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });

        return { filteredAndSortedRules: filtered, stats: calculatedStats };
    }, [pricingRules, dataState.pricingRules.loaded, searchTerm, statusFilter, priorityFilter, sortConfig]);

    const paginatedRules = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedRules.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedRules, currentPage]);

    const handleRequestSort = (key: keyof PricingRule | string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const confirmDelete = () => {
        if (deletingRule) {
            deletePricingRule(deletingRule.id);
            setDeletingRule(null);
        }
    };
    
    const getRuleSummary = (rule: PricingRule) => {
        if (rule.discountPercentage && rule.discountPercentage > 0) return `Discount: ${rule.discountPercentage}%`;
        if (rule.fixedPrice && rule.fixedPrice > 0) return `Fixed Price: ₹${rule.fixedPrice.toFixed(2)}`;
        if (rule.markupPercentage && rule.markupPercentage > 0) return `Markup: ${rule.markupPercentage}%`;
        return 'No action defined';
    };

    const tableHeaders: TableHeader[] = [
        { content: <SortableHeader label="Name" sortKey="name" config={sortConfig} onRequestSort={handleRequestSort} /> },
        { content: <SortableHeader label="Priority" sortKey="priority" config={sortConfig} onRequestSort={handleRequestSort} /> },
        { content: <SortableHeader label="Status" sortKey="isActive" config={sortConfig} onRequestSort={handleRequestSort} /> },
        'Conditions',
        'Action',
        'Date Range',
        { content: 'Actions', className: 'text-right' },
    ];

    const renderContent = () => {
        if (!dataState.pricingRules.loaded) {
            return <TableSkeleton headers={tableHeaders} rows={5} />;
        }
        if (pricingRules.length === 0) {
            return <EmptyState icon={Tag} title="No Pricing Rules" message="Create your first pricing rule to get started." action={{ text: 'Add Rule', onClick: () => router.push('/configure/pricing/new') }} />;
        }
        if (filteredAndSortedRules.length === 0) {
            return <div className="text-center py-10"><p className="text-muted-foreground">No rules match your current filters.</p></div>;
        }
        return (
            <Table headers={tableHeaders}>
                {paginatedRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-accent">
                        <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{rule.name}</div>
                            <div className="text-sm text-muted-foreground truncate" title={rule.description}>{rule.description}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{rule.priority}</td>
                        <td className="px-6 py-4 text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                            {(rule.minQuantity || 0) > 0 && <div>Min Qty: {rule.minQuantity}</div>}
                            {(rule.maxQuantity || 0) > 0 && <div>Max Qty: {rule.maxQuantity}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{getRuleSummary(rule)}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                            {rule.startDate ? formatDate(rule.startDate) : 'N/A'} - {rule.endDate ? formatDate(rule.endDate) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <Dropdown
                                align="right"
                                trigger={<button className="p-1 rounded-full text-muted-foreground hover:bg-accent"><MoreHorizontal className="h-5 w-5" /></button>}
                            >
                                <DropdownItem onClick={() => router.push(`/configure/pricing/${rule.id}/edit`)}><div className="flex items-center"><Edit className="h-4 w-4 mr-2" />Edit</div></DropdownItem>
                                <DropdownItem onClick={() => setDeletingRule(rule)} className="text-rose-600"><div className="flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</div></DropdownItem>
                            </Dropdown>
                        </td>
                    </tr>
                ))}
            </Table>
        );
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Pricing Rules</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {!dataState.pricingRules.loaded ? <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                 </> : <>
                    <StatCard icon={Tag} title="Total Rules" value={stats.total} color="text-sky-500" />
                    <StatCard icon={Tag} title="Active Rules" value={stats.active} color="text-emerald-500" />
                 </>}
            </div>
            <Card>
                <CardHeader className="flex flex-col gap-4">
                     <div className="flex justify-between items-center">
                        <h2 className="text-xl font-medium text-foreground">All Pricing Rules</h2>
                        <Button onClick={() => router.push('/configure/pricing/new')}><Plus className="h-4 w-4 mr-2 -ml-1" />Add Rule</Button>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t">
                        <div className="relative w-full flex-grow">
                            <Input id="rule-search" placeholder="Search by name or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 !py-1.5 text-sm" />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-9 !py-1.5 text-sm">
                                <option value="all">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </Select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Select id="priority-filter" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="pl-9 !py-1.5 text-sm">
                                <option value="all">All Priorities</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </Select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
                 {dataState.pricingRules.loaded && filteredAndSortedRules.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination itemsPerPage={itemsPerPage} totalItems={filteredAndSortedRules.length} currentPage={currentPage} paginate={setCurrentPage} />
                    </CardFooter>
                )}
            </Card>
            <Modal isOpen={!!deletingRule} onClose={() => setDeletingRule(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete the rule <strong className="text-foreground">{deletingRule?.name}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingRule(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
        </div>
    );
};

const SortableHeader = ({ label, sortKey, config, onRequestSort }: { label: string, sortKey: string, config: any, onRequestSort: (key: string) => void }) => (
    <div className="flex items-center gap-1 cursor-pointer" onClick={() => onRequestSort(sortKey)}>
        {label}
        {config.key === sortKey && (config.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </div>
);


export default PricingConfiguration;
