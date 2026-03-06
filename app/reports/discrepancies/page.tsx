'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { AdjustmentType } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatDate, formatDateTime, formatCurrency } from '@/api/utils';
import EmptyState from '@/components/ui/EmptyState';
import { TriangleAlert, Download, Loader2, ArrowRight, Filter, Search, Sigma, Target, CircleCheck } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/contexts/ToastContext';
import jsPDF from 'jspdf';
import { useRouter } from 'next/navigation';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4 overflow-hidden">
                <p className="text-2xl font-bold text-foreground truncate">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);

const DiscrepancyReport: React.FC = () => {
    const { 
        cycleCounts, getProductById, getLocationById, stockAdjustments,
        loadCycleCounts, loadProducts, loadLocations, loadStockAdjustments, dataState, loadZones
    } = useAppContext();
    const { addToast } = useToast();
    const router = useRouter();

    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        loadCycleCounts(true);
        loadProducts(true);
        loadLocations(true);
        loadZones(true);
        loadStockAdjustments(true);
    }, [loadCycleCounts, loadProducts, loadLocations, loadZones, loadStockAdjustments]);

    const isDataReady = useMemo(() => (
        dataState.cycleCounts.loaded && dataState.products.loaded && dataState.locations.loaded && dataState.stockAdjustments.loaded
    ), [dataState]);

    const discrepancyItems = useMemo(() => {
        if (!isDataReady) return [];
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const items: any[] = [];
        cycleCounts
            .filter(cc => (cc.status === 'Completed' || cc.status === 'Adjusted'))
            .forEach(cc => {
                const countDate = new Date(cc.createdAt);
                if (countDate >= start && countDate <= end) {
                    cc.items.forEach(item => {
                        const systemQty = Number(item.systemQuantity || 0);
                        const countedQty = Number(item.countedQuantity ?? systemQty);
                        
                        if (systemQty !== countedQty) {
                            // CHECK IF ALREADY ADJUSTED
                            // We look for a manual adjustment that references this specific Cycle Count ID
                            const adjustmentType = (countedQty - systemQty) > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE;
                            const isAlreadyAdjusted = stockAdjustments.some(adj => 
                                adj.productId === item.productId &&
                                adj.locationId === item.locationId &&
                                adj.type === adjustmentType &&
                                adj.quantity === Math.abs(countedQty - systemQty) &&
                                adj.reason.includes(cc.id) // Match full ID for precision
                            );

                            if (!isAlreadyAdjusted) {
                                items.push({
                                    ...item,
                                    cycleCountId: cc.id,
                                    date: cc.createdAt,
                                    variance: countedQty - systemQty
                                });
                            }
                        }
                    });
                }
            });

        return items
            .filter(item => {
                const product = getProductById(item.productId);
                const loc = getLocationById(item.locationId);
                const searchLower = searchTerm.toLowerCase();
                return !searchTerm || 
                    product?.name.toLowerCase().includes(searchLower) ||
                    product?.sku?.toLowerCase().includes(searchLower) ||
                    loc?.code?.toLowerCase().includes(searchLower) ||
                    item.cycleCountId.toLowerCase().includes(searchLower);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [cycleCounts, stockAdjustments, startDate, endDate, searchTerm, isDataReady, getProductById, getLocationById]);

    const stats = useMemo(() => {
        let totalNetValue = 0;
        let totalAbsoluteVariance = 0;
        
        discrepancyItems.forEach(item => {
            const product = getProductById(item.productId);
            const price = product?.price || 0;
            totalNetValue += item.variance * price;
            totalAbsoluteVariance += Math.abs(item.variance);
        });

        return {
            itemCount: discrepancyItems.length,
            netValue: totalNetValue,
            absoluteUnits: totalAbsoluteVariance
        };
    }, [discrepancyItems, getProductById]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return discrepancyItems.slice(startIndex, startIndex + itemsPerPage);
    }, [discrepancyItems, currentPage]);

    const handleGuideToAdjustment = (item: any) => {
        const adjustmentType = item.variance > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE;
        const adjustmentQty = Math.abs(item.variance);
        const params = new URLSearchParams({
            productId: item.productId,
            locationId: item.locationId,
            type: adjustmentType,
            quantity: adjustmentQty.toString(),
            // Using full cycleCountId for reliable cross-referencing
            reason: `Discrepancy Correction (Ref: CC ${item.cycleCountId})`
        });
        router.push(`/inventory/adjustments/new?${params.toString()}`);
    };

    const handleDownloadPdf = async () => {
        if (!discrepancyItems.length) return;
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 12;

            doc.setFontSize(16);
            doc.text('Cycle Count Discrepancy Guide', margin, 20);
            doc.setFontSize(10);
            doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, margin, 28);
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
            doc.text('Recommended Action', margin + 270, y + 6.5, { align: 'right' });

            y += 10;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            discrepancyItems.forEach((item, index) => {
                const product = getProductById(item.productId);
                const loc = getLocationById(item.locationId);
                const variance = item.variance;
                const action = variance > 0 ? `Increase by ${variance}` : `Decrease by ${Math.abs(variance)}`;

                if (y > 185) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(formatDate(item.date), margin + 2, y + 6);
                doc.text(product?.name.substring(0, 30) || 'N/A', margin + 35, y + 6);
                doc.text(product?.sku || 'N/A', margin + 95, y + 6);
                doc.text(loc?.code || 'N/A', margin + 140, y + 6);
                doc.text(item.systemQuantity.toString(), margin + 180, y + 6, { align: 'right' });
                doc.text(item.countedQuantity.toString(), margin + 205, y + 6, { align: 'right' });
                doc.text(variance > 0 ? `+${variance}` : variance.toString(), margin + 235, y + 6, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text(action, margin + 270, y + 6, { align: 'right' });
                doc.setFont('helvetica', 'normal');

                y += 8;
            });

            doc.save(`Discrepancy_Report_${startDate}_to_${endDate}.pdf`);
            addToast({ type: 'success', message: 'Report generated successfully.' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate report PDF.' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const headers: TableHeader[] = [
        'Date / ID', 'Product', 'Location', { content: 'System', className: 'text-right' }, { content: 'Counted', className: 'text-right' }, { content: 'Difference', className: 'text-right' }, { content: 'Action', className: 'text-right' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Discrepancy Guide</h1>
                <Button variant="secondary" onClick={handleDownloadPdf} disabled={!isDataReady || discrepancyItems.length === 0} loading={isGeneratingPdf}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {!isDataReady ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatCard icon={TriangleAlert} title="Discrepancies Found" value={stats.itemCount} color="text-amber-500" />
                        <StatCard icon={Target} title="Absolute Unit Diff" value={stats.absoluteUnits} color="text-sky-500" />
                        <StatCard icon={Sigma} title="Net Value Impact" value={formatCurrency(stats.netValue)} color={stats.netValue >= 0 ? "text-emerald-500" : "text-rose-500"} />
                    </>
                )}
            </div>

            <Card>
                <CardHeader className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <Input id="start-date" label="From Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input id="end-date" label="To Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <div className="relative">
                            <Input id="search" label="Search" placeholder="Product, SKU, Location..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                            <Search className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2 h-10 pb-0.5">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audit Range</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!isDataReady ? (
                        <TableSkeleton headers={headers} rows={10} />
                    ) : discrepancyItems.length === 0 ? (
                        <EmptyState 
                            icon={CircleCheck}
                            title="No Outstanding Discrepancies"
                            message="All variances in this date range have either been corrected or exactly match the system inventory."
                        />
                    ) : (
                        <Table headers={headers}>
                            {paginatedItems.map((item, idx) => {
                                const product = getProductById(item.productId);
                                const loc = getLocationById(item.locationId);
                                const variance = item.variance;
                                return (
                                    <tr key={`${item.cycleCountId}-${item.id}-${idx}`} className="hover:bg-accent transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">{formatDate(item.date)}</div>
                                            <div className="text-xs text-muted-foreground font-mono">CC #{item.cycleCountId.slice(-6)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-foreground max-w-[200px] truncate" title={product?.name}>{product?.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{product?.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">{loc?.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono uppercase">{loc?.code}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right text-muted-foreground font-mono">{item.systemQuantity}</td>
                                        <td className="px-6 py-4 text-sm text-right font-bold text-foreground font-mono">{item.countedQuantity}</td>
                                        <td className={`px-6 py-4 text-sm text-right font-bold font-mono ${variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {variance > 0 ? `+${variance}` : variance}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="ghost" onClick={() => handleGuideToAdjustment(item)} className="text-primary hover:text-primary/80">
                                                Adjust <ArrowRight className="h-3 w-3 ml-1.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </Table>
                    )}
                </CardContent>
                {discrepancyItems.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination 
                            itemsPerPage={itemsPerPage}
                            totalItems={discrepancyItems.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default DiscrepancyReport;