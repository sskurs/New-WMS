'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import { Printer, Download, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/contexts/ToastContext';
import jsPDF from 'jspdf';
import { formatCurrency, formatDateTime } from '@/api/utils';

const InventoryValuation: React.FC = () => {
  const { products, getStockForProduct, loadProducts, loadStocks, dataState } = useAppContext();
  const { addToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadProducts();
    loadStocks();
  }, [loadProducts, loadStocks]);

  const isDataReady = useMemo(() => (
    dataState.products.loaded && dataState.stocks.loaded
  ), [dataState]);

  const valuationData = useMemo(() => {
    const data = products.map(product => {
      const totalStock = getStockForProduct(product.id).reduce((sum: number, s) => sum + s.quantity, 0);
      const value = totalStock * product.price;
      return {
        ...product,
        totalStock,
        value,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    const totalValue = data.reduce((sum, p) => sum + p.value, 0);
    return { data, totalValue };
  }, [products, getStockForProduct]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return valuationData.data.slice(startIndex, startIndex + itemsPerPage);
  }, [valuationData.data, currentPage]);
  
  const headers = ['Sr No', 'Product', 'SKU', 'Total Stock', 'Unit Price', 'Total Value'];

  const handleDownloadPdf = async () => {
    if (!valuationData.data.length) return;
    setIsGeneratingPdf(true);
    
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const nowStr = formatDateTime(new Date().toISOString());

        const drawHeader = (startY: number) => {
            // Logo Block
            doc.setFillColor(34, 46, 80); 
            doc.rect(margin, startY, 12, 12, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            doc.text('P', margin + 6, startY + 8.5, { align: 'center' });

            // Company Title
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.text('WMSPro™', margin + 15, startY + 6.5);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text('Propix Technologies Pvt. Ltd.', margin + 15, startY + 11);

            // Report Title
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(34, 46, 80);
            doc.text('Inventory Valuation Report', pageWidth - margin, startY + 7.5, { align: 'right' });
            
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, startY + 15, pageWidth - margin, startY + 15);
            return startY + 22;
        };

        const drawFooter = () => {
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(150);
                doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
                doc.text(`Report generated on: ${nowStr}`, margin, pageHeight - 10);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
        };

        const drawTableHeader = (startY: number) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setFillColor(0, 0, 0); 
            doc.rect(margin, startY, pageWidth - (margin * 2), 10, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.text('Sr No', margin + 2, startY + 6.5);
            doc.text('Product', margin + 15, startY + 6.5);
            doc.text('SKU', margin + 75, startY + 6.5);
            doc.text('Stock', margin + 115, startY + 6.5, { align: 'right' });
            doc.text('Price', margin + 145, startY + 6.5, { align: 'right' });
            doc.text('Total Value', margin + 180, startY + 6.5, { align: 'right' });
            
            return startY + 10;
        };

        let y = margin;
        y = drawHeader(y);
        y = drawTableHeader(y);

        doc.setTextColor(0);
        doc.setFontSize(9);
        
        valuationData.data.forEach((item, index) => {
            const rowHeight = 8;
            if (y + rowHeight > pageHeight - 25) {
                doc.addPage();
                y = margin;
                y = drawHeader(y);
                y = drawTableHeader(y);
            }

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            
            // Alignments: Strings Left, Numbers Right
            doc.text((index + 1).toString(), margin + 2, y + 5.5);
            const name = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
            doc.text(name, margin + 15, y + 5.5);
            doc.text(item.sku || 'N/A', margin + 75, y + 5.5);
            doc.text(item.totalStock.toString(), margin + 115, y + 5.5, { align: 'right' });
            doc.text(formatCurrency(item.price), margin + 145, y + 5.5, { align: 'right' });
            doc.text(formatCurrency(item.value), margin + 180, y + 5.5, { align: 'right' });

            doc.setDrawColor(240, 240, 240);
            doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
            y += rowHeight;
        });

        // Totals
        if (y + 15 > pageHeight - 25) {
            doc.addPage();
            y = margin;
            y = drawHeader(y);
        }
        y += 5;
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('GRAND TOTAL INVENTORY VALUE:', margin + 5, y + 6.5);
        doc.text(formatCurrency(valuationData.totalValue), pageWidth - margin - 5, y + 6.5, { align: 'right' });

        drawFooter();
        doc.save(`Inventory_Valuation_${new Date().toISOString().split('T')[0]}.pdf`);
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
        <Card>
            <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Inventory Valuation Report</h2>
            <div className="flex items-center gap-2 no-print">
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
            ) : (
                <Table headers={headers}>
                {paginatedData.map((item, index) => (
                    <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500 font-mono">{item.totalStock}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500 font-mono">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-slate-900 font-mono">{formatCurrency(item.value)}</td>
                    </tr>
                ))}
                </Table>
            )}
            </CardContent>
            {isDataReady && (
            <CardFooter className="flex flex-col items-stretch gap-4">
                    <div className="text-right border-t pt-4 mt-2">
                        <span className="text-lg font-bold">Grand Total Value:</span>
                        <span className="text-xl font-extrabold text-slate-700 ml-2">
                            {formatCurrency(valuationData.totalValue)}
                        </span>
                    </div>
                    {valuationData.data.length > itemsPerPage && (
                        <div className="no-print">
                            <Pagination
                                itemsPerPage={itemsPerPage}
                                totalItems={valuationData.data.length}
                                currentPage={currentPage}
                                paginate={setCurrentPage}
                            />
                        </div>
                    )}
                </CardFooter>
            )}
        </Card>
    </div>
  );
};

export default InventoryValuation;