'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { CycleCount, Location, Product, Stock } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate, formatDateTime, formatCurrency } from '@/api/utils';
import EmptyState from '@/components/ui/EmptyState';
import { Check, Plus, RefreshCw, Sigma, Target, ChevronDown, AlertTriangle, Search, Filter, FileText, Download, Loader2 } from 'lucide-react';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import CardSkeleton from '@/components/skeletons/CardSkeleton';
import { useToast } from '@/contexts/ToastContext';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import jsPDF from 'jspdf';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);

const CycleCounting: React.FC = () => {
    const { 
        cycleCounts, stocks, getProductById, getLocationById, createCycleCount, saveCycleCount, finalizeCycleCount, products, locations,
        dataState, loadStocks, loadProducts, loadLocations, loadCycleCounts
    } = useAppContext();
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});
    const [confirmingFinalize, setConfirmingFinalize] = useState<CycleCount | null>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [editedCounts, setEditedCounts] = useState<Record<string, Record<string, string>>>({});
    const [expandedCountId, setExpandedCountId] = useState<string | null>(null);
    
    // Discrepancy Report state
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // New state for search, filter, and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CycleCount['status'] | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        loadCycleCounts(true);
        loadStocks(true);
        loadProducts(true);
        loadLocations(true);
    }, [loadCycleCounts, loadStocks, loadProducts, loadLocations]);

    const isDataReady = useMemo(() => (
        dataState.cycleCounts.loaded && dataState.stocks.loaded && dataState.products.loaded && dataState.locations.loaded
    ), [dataState]);

    const filteredCycleCounts = useMemo(() => {
        if (!cycleCounts) return [];
        return cycleCounts.filter(cc => {
            const statusMatch = statusFilter === 'all' || cc.status === statusFilter;
    
            const searchLower = searchTerm.toLowerCase();
            const searchMatch = searchTerm === '' ||
                cc.id.toLowerCase().includes(searchLower) ||
                cc.items.some(item => {
                    const product = getProductById(item.productId);
                    const location = getLocationById(item.locationId);
                    return (
                        product?.name.toLowerCase().includes(searchLower) ||
                        product?.sku?.toLowerCase().includes(searchLower) ||
                        location?.name.toLowerCase().includes(searchLower) ||
                        location?.code?.toLowerCase().includes(searchLower)
                    );
                });
            
            return statusMatch && searchMatch;
        });
    }, [cycleCounts, searchTerm, statusFilter, getProductById, getLocationById]);
    
    const paginatedCycleCounts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCycleCounts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCycleCounts, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        if (isDataReady && filteredCycleCounts.length > 0 && !expandedCountId) {
            const firstActiveCount = filteredCycleCounts.find(cc => cc.status === 'In Progress' || cc.status === 'Pending');
            setExpandedCountId(firstActiveCount ? firstActiveCount.id : filteredCycleCounts[0].id);
        }
    }, [isDataReady, filteredCycleCounts, expandedCountId]);

    const stats = useMemo(() => {
        const completedCounts = cycleCounts.filter(cc => cc.status === 'Completed' || cc.status === 'Adjusted');
        let totalSystem = 0;
        let totalDiscrepancy = 0;
        let netVarianceValue = 0;

        completedCounts.forEach(cc => {
            cc.items.forEach(item => {
                const systemQty = item.systemQuantity;
                const countedQty = item.countedQuantity ?? systemQty;
                const discrepancy = Math.abs(countedQty - systemQty);
                totalSystem += systemQty;
                totalDiscrepancy += discrepancy;
                const product = getProductById(item.productId);
                if (product) {
                    netVarianceValue += (countedQty - systemQty) * product.price;
                }
            });
        });
        const accuracy = totalSystem > 0 ? ((totalSystem - totalDiscrepancy) / totalSystem) * 100 : 100;

        return {
            totalCounts: cycleCounts.length,
            accuracy: accuracy.toFixed(1) + '%',
            netVarianceValue: `₹${netVarianceValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
    }, [cycleCounts, getProductById]);

    const reportData = useMemo(() => {
        if (!isDataReady) return [];
        const start = new Date(reportStartDate);
        const end = new Date(reportEndDate);
        end.setHours(23, 59, 59, 999);

        const itemsWithDiscrepancy: any[] = [];
        cycleCounts
            .filter(cc => (cc.status === 'Completed' || cc.status === 'Adjusted'))
            .forEach(cc => {
                const countDate = new Date(cc.createdAt);
                if (countDate >= start && countDate <= end) {
                    cc.items.forEach(item => {
                        const systemQty = Number(item.systemQuantity || 0);
                        const countedQty = Number(item.countedQuantity ?? systemQty);
                        if (systemQty !== countedQty) {
                            itemsWithDiscrepancy.push({
                                ...item,
                                countId: cc.id,
                                date: cc.createdAt
                            });
                        }
                    });
                }
            });
        return itemsWithDiscrepancy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [cycleCounts, reportStartDate, reportEndDate, isDataReady]);

    const handleCountChange = (cycleCountId: string, itemId: string, value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        setEditedCounts(prev => ({
            ...prev,
            [cycleCountId]: {
                ...(prev[cycleCountId] || {}),
                [itemId]: numericValue,
            },
        }));
    };
    
    const handleSaveChanges = (cycleCount: CycleCount) => {
        const updates = editedCounts[cycleCount.id];
        if (!updates) {
            addToast({ type: 'info', message: 'No changes to save.' });
            return;
        }
        
        const numericUpdates: Record<string, number> = {};
        Object.keys(updates).forEach(itemId => {
            const valueStr = updates[itemId];
            numericUpdates[itemId] = valueStr === '' ? NaN : parseInt(valueStr, 10);
        });
        
        saveCycleCount(cycleCount, numericUpdates);
    };

    const handleConfirmFinalize = async () => {
        if (!confirmingFinalize) return;
        setIsFinalizing(true);
        await finalizeCycleCount(confirmingFinalize.id);
        setIsFinalizing(false);
        setConfirmingFinalize(null);
    }

    const downloadDiscrepancyPdf = async () => {
        if (reportData.length === 0) return;
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 12;

            doc.setFontSize(16);
            doc.text('Cycle Count Discrepancy Report', margin, 20);
            doc.setFontSize(10);
            doc.text(`Period: ${formatDate(reportStartDate)} to ${formatDate(reportEndDate)}`, margin, 28);
            doc.text(`Generated on: ${formatDateTime(new Date().toISOString())}`, margin, 34);

            let y = 45;
            doc.setFillColor(34, 46, 80);
            doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Date', margin + 2, y + 6.5);
            doc.text('Product', margin + 35, y + 6.5);
            doc.text('SKU', margin + 95, y + 6.5);
            doc.text('Location', margin + 140, y + 6.5);
            doc.text('System', margin + 180, y + 6.5, { align: 'right' });
            doc.text('Counted', margin + 205, y + 6.5, { align: 'right' });
            doc.text('Variance', margin + 235, y + 6.5, { align: 'right' });
            doc.text('Value Diff', margin + 270, y + 6.5, { align: 'right' });

            y += 10;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            reportData.forEach((item, index) => {
                const product = getProductById(item.productId);
                const loc = getLocationById(item.locationId);
                const counted = item.countedQuantity ?? item.systemQuantity;
                const variance = counted - item.systemQuantity;
                const valueDiff = variance * (product?.price || 0);

                if (y > 185) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(formatDate(item.date), margin + 2, y + 6);
                doc.text(product?.name.substring(0, 30) || 'N/A', margin + 35, y + 6);
                doc.text(product?.sku || 'N/A', margin + 95, y + 6);
                doc.text(loc?.code || 'N/A', margin + 140, y + 6);
                doc.text(item.systemQuantity.toString(), margin + 180, y + 6, { align: 'right' });
                doc.text(counted.toString(), margin + 205, y + 6, { align: 'right' });
                doc.text(variance > 0 ? `+${variance}` : variance.toString(), margin + 235, y + 6, { align: 'right' });
                doc.text(formatCurrency(valueDiff), margin + 270, y + 6, { align: 'right' });

                y += 8;
            });

            doc.save(`Discrepancy_Report_${reportStartDate}_to_${reportEndDate}.pdf`);
            addToast({ type: 'success', message: 'Report generated successfully.' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate report PDF.' });
        } finally {
            setIsGeneratingPdf(false);
        }
    }
    
    const locationsByZone = useMemo(() => {
        const grouped: Record<string, Location[]> = {};
        if (!locations) return [];
        locations.forEach(location => {
            if (['Bin', 'Shelf', 'Rack', 'Aisle'].includes(location.type)) {
                const zoneName = location.zone || 'Unzoned';
                if (!grouped[zoneName]) grouped[zoneName] = [];
                grouped[zoneName].push(location);
            }
        });
        Object.values(grouped).forEach(locs => locs.sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name)));
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [locations]);

    const handleToggleSelectItem = (locationId: string, productId: string) => {
        const key = `${locationId}_${productId}`;
        setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleSelectLocation = (locationId: string) => {
        const itemsInLocation = stocks.filter(s => s.locationId === locationId);
        const keys = itemsInLocation.map(s => `${locationId}_${s.productId}`);
        const areAllSelected = keys.length > 0 && keys.every(key => selectedItems[key]);
        
        setSelectedItems(prev => {
            const newSelected = { ...prev };
            keys.forEach(key => {
                newSelected[key] = !areAllSelected;
            });
            return newSelected;
        });
    };

    const handleCreateCount = () => {
        const itemsToCount = Object.keys(selectedItems)
            .filter(key => selectedItems[key])
            .map(key => {
                const [locationId, productId] = key.split('_');
                return { productId, locationId };
            });

        if (itemsToCount.length === 0) {
            addToast({ type: 'info', message: 'Please select at least one item to count.' });
            return;
        }

        createCycleCount(itemsToCount);
        setIsModalOpen(false);
        setSelectedItems({});
        setExpandedLocations({});
    };

    const getStatusPill = (status: CycleCount['status']) => {
        const classes = {
            'Pending': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
            'In Progress': 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Completed': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
            'Adjusted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
        };
        return `px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[status]}`;
    };

    if (!isDataReady) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </div>
                <CardSkeleton lineCount={5} />
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard icon={RefreshCw} title="Total Counts" value={stats.totalCounts} color="bg-sky-500" />
                <StatCard icon={Target} title="Overall Accuracy" value={stats.accuracy} color="bg-emerald-500" />
                <StatCard icon={Sigma} title="Net Variance Value" value={stats.netVarianceValue} color="bg-amber-500" />
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <h2 className="text-xl font-medium text-foreground">Cycle Count Tasks</h2>
                            <p className="text-sm text-muted-foreground mt-1">Review, update, and finalize inventory counts.</p>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0 flex-shrink-0">
                            <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}>
                                <FileText className="h-4 w-4 mr-2 -ml-1" />
                                Discrepancy Report
                            </Button>
                            <Button onClick={() => setIsModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2 -ml-1" />
                                New Cycle Count
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t">
                        <div className="relative w-full flex-grow">
                            <Input
                                id="cycle-count-search"
                                placeholder="Search by ID, product, location..."
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
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Adjusted">Adjusted</option>
                            </Select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredCycleCounts.length === 0 ? (
                            <EmptyState icon={RefreshCw} title="No Cycle Counts Found" message="No tasks match your current filters, or no counts have been created yet." />
                        ) : (
                            paginatedCycleCounts.map(cc => {
                                const itemsCounted = cc.items.filter(i => i.countedQuantity !== null).length;
                                const progress = cc.items.length > 0 ? (itemsCounted / cc.items.length) * 100 : 0;
                                const isExpanded = expandedCountId === cc.id;

                                return (
                                    <Card key={cc.id} className="overflow-hidden">
                                        <CardHeader 
                                            onClick={() => setExpandedCountId(prevId => prevId === cc.id ? null : cc.id)}
                                            className="flex justify-between items-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-foreground">Count #{cc.id.slice(-6)}</h3>
                                                    <p className="text-sm text-muted-foreground">Created: {formatDate(cc.createdAt)}</p>
                                                </div>
                                                <span className={getStatusPill(cc.status)}>{cc.status}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-40 hidden md:block">
                                                    <div className="h-2 w-full rounded-full bg-background">
                                                        <div className="h-2 rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-right mt-1">{itemsCounted} of {cc.items.length} items</p>
                                                </div>
                                                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </CardHeader>
                                        
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
                                            <CardContent className="pt-4 border-t">
                                                <div className="space-y-3">
                                                    {cc.items.map(item => {
                                                        const product = getProductById(item.productId);
                                                        const location = getLocationById(item.locationId);
                                                        const currentVal = editedCounts[cc.id]?.[item.id] ?? item.countedQuantity?.toString() ?? '';
                                                        const discrepancy = currentVal !== '' && !isNaN(parseInt(currentVal)) ? parseInt(currentVal, 10) - item.systemQuantity : null;
                                                        return (
                                                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-2 rounded-md hover:bg-accent -mx-2">
                                                                <div className="md:col-span-4">
                                                                    <p className="font-medium text-foreground">{product?.name}</p>
                                                                    <p className="text-sm text-muted-foreground mt-0.5">{location?.name} ({location?.code})</p>
                                                                </div>
                                                                <p className="md:col-span-2 text-sm text-muted-foreground self-center text-center">System: <strong className="text-foreground">{item.systemQuantity}</strong></p>
                                                                <div className="md:col-span-3">
                                                                    <Input
                                                                        id={`count-${item.id}`}
                                                                        label="Counted Quantity"
                                                                        labelClassName="!text-xs !mb-1"
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        placeholder="Enter count"
                                                                        value={currentVal}
                                                                        onChange={(e) => handleCountChange(cc.id, item.id, e.target.value)}
                                                                        disabled={cc.status === 'Adjusted'}
                                                                    />
                                                                </div>
                                                                <p className={`md:col-span-3 text-sm font-bold self-center text-right ${discrepancy === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {discrepancy !== null && `Variance: ${discrepancy > 0 ? '+' : ''}${discrepancy}`}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <div className="flex items-center justify-end w-full space-x-2">
                                                    {cc.status !== 'Adjusted' && (
                                                        <Button variant="secondary" onClick={() => handleSaveChanges(cc)} disabled={!editedCounts[cc.id]}>
                                                            Save Progress
                                                        </Button>
                                                    )}
                                                    {cc.status === 'Completed' && (
                                                        <Button onClick={() => setConfirmingFinalize(cc)}>
                                                            <Check className="h-4 w-4 mr-2 -ml-1"/>
                                                            Finalize Count
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardFooter>
                                        </div>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </CardContent>
                {filteredCycleCounts.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination 
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredCycleCounts.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>

            {/* Create Count Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Cycle Count" size="2xl"
                footer={<Button onClick={handleCreateCount}>Create Count for Selected Items</Button>}>
                <p className="text-sm text-muted-foreground mb-4">Select locations or individual items to include in this count. All products currently in stock at the selected locations will be added.</p>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 sidebar-scrollbar pr-2">
                    {locationsByZone.map(([zoneName, locs]) => (
                        <div key={zoneName}>
                            <h3 className="font-semibold text-foreground mb-2 border-b pb-1">{zoneName}</h3>
                            {locs.map(location => {
                                const stockInLocation = stocks.filter(s => s.locationId === location.id && s.quantity > 0);
                                if (stockInLocation.length === 0) return null;

                                const locationItemsKeys = stockInLocation.map(s => `${location.id}_${s.productId}`);
                                const selectedInLocationCount = locationItemsKeys.filter(key => selectedItems[key]).length;
                                const isLocationChecked = selectedInLocationCount === locationItemsKeys.length;
                                const isLocationIndeterminate = selectedInLocationCount > 0 && selectedInLocationCount < locationItemsKeys.length;

                                return (
                                    <div key={location.id} className="ml-2 mb-2">
                                        <div className="flex items-center p-2 rounded-md hover:bg-accent group">
                                            <input
                                                type="checkbox"
                                                id={`select-loc-${location.id}`}
                                                className="h-4 w-4 rounded border-input bg-background"
                                                checked={isLocationChecked}
                                                ref={el => { if (el) el.indeterminate = isLocationIndeterminate; }}
                                                onChange={() => handleToggleSelectLocation(location.id)}
                                            />
                                            <div className="ml-3 flex-grow cursor-pointer flex justify-between items-center" onClick={() => handleToggleSelectLocation(location.id)}>
                                                <p className="font-medium text-foreground">{location.name} ({location.code})</p>
                                                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{stockInLocation.length} items</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Finalize Confirmation Modal */}
            <Modal
                isOpen={!!confirmingFinalize}
                onClose={() => setConfirmingFinalize(null)}
                title="Confirm Finalization"
            >
                <p>Are you sure you want to finalize <strong className="text-foreground">Count #{confirmingFinalize?.id.slice(-6)}</strong>?</p>
                <p className="mt-2 text-sm text-muted-foreground">Note: This no longer updates stock levels automatically. You must use the <strong>Discrepancy Report</strong> to perform manual corrections via Stock Adjustments.</p>
                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setConfirmingFinalize(null)} disabled={isFinalizing}>Cancel</Button>
                    <Button onClick={handleConfirmFinalize} loading={isFinalizing}>
                        Confirm Finalization
                    </Button>
                </div>
            </Modal>

            {/* Discrepancy Report Modal */}
            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title="Inventory Discrepancy Report"
                size="2xl"
                footer={
                    <div className="flex justify-between items-center w-full">
                        <p className="text-xs text-muted-foreground">{reportData.length} items with variances found.</p>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>Close</Button>
                            <Button onClick={downloadDiscrepancyPdf} disabled={reportData.length === 0 || isGeneratingPdf} loading={isGeneratingPdf}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                        <Input 
                            id="report-start" 
                            label="Start Date" 
                            type="date" 
                            value={reportStartDate} 
                            onChange={e => setReportStartDate(e.target.value)} 
                        />
                        <Input 
                            id="report-end" 
                            label="End Date" 
                            type="date" 
                            value={reportEndDate} 
                            onChange={e => setReportEndDate(e.target.value)} 
                        />
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto border rounded-md sidebar-scrollbar">
                        {reportData.length > 0 ? (
                            <Table headers={['Date', 'Product / SKU', 'Location', { content: 'System', className: 'text-right' }, { content: 'Counted', className: 'text-right' }, { content: 'Diff', className: 'text-right' }]}>
                                {reportData.map((item, idx) => {
                                    const product = getProductById(item.productId);
                                    const loc = getLocationById(item.locationId);
                                    const counted = item.countedQuantity ?? item.systemQuantity;
                                    const variance = counted - item.systemQuantity;
                                    return (
                                        <tr key={`${item.countId}-${item.id}-${idx}`} className="text-xs">
                                            <td className="px-4 py-2 text-muted-foreground">{formatDate(item.date)}</td>
                                            <td className="px-4 py-2">
                                                <p className="font-bold text-foreground truncate w-40" title={product?.name}>{product?.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">{product?.sku}</p>
                                            </td>
                                            <td className="px-4 py-2 font-mono">{loc?.code || 'N/A'}</td>
                                            <td className="px-4 py-2 text-right">{item.systemQuantity}</td>
                                            <td className="px-4 py-2 text-right font-bold">{counted}</td>
                                            <td className={`px-4 py-2 text-right font-bold ${variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {variance > 0 ? `+${variance}` : variance}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        ) : (
                            <div className="py-12 text-center">
                                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-muted-foreground">No discrepancies found for this date range.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default CycleCounting;
