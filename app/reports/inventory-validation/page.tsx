'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import { CheckCircle, FileWarning, Sigma, Percent, Printer, Download, Loader2 } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/api/utils';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
// FIX: Corrected import casing from 'jsPDF' to 'jspdf' to resolve TypeScript casing and module errors.
import jsPDF from 'jspdf';

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


const InventoryValidationReport: React.FC = () => {
    const { 
        cycleCounts, getProductById, getLocationById,
        loadCycleCounts, loadProducts, loadLocations, dataState, loadZones
    } = useAppContext();
    const { addToast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        loadCycleCounts(true);
        loadProducts(true);
        loadLocations(true);
        loadZones(true);
    }, [loadCycleCounts, loadProducts, loadLocations, loadZones]);

    const isDataReady = useMemo(() => (
        dataState.cycleCounts.loaded && dataState.products.loaded && dataState.locations.loaded
    ), [dataState]);

    const completedCycleCountItems = useMemo(() => {
        if (!isDataReady) return [];
        return cycleCounts
            .filter(cc => {
                const status = (cc.status || '').toLowerCase();
                return status === 'completed' || status === 'adjusted';
            })
            .flatMap(cc => cc.items)
            .sort((a, b) => {
                const dateA = a.countedAt ? new Date(a.countedAt).getTime() : 0;
                const dateB = b.countedAt ? new Date(b.countedAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [cycleCounts, isDataReady]);

    const stats = useMemo(() => {
        if (completedCycleCountItems.length === 0) {
            return { totalItemsCounted: 0, totalVarianceValue: 0, accuracy: '100.0%' };
        }

        let totalSystemQty = 0;
        let totalAbsoluteVariance = 0;
        let totalVarianceValue = 0;

        completedCycleCountItems.forEach(item => {
            const systemQty = item.systemQuantity;
            const countedQty = item.countedQuantity ?? systemQty;
            const product = getProductById(item.productId);
            const price = product?.price || 0;
            
            totalSystemQty += systemQty;
            totalAbsoluteVariance += Math.abs(systemQty - countedQty);
            totalVarianceValue += (countedQty - systemQty) * price;
        });
        
        const accuracy = totalSystemQty > 0 
            ? ((totalSystemQty - totalAbsoluteVariance) / totalSystemQty) * 100 
            : 100;

        return {
            totalItemsCounted: completedCycleCountItems.length,
            totalVarianceValue,
            accuracy: `${Math.max(0, accuracy).toFixed(1)}%`,
        };
    }, [completedCycleCountItems, getProductById]);

    const paginatedItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return completedCycleCountItems.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [completedCycleCountItems, currentPage]);

    const headers: TableHeader[] = [
        'Sr No', 'Product', 'Location', 'Count Date', 'System Qty', 'Counted Qty', 'Variance', 'Value Diff'
    ];
    
    const handleDownloadPdf = async () => {
        if (!completedCycleCountItems.length) return;
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
                doc.text('Inventory Validation Report', pageWidth - margin, startY + 6, { align: 'right' });
                
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
                doc.text('Sr No', margin + 2, startY + 5.5);
                doc.text('Product', margin + 15, startY + 5.5);
                doc.text('Location', margin + 85, startY + 5.5);
                doc.text('Count Date', margin + 130, startY + 5.5);
                doc.text('System Qty', margin + 175, startY + 5.5, { align: 'right' });
                doc.text('Counted Qty', margin + 205, startY + 5.5, { align: 'right' });
                doc.text('Variance', margin + 235, startY + 5.5, { align: 'right' });
                doc.text('Value Diff', margin + 275, startY + 5.5, { align: 'right' });
                
                return startY + 8;
            };

            let y = margin;
            y = drawHeader(y);
            y = drawTableHeader(y);

            doc.setFontSize(8);
            doc.setTextColor(0);
            
            completedCycleCountItems.forEach((item, index) => {
                const rowHeight = 7;
                if (y + rowHeight > pageHeight - 20) {
                    doc.addPage();
                    y = margin;
                    y = drawHeader(y);
                    y = drawTableHeader(y);
                }

                const product = getProductById(item.productId);
                const location = getLocationById(item.locationId);
                const countedQty = item.countedQuantity ?? item.systemQuantity;
                const variance = countedQty - item.systemQuantity;
                const varianceValue = variance * (product?.price || 0);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0);
                
                doc.text((index + 1).toString(), margin + 2, y + 4.5);
                doc.text(product?.name.substring(0, 40) || item.productId, margin + 15, y + 4.5);
                doc.text(location?.name.substring(0, 15) || item.locationId, margin + 85, y + 4.5);
                doc.text(formatDateTime(item.countedAt), margin + 130, y + 4.5);
                
                doc.text(item.systemQuantity.toString(), margin + 175, y + 4.5, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text(countedQty.toString(), margin + 205, y + 4.5, { align: 'right' });
                
                if (variance === 0) doc.setTextColor(100, 100, 100);
                else if (variance > 0) doc.setTextColor(22, 101, 52);
                else doc.setTextColor(185, 28, 28);
                
                doc.text(variance > 0 ? `+${variance}` : `${variance}`, margin + 235, y + 4.5, { align: 'right' });
                doc.text(formatCurrency(varianceValue), margin + 275, y + 4.5, { align: 'right' });

                doc.setDrawColor(245, 245, 245);
                doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
                y += rowHeight;
            });

            drawFooter();
            doc.save(`Inventory_Validation_${new Date().toISOString().split('T')[0]}.pdf`);
            addToast({ type: 'success', message: "PDF report generated successfully." });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            addToast({ type: 'error', message: "An error occurred while building the PDF." });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Inventory Validation Report</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {!isDataReady ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatCard icon={CheckCircle} title="Total Items Counted" value={stats.totalItemsCounted} color="text-sky-500" />
                        <StatCard icon={Sigma} title="Net Variance Value" value={formatCurrency(stats.totalVarianceValue)} color={stats.totalVarianceValue >= 0 ? "text-emerald-500" : "text-rose-500"} />
                        <StatCard icon={Percent} title="Inventory Accuracy" value={stats.accuracy} color="text-violet-500" />
                    </>
                )}
            </div>
            <div className="printable-area">
                <Card>
                    <CardHeader className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-medium text-foreground">Count Details</h2>
                            <p className="text-sm text-muted-foreground mt-1">Detailed results from all completed cycle counts.</p>
                        </div>
                        <div className="flex items-center gap-2 no-print flex-shrink-0">
                            <Button variant="secondary" onClick={() => window.print()}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                            <Button variant="secondary" onClick={handleDownloadPdf} disabled={isGeneratingPdf || !isDataReady}>
                                {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Download className="h-4 w-4 mr-2" />}
                                Download PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!isDataReady ? (
                            <TableSkeleton headers={headers} rows={10} />
                        ) : completedCycleCountItems.length === 0 ? (
                            <EmptyState 
                                icon={FileWarning}
                                title="No Cycle Count Data"
                                message="Complete a cycle count to see validation data here."
                            />
                        ) : (
                            <Table headers={headers}>
                                {paginatedItems.map((item, index) => {
                                    const product = getProductById(item.productId);
                                    const location = getLocationById(item.locationId);
                                    const countedQty = item.countedQuantity ?? item.systemQuantity;
                                    const variance = countedQty - item.systemQuantity;
                                    const varianceValue = variance * (product?.price || 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-accent">
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4 font-medium text-foreground">{product?.name || item.productId}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{location?.name || item.locationId}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(item.countedAt)}</td>
                                            <td className="px-6 py-4 text-sm text-right font-mono text-muted-foreground">{item.systemQuantity}</td>
                                            <td className="px-6 py-4 text-sm text-right font-mono font-bold text-foreground">{countedQty}</td>
                                            <td className={`px-6 py-4 text-sm text-right font-mono font-bold ${variance === 0 ? 'text-muted-foreground' : variance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {variance > 0 ? `+${variance}` : variance}
                                            </td>
                                            <td className={`px-6 py-4 text-sm text-right font-mono font-bold ${varianceValue === 0 ? 'text-muted-foreground' : varianceValue > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {formatCurrency(varianceValue)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        )}
                    </CardContent>
                    {isDataReady && completedCycleCountItems.length > itemsPerPage && (
                        <CardFooter className="no-print">
                            <Pagination 
                                itemsPerPage={itemsPerPage}
                                totalItems={completedCycleCountItems.length}
                                currentPage={currentPage}
                                paginate={setCurrentPage}
                            />
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default InventoryValidationReport;
