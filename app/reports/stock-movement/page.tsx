'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import { formatDateTime, formatDate } from '@/api/utils';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { Printer, Download, Loader2, FileWarning, Search, Filter, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import jsPDF from 'jspdf';

const StockMovementReport: React.FC = () => {
    const { 
        stockMovements, products, locations, loadStockMovements, loadProducts, loadLocations, dataState, loadZones,
        getProductById, getLocationById
    } = useAppContext();
    const { addToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        loadStockMovements(true);
        loadProducts(true);
        loadLocations(true);
        loadZones(true);
    }, [loadStockMovements, loadProducts, loadLocations, loadZones]);

    const isDataReady = useMemo(() => (
        dataState.stockMovements.loaded && dataState.products.loaded && dataState.locations.loaded
    ), [dataState]);

    const filteredMovements = useMemo(() => {
        if (!isDataReady) return [];
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return stockMovements.filter(movement => {
            const date = new Date(movement.timestamp);
            const matchesDate = date >= start && date <= end;
            const matchesType = typeFilter === 'all' || movement.type === typeFilter;
            
            const product = getProductById(movement.productId);
            const location = getLocationById(movement.locationId);
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                product?.name.toLowerCase().includes(searchLower) ||
                product?.sku?.toLowerCase().includes(searchLower) ||
                location?.name.toLowerCase().includes(searchLower) ||
                location?.code?.toLowerCase().includes(searchLower) ||
                movement.referenceId.toLowerCase().includes(searchLower);

            return matchesDate && matchesType && matchesSearch;
        });
    }, [stockMovements, startDate, endDate, typeFilter, searchTerm, isDataReady, getProductById, getLocationById]);

    const paginatedMovements = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredMovements, currentPage]);

    const movementTypes = useMemo(() => {
        const types = new Set(stockMovements.map(m => m.type));
        return Array.from(types).sort();
    }, [stockMovements]);

    const handleDownloadPdf = async () => {
        if (!filteredMovements.length) return;
        setIsGeneratingPdf(true);
        
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            const nowStr = formatDateTime(new Date().toISOString());

            const drawHeader = (startY: number) => {
                doc.setFillColor(34, 46, 80);
                doc.rect(margin, startY, 10, 10, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(255, 255, 255);
                doc.text('P', margin + 5, startY + 7, { align: 'center' });

                doc.setTextColor(0, 0, 0);
                doc.setFontSize(14);
                doc.text('WMSPro™', margin + 12, startY + 5);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100);
                doc.text('Propix Technologies Pvt. Ltd.', margin + 12, startY + 9);

                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(34, 46, 80);
                doc.text('Stock Movement Ledger', pageWidth - margin, startY + 6, { align: 'right' });
                
                doc.setDrawColor(220, 220, 220);
                doc.line(margin, startY + 13, pageWidth - margin, startY + 13);
                return startY + 18;
            };

            const drawFooter = () => {
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(150);
                    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
                    doc.text(`Report generated on: ${nowStr}`, margin, pageHeight - 8);
                    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
                }
            };

            const drawTableHeader = (startY: number) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setFillColor(0, 0, 0);
                doc.rect(margin, startY, pageWidth - (margin * 2), 8, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.text('Timestamp', margin + 2, startY + 5.5);
                doc.text('Type', margin + 35, startY + 5.5);
                doc.text('Product', margin + 70, startY + 5.5);
                doc.text('Location', margin + 140, startY + 5.5);
                doc.text('Ref ID', margin + 190, startY + 5.5);
                doc.text('Change', margin + 270, startY + 5.5, { align: 'right' });
                
                return startY + 8;
            };

            let y = margin;
            y = drawHeader(y);
            y = drawTableHeader(y);

            doc.setFontSize(8);
            doc.setTextColor(0);
            
            filteredMovements.forEach((m, index) => {
                const rowHeight = 7;
                if (y + rowHeight > pageHeight - 20) {
                    doc.addPage();
                    y = margin;
                    y = drawHeader(y);
                    y = drawTableHeader(y);
                }

                const product = getProductById(m.productId);
                const location = getLocationById(m.locationId);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0);
                
                doc.text(formatDateTime(m.timestamp), margin + 2, y + 4.5);
                doc.text(m.type, margin + 35, y + 4.5);
                doc.text(product?.name.substring(0, 45) || m.productId, margin + 70, y + 4.5);
                doc.text(location?.name.substring(0, 25) || (m.locationId === null ? 'Receiving Dock' : m.locationId), margin + 140, y + 4.5);
                doc.text(m.referenceId, margin + 190, y + 4.5);
                
                if (m.quantityChange > 0) doc.setTextColor(22, 101, 52);
                else doc.setTextColor(185, 28, 28);
                
                doc.text(m.quantityChange > 0 ? `+${m.quantityChange}` : `${m.quantityChange}`, margin + 270, y + 4.5, { align: 'right' });

                doc.setDrawColor(245, 245, 245);
                doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
                y += rowHeight;
            });

            drawFooter();
            doc.save(`Stock_Movement_${new Date().toISOString().split('T')[0]}.pdf`);
            addToast({ type: 'success', message: "PDF report generated successfully." });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            addToast({ type: 'error', message: "An error occurred while building the PDF." });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const headers: TableHeader[] = [
        'Timestamp', 'Type', 'Product', 'Location', 'Ref ID', { content: 'Qty Change', className: 'text-right' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Stock Movement Ledger</h1>
                <div className="flex items-center gap-2 no-print">
                    <Button variant="secondary" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button variant="secondary" onClick={handleDownloadPdf} disabled={isGeneratingPdf || !isDataReady || filteredMovements.length === 0}>
                        {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Download className="h-4 w-4 mr-2" />}
                        Download PDF
                    </Button>
                </div>
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
                        <div className="relative">
                            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Event Type</label>
                            <select 
                                id="type-filter" 
                                value={typeFilter} 
                                onChange={e => setTypeFilter(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="all">All Types</option>
                                {movementTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!isDataReady ? (
                        <TableSkeleton headers={headers} rows={10} />
                    ) : filteredMovements.length === 0 ? (
                        <EmptyState 
                            icon={FileWarning}
                            title="No Movements Found"
                            message="No inventory transactions were found for the selected date range and filters."
                        />
                    ) : (
                        <Table headers={headers}>
                            {paginatedMovements.map((m) => {
                                const product = getProductById(m.productId);
                                const location = getLocationById(m.locationId);
                                return (
                                    <tr key={m.id} className="hover:bg-accent">
                                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(m.timestamp)}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-foreground">{m.type}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-foreground truncate max-w-[200px]" title={product?.name}>{product?.name || m.productId}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{product?.sku}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-foreground">{location?.name || (m.locationId === null ? 'Receiving Dock' : 'Unknown')}</div>
                                            <div className="text-xs text-muted-foreground font-mono uppercase">{location?.code || 'DOCK'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{m.referenceId}</td>
                                        <td className={`px-6 py-4 text-sm text-right font-bold font-mono ${m.quantityChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                                        </td>
                                    </tr>
                                );
                            })}
                        </Table>
                    )}
                </CardContent>
                {isDataReady && filteredMovements.length > itemsPerPage && (
                    <CardFooter className="no-print">
                        <Pagination 
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredMovements.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default StockMovementReport;
