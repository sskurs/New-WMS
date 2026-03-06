'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import { DollarSign, Archive, BarChart3, Sparkles, FileText, Loader2 } from 'lucide-react';
import { generateReportSummary } from '@/services/geminiService';
import Button from '@/components/ui/Button';

// Declare the global type for the library loaded via script tag
declare global {
    interface Window {
        PptxGenJS: any;
    }
}

const ReportsDashboard: React.FC = () => {
    const { stocks, products, orders, loadStocks, loadProducts, loadOrders, dataState } = useAppContext();
    const [summary, setSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

    useEffect(() => {
        loadStocks();
        loadProducts();
        loadOrders();
    }, [loadStocks, loadProducts, loadOrders]);

    const kpis = useMemo(() => {
        const totalValue = stocks.reduce((sum, stock) => {
            const product = products.find(p => p.id === stock.productId);
            return sum + (product ? product.price * stock.quantity : 0);
        }, 0);

        const totalUnits = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

        const shippedOrders = orders.filter(o => o.status === 'Shipped' || o.status === 'Completed');
        const fillRate = orders.length > 0 ? (shippedOrders.length / orders.filter(o => o.status !== 'Cancelled').length) * 100 : 0;

        return {
            totalValue,
            totalUnits,
            fillRate
        };
    }, [stocks, products, orders]);
    
    useEffect(() => {
        if (dataState.stocks.loaded && dataState.products.loaded && dataState.orders.loaded) {
            const fetchSummary = async () => {
                setIsSummaryLoading(true);
                const summaryText = await generateReportSummary(kpis);
                setSummary(summaryText);
                setIsSummaryLoading(false);
            };
            fetchSummary();
        }
    }, [dataState.stocks.loaded, dataState.products.loaded, dataState.orders.loaded, kpis]);

    const handleDownloadPPT = async () => {
        setIsGeneratingPPT(true);
        try {
            // Dynamically load the library if it's not already present
            if (typeof window.PptxGenJS === 'undefined') {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error("Failed to load PowerPoint generator library."));
                    document.head.appendChild(script);
                });
            }

            // Verification check
            if (typeof window.PptxGenJS === 'undefined') {
                throw new Error("Library loaded but PptxGenJS object is missing.");
            }

            const pres = new window.PptxGenJS();

            // Define colors
            const PRIMARY_COLOR = '003366';
            const ACCENT_COLOR = 'E0E0E0';
            const TEXT_COLOR = '333333';
            const BLUE_BOX = '3B82F6';
            const GREEN_BOX = '10B981';
            const AMBER_BOX = 'F59E0B';

            // --- HELPER FUNCTIONS ---
            const drawFlowChart = (slide: any, steps: { text: string, color: string }[], yPos: number) => {
                const startX = 0.5;
                const boxWidth = 2.0;
                const boxHeight = 0.6;
                const gap = 0.5;
                const arrowY = yPos + (boxHeight / 2) - 0.05;

                steps.forEach((step, index) => {
                    const x = startX + (index * (boxWidth + gap));
                    
                    // Draw Box
                    slide.addShape(pres.ShapeType.rect, {
                        x: x, y: yPos, w: boxWidth, h: boxHeight,
                        fill: { color: step.color },
                        rectRadius: 0.1
                    });
                    
                    // Draw Text
                    slide.addText(step.text, {
                        x: x, y: yPos, w: boxWidth, h: boxHeight,
                        fontSize: 12, color: 'FFFFFF',
                        align: 'center', valign: 'middle', bold: true
                    });

                    // Draw Arrow to next step (if not last)
                    if (index < steps.length - 1) {
                        const arrowX = x + boxWidth + 0.05;
                        slide.addShape(pres.ShapeType.rightArrow, {
                            x: arrowX, y: arrowY, w: gap - 0.1, h: 0.15,
                            fill: { color: '999999' }
                        });
                    }
                });
            };

            // Helper to add an image placeholder box
            const addPlaceholderImage = (slide: any, label: string, x: number, y: number, w: number, h: number) => {
                slide.addShape(pres.ShapeType.rect, {
                    x: x, y: y, w: w, h: h,
                    fill: { color: 'F0F0F0' },
                    line: { color: '999999', width: 1, dashType: 'dash' }
                });
                slide.addText(`INSERT IMAGE:\n${label}`, {
                    x: x, y: y, w: w, h: h,
                    fontSize: 10, color: '666666', align: 'center', valign: 'middle'
                });
            };

            // --- SLIDE 1: TITLE SLIDE ---
            const slideTitle = pres.addSlide();
            slideTitle.background = { color: 'F3F4F6' };
            
            // Image Placeholder: Logo
            addPlaceholderImage(slideTitle, "Company Logo", 8.5, 0.5, 1.0, 1.0);
            
            slideTitle.addText("WMSPro™", { 
                x: 0, y: '40%', w: '100%', 
                fontSize: 48, bold: true, color: PRIMARY_COLOR, align: 'center' 
            });
            slideTitle.addText("Warehouse Management System Overview", { 
                x: 0, y: '55%', w: '100%', 
                fontSize: 18, color: '666666', align: 'center' 
            });
            slideTitle.addText(`Generated on ${new Date().toLocaleDateString()}`, { 
                x: 0, y: '90%', w: '100%', 
                fontSize: 10, color: '999999', align: 'center' 
            });

            // --- SLIDE 2: INBOUND ---
            const slide1 = pres.addSlide();
            slide1.addText("Inbound Logistics Flow", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true, color: PRIMARY_COLOR });
            slide1.addText("Source to Shelf", { x: 0.5, y: 1.0, w: '90%', fontSize: 14, color: '666666' });
            slide1.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.4, w: '90%', h: 0.05, fill: { color: ACCENT_COLOR } });

            // Image Placeholder: Operations
            addPlaceholderImage(slide1, "Forklift / Dock Photo", 7.5, 0.5, 2.0, 1.5);

            slide1.addText("1. Procurement", { x: 0.5, y: 1.8, fontSize: 16, bold: true, color: PRIMARY_COLOR });
            slide1.addText([
                { text: "Supplier Selection & Active Status Check", options: { bullet: true } },
                { text: "Purchase Order Creation with Cost Tracking", options: { bullet: true } },
                { text: "Dynamic Product Loading based on Supplier", options: { bullet: true } }
            ], { x: 0.5, y: 2.1, w: 4.5, fontSize: 12, color: TEXT_COLOR });

            slide1.addText("2. Receiving & Put-Away", { x: 5.2, y: 1.8, fontSize: 16, bold: true, color: PRIMARY_COLOR });
            slide1.addText([
                { text: "Dock Receipt (Location: null)", options: { bullet: true } },
                { text: "AI Suggestions for Optimal Bin Location", options: { bullet: true } },
                { text: "Capacity Checks & Final Confirmation", options: { bullet: true } }
            ], { x: 5.2, y: 2.1, w: 4.5, fontSize: 12, color: TEXT_COLOR });

            // Visual Workflow
            slide1.addText("Workflow Visualization:", { x: 0.5, y: 4.0, fontSize: 12, bold: true, color: '666666' });
            drawFlowChart(slide1, [
                { text: "Supplier", color: '6B7280' },
                { text: "PO Created", color: BLUE_BOX },
                { text: "Receiving Dock", color: AMBER_BOX },
                { text: "Warehouse Bin", color: GREEN_BOX }
            ], 4.4);


            // --- SLIDE 3: OUTBOUND ---
            const slide2 = pres.addSlide();
            slide2.addText("Outbound Order Fulfillment", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true, color: PRIMARY_COLOR });
            slide2.addText("Order to Door", { x: 0.5, y: 1.0, w: '90%', fontSize: 14, color: '666666' });
            slide2.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.4, w: '90%', h: 0.05, fill: { color: ACCENT_COLOR } });

            // Image Placeholder: Logistics
            addPlaceholderImage(slide2, "Shipping / Truck Photo", 7.5, 0.5, 2.0, 1.5);

            slide2.addText("1. Order Processing", { x: 0.5, y: 1.8, fontSize: 16, bold: true, color: PRIMARY_COLOR });
            slide2.addText([
                { text: "Customer Order Entry & Validation", options: { bullet: true } },
                { text: "Pricing Engine (Discounts/Rules)", options: { bullet: true } },
                { text: "Inventory Reservation", options: { bullet: true } }
            ], { x: 0.5, y: 2.1, w: 4.5, fontSize: 12, color: TEXT_COLOR });

            slide2.addText("2. Pick, Pack & Ship", { x: 5.2, y: 1.8, fontSize: 16, bold: true, color: PRIMARY_COLOR });
            slide2.addText([
                { text: "Pick List Generation by Zone", options: { bullet: true } },
                { text: "Packing Validation", options: { bullet: true } },
                { text: "Shipping & Stock Decrement", options: { bullet: true } }
            ], { x: 5.2, y: 2.1, w: 4.5, fontSize: 12, color: TEXT_COLOR });

            // Visual Workflow
            slide2.addText("Workflow Visualization:", { x: 0.5, y: 4.0, fontSize: 12, bold: true, color: '666666' });
            drawFlowChart(slide2, [
                { text: "New Order", color: '6B7280' },
                { text: "Picking", color: AMBER_BOX },
                { text: "Packing", color: BLUE_BOX },
                { text: "Shipped", color: GREEN_BOX }
            ], 4.4);


            // --- SLIDE 4: CORE INTELLIGENCE ---
            const slide3 = pres.addSlide();
            slide3.addText("Core Intelligence & AI", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true, color: PRIMARY_COLOR });
            slide3.addText("Smart Features powering the WMS", { x: 0.5, y: 1.0, w: '90%', fontSize: 14, color: '666666' });
            slide3.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.4, w: '90%', h: 0.05, fill: { color: ACCENT_COLOR } });

             // Image Placeholder: AI
             addPlaceholderImage(slide3, "AI / Tech Concept Photo", 7.5, 0.5, 2.0, 1.5);

            // Feature Cards Visual
            const cardY = 2.0;
            const cardW = 2.8;
            const cardH = 2.5;
            const cardGap = 0.3;

            // Card 1: Inventory
            slide3.addShape(pres.ShapeType.roundRect, { x: 0.5, y: cardY, w: cardW, h: cardH, fill: { color: 'EEF2FF' }, line: { color: BLUE_BOX } });
            slide3.addText("Inventory Control", { x: 0.6, y: cardY + 0.2, fontSize: 14, bold: true, color: BLUE_BOX });
            slide3.addText([
                { text: "Cycle Counting", options: { bullet: true } },
                { text: "Stock Alerts", options: { bullet: true } },
                { text: "Location Management", options: { bullet: true } }
            ], { x: 0.6, y: cardY + 0.6, w: cardW - 0.2, fontSize: 11, color: TEXT_COLOR });

            // Card 2: AI Features
            slide3.addShape(pres.ShapeType.roundRect, { x: 0.5 + cardW + cardGap, y: cardY, w: cardW, h: cardH, fill: { color: 'ECFDF5' }, line: { color: GREEN_BOX } });
            slide3.addText("AI Integration (Gemini)", { x: 0.6 + cardW + cardGap, y: cardY + 0.2, fontSize: 14, bold: true, color: GREEN_BOX });
            slide3.addText([
                { text: "Smart Put-Away Suggestions", options: { bullet: true } },
                { text: "Auto-Descriptions for Products", options: { bullet: true } },
                { text: "Sales Forecasting", options: { bullet: true } }
            ], { x: 0.6 + cardW + cardGap, y: cardY + 0.6, w: cardW - 0.2, fontSize: 11, color: TEXT_COLOR });

            // Card 3: Analytics
            slide3.addShape(pres.ShapeType.roundRect, { x: 0.5 + (cardW + cardGap) * 2, y: cardY, w: cardW, h: cardH, fill: { color: 'FFFBEB' }, line: { color: AMBER_BOX } });
            slide3.addText("Analytics & Reports", { x: 0.6 + (cardW + cardGap) * 2, y: cardY + 0.2, fontSize: 14, bold: true, color: AMBER_BOX });
            slide3.addText([
                { text: "Inventory Valuation", options: { bullet: true } },
                { text: "Stock Movement Logs", options: { bullet: true } },
                { text: "Executive Summaries", options: { bullet: true } }
            ], { x: 0.6 + (cardW + cardGap) * 2, y: cardY + 0.6, w: cardW - 0.2, fontSize: 11, color: TEXT_COLOR });


            await pres.writeFile({ fileName: "WMS_Functional_Flow_Enhanced.pptx" });
        } catch (error) {
            console.error("Error generating PPT:", error);
            alert("Failed to generate PowerPoint presentation. Please check your network connection.");
        } finally {
            setIsGeneratingPPT(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-foreground">Reports Dashboard</h1>
                <Button onClick={handleDownloadPPT} variant="secondary" disabled={isGeneratingPPT}>
                    {isGeneratingPPT ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    {isGeneratingPPT ? "Generating..." : "Download System Overview (PPT)"}
                </Button>
            </div>

            <Card className="mb-6 animate-fadeIn">
                <CardHeader className="flex items-center space-x-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">AI-Powered Summary</h2>
                </CardHeader>
                <CardContent>
                    {isSummaryLoading ? (
                        <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground italic">{summary}</p>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    icon={DollarSign} 
                    title="Total Inventory Value" 
                    value={`₹${kpis.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    description="Estimated current market value of all stock."
                />
                <StatCard 
                    icon={Archive} 
                    title="Total Stock Units" 
                    value={kpis.totalUnits.toLocaleString()}
                    description="Total number of individual items across all locations."
                />
                <StatCard 
                    icon={BarChart3} 
                    title="Order Fill Rate" 
                    value={`${kpis.fillRate.toFixed(1)}%`}
                    description="Percentage of orders successfully fulfilled."
                />
            </div>
        </div>
    );
};

interface StatCardProps {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title: string;
    value: string;
    description: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, description }) => (
    <Card>
        <CardContent className="p-5">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <div className="bg-muted p-3 rounded-md">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                    <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">{title}</dt>
                        <dd>
                            <div className="text-2xl font-bold text-foreground">{value}</div>
                        </dd>
                    </dl>
                </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{description}</p>
        </CardContent>
    </Card>
);

export default ReportsDashboard;
