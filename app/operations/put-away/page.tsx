'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import CardSkeleton from '@/components/skeletons/CardSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Package, Sparkles, Server, ChevronDown, AlertCircle, CheckCircle2, Filter, ListChecks, Info, Activity, Box, RefreshCw } from 'lucide-react';
import { Location, InboundItem, InboundShipment, InProgressPutAwayItem, Stock } from '@/types';
import Button from '@/components/ui/Button';
import { suggestPutAwayLocation } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ProgressBar from '@/components/ui/ProgressBar';
import Table from '@/components/ui/Table';
import Select from '@/components/ui/Select';

// --- Location Details Modal Component ---
const LocationDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    location: Location | null;
    selectedShipment: InboundShipment | null;
    onConfirmPutAway: (locationId: string) => void;
}> = ({ isOpen, onClose, location, selectedShipment, onConfirmPutAway }) => {
    const { getProductById, stocks, putAwayRecords } = useAppContext();

    // Finalized stock in this location
    const finalizedStocks = useMemo(() => {
        if (!location) return [];
        return stocks.filter(s => String(s.locationId) === String(location.id) && s.quantity > 0);
    }, [stocks, location]);

    // In-progress stows for this location
    const inProgressStows = useMemo(() => {
        if (!location) return [];
        return putAwayRecords.filter(r => 
            String(r.locationId) === String(location.id) && 
            (r.status || '').toLowerCase().includes('in progress')
        );
    }, [putAwayRecords, location]);

    if (!location) return null;

    const currentUnits = finalizedStocks.reduce((sum, s) => sum + s.quantity, 0);
    const inTransitUnits = inProgressStows.reduce((sum, r) => sum + r.quantity, 0);
    const totalCapacity = location.capacity || 2000;
    
    // Utilization logic: counts both finalized and staged units
    const totalOccupancy = currentUnits + inTransitUnits;
    const utilization = (totalOccupancy / totalCapacity) * 100;
    const remainingCapacity = Math.max(0, totalCapacity - totalOccupancy);

    const totalIncomingQty = selectedShipment?.items.reduce((sum, i) => sum + i.quantity, 0) || 0;
    const isOverCapacity = totalIncomingQty > remainingCapacity;
    const isLocationFull = remainingCapacity <= 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Location: ${location.name}`} size="2xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted-foreground">Code</span>
                            <span className="font-semibold text-foreground">{location.code}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <span className="font-semibold text-foreground">{location.type}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm text-muted-foreground">Capacity</span>
                            <span className="font-semibold text-foreground">{totalCapacity.toLocaleString()} units</span>
                        </div>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground flex justify-between">
                            <span>Projected Utilization</span>
                            <span className="font-bold text-foreground">{totalOccupancy.toLocaleString()} / {totalCapacity.toLocaleString()}</span>
                        </p>
                        <ProgressBar value={utilization} className="mt-1" />
                        <div className="flex justify-between mt-1.5 text-[10px] font-bold uppercase tracking-tight">
                            <span className="text-emerald-600">Finalized: {currentUnits}</span>
                            <span className="text-sky-600">In-Transit: {inTransitUnits}</span>
                        </div>
                    </div>
                    {selectedShipment && (
                        <div className="p-4 border-t space-y-3">
                             <h3 className="font-semibold text-lg text-foreground">Confirm Movement</h3>
                             <div className="p-2 bg-primary/10 rounded-md text-sm border border-primary/20">
                                <p className="font-bold text-primary">PO: #{selectedShipment.purchaseOrderId}</p>
                                <p className="text-primary/80">Total Items: {selectedShipment.items.length}</p>
                                <p className="text-primary/80">Total Quantity: {totalIncomingQty}</p>
                            </div>

                            {isLocationFull ? (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex flex-col gap-1 text-destructive">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Capacity Full</span>
                                    </div>
                                    <p className="text-xs">No storage space left here including pending stows.</p>
                                </div>
                            ) : (
                                <>
                                    {isOverCapacity && (
                                        <div className="p-2 bg-destructive/5 border border-destructive/20 rounded">
                                            <p className="text-xs text-destructive font-medium">
                                                PO Volume ({totalIncomingQty}) exceeds remaining {remainingCapacity} units.
                                            </p>
                                        </div>
                                    )}

                                    <Button 
                                        onClick={() => onConfirmPutAway(location.id)} 
                                        className="w-full" 
                                        disabled={totalIncomingQty <= 0 || isOverCapacity}
                                    >
                                        Move All to Bin
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                             <ListChecks className="w-4 h-4" /> Incoming Items to Stow
                        </h3>
                        <div className="max-h-48 overflow-y-auto border rounded-md sidebar-scrollbar">
                            <Table headers={['Product', { content: 'Qty', className: 'text-right' }]}>
                                {selectedShipment?.items.map(item => {
                                    const p = getProductById(item.productId);
                                    return (
                                        <tr key={item.itemId}>
                                            <td className="px-4 py-2 text-xs font-medium text-foreground">{p?.name || item.productId}</td>
                                            <td className="px-4 py-2 text-xs text-right font-bold text-foreground">{item.quantity}</td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                            <Server className="w-4 h-4" /> Current Bin Ledger
                        </h3>
                        {(finalizedStocks.length > 0 || inProgressStows.length > 0) ? (
                            <div className="max-h-48 overflow-y-auto border rounded-md sidebar-scrollbar">
                                <Table headers={['Product', { content: 'Qty', className: 'text-right' }, { content: 'Status', className: 'text-center' }]}>
                                    {finalizedStocks.map(stock => {
                                        const product = getProductById(stock.productId);
                                        return (
                                            <tr key={stock.id}>
                                                <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[150px]">{product?.name || `ID: ${stock.productId}`}</td>
                                                <td className="px-4 py-2 text-xs text-right text-muted-foreground">{stock.quantity}</td>
                                                <td className="px-4 py-2 text-center"><span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Stowed</span></td>
                                            </tr>
                                        );
                                    })}
                                    {inProgressStows.map(record => {
                                        const product = getProductById(record.productId);
                                        return (
                                            <tr key={record.id} className="bg-sky-50/50">
                                                <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[150px] font-medium">{product?.name || `ID: ${record.productId}`}</td>
                                                <td className="px-4 py-2 text-xs text-right text-sky-600 font-bold">{record.quantity}</td>
                                                <td className="px-4 py-2 text-center"><span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Moving</span></td>
                                            </tr>
                                        );
                                    })}
                                </Table>
                            </div>
                        ) : <div className="text-center p-6 bg-muted rounded-lg"><p className="text-xs text-muted-foreground italic">Bin is empty.</p></div>}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const WarehouseLayout: React.FC<{
    locations: Location[];
    stocks: Stock[];
    putAwayRecords: InProgressPutAwayItem[];
    getProductById: (id: string) => any;
    onViewLocation: (location: Location) => void;
    suggestedLocationId?: string;
}> = ({ locations, stocks, putAwayRecords, getProductById, onViewLocation, suggestedLocationId }) => {
    const [openRacks, setOpenRacks] = useState<Set<string>>(new Set());

    const hierarchy = useMemo(() => {
        const racks = Array.from(new Map(
            locations
                .filter(l => l.type === 'Rack' && l.isActive !== false)
                .map(l => [l.code, l])
        ).values());
        
        const uniqueStorageLocations = Array.from(new Map(
            locations
                .filter(l => ['Bin', 'Shelf', 'Rack'].includes(l.type) && l.isActive !== false)
                .map(l => [l.code, l])
        ).values());

        const zones: Record<string, Record<string, { rackInfo: Location | null, locations: Location[] }>> = {};

        uniqueStorageLocations.forEach(location => {
            const zoneName = location.zone || 'General';
            if (!zones[zoneName]) zones[zoneName] = {};

            let parentRack = racks.find(r => location.code.startsWith(r.code + '-') && location.zone === r.zone);
            const rackId = parentRack ? parentRack.id : 'unracked';
            
            if (!zones[zoneName][rackId]) zones[zoneName][rackId] = { rackInfo: parentRack || null, locations: [] };
            
            if (location.type !== 'Rack') {
                zones[zoneName][rackId].locations.push(location);
            }
        });

        return Object.entries(zones).map(([zoneName, racks]) => ({
            zoneName,
            racks: Object.entries(racks)
                .filter(([_, data]) => data.locations.length > 0)
                .map(([rackId, data]) => ({
                    rackId,
                    rackName: data.rackInfo?.name || `General Storage`,
                    locations: data.locations.sort((a,b) => a.code.localeCompare(b.code))
                }))
        })).filter(z => z.racks.length > 0);
    }, [locations]);
    
    return (
        <Card className="h-full border-primary/20">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium text-foreground">Interactive Storage Map</h2>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Stowed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-sky-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">In-Transit</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[75vh] overflow-y-auto sidebar-scrollbar pt-2">
                {hierarchy.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground">
                        <p>No storage locations configured yet.</p>
                    </div>
                ) : (
                    hierarchy.map(({ zoneName, racks }) => (
                        <div key={zoneName} className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <Activity className="w-4 h-4 text-primary" />
                                <h3 className="font-extrabold text-sm uppercase tracking-widest text-foreground no-bar mb-0 p-0 border-0 bg-transparent">{zoneName}</h3>
                            </div>
                            <div className="space-y-3">
                                {racks.map(({ rackId, rackName, locations: locationsInRack }) => {
                                    const rackKey = `${zoneName}__${rackId}`;
                                    const isOpen = openRacks.has(rackKey);
                                    
                                    // Aggregate products in this rack for a summary
                                    const productsInRackRaw = Array.from(new Set(
                                        locationsInRack.flatMap(l => [
                                            ...stocks.filter(s => String(s.locationId) === String(l.id)).map(s => s.productId),
                                            ...putAwayRecords.filter(r => String(r.locationId) === String(l.id) && (r.status || '').toLowerCase().includes('in progress')).map(r => r.productId)
                                        ])
                                    ));
                                    
                                    const productsInRack = productsInRackRaw.map(pid => getProductById(pid)).filter(Boolean);

                                    return (
                                    <div key={rackId} className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-muted/30 shadow-inner' : 'bg-muted/10 hover:bg-muted/20'}`}>
                                        <button 
                                            data-testid="rack-toggle"
                                            onClick={() => setOpenRacks(prev => {
                                                const next = new Set(prev);
                                                if (next.has(rackKey)) next.delete(rackKey); else next.add(rackKey);
                                                return next;
                                            })} className="w-full flex items-center justify-between p-2 rounded-md transition-colors focus:outline-none">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-md ${isOpen ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    <Server className="w-4 h-4" />
                                                </div>
                                                <div className="text-left overflow-hidden">
                                                    <span className="font-bold text-foreground block truncate max-w-[200px]">{rackName}</span>
                                                    {!isOpen && productsInRack.length > 0 && (
                                                        <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">
                                                            Contains: {productsInRack.slice(0, 3).map(p => p.name).join(', ')}{productsInRack.length > 3 ? '...' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                                    {locationsInRack.length} Slots
                                                </span>
                                                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>
                                        {isOpen && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-3 px-2">
                                                {locationsInRack.map(loc => {
                                                    const locFinalized = stocks.filter(s => String(s.locationId) === String(loc.id));
                                                    const locInProgress = putAwayRecords.filter(r => String(r.locationId) === String(loc.id) && (r.status || '').toLowerCase().includes('in progress'));
                                                    
                                                    const finalUnits = locFinalized.reduce((sum, s) => sum + s.quantity, 0);
                                                    const movingUnits = locInProgress.reduce((sum, r) => sum + r.quantity, 0);
                                                    
                                                    const totalUnits = finalUnits + movingUnits;
                                                    const totalCap = loc.capacity || 2000;
                                                    const percentage = totalCap > 0 ? (totalUnits / totalCap) * 100 : 0;
                                                    const isSuggested = loc.id === suggestedLocationId;
                                                    
                                                    return (
                                                        <button
                                                            key={loc.id}
                                                            data-testid={`location-slot-${loc.code}`}
                                                            onClick={() => onViewLocation(loc)}
                                                            className={`p-2 rounded-md border text-left bg-background hover:border-primary/50 transition-all group relative overflow-hidden ${isSuggested ? 'ring-2 ring-primary shadow-lg scale-[1.05] z-10' : ''}`}
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="text-[10px] font-extrabold text-foreground truncate group-hover:text-primary transition-colors">{loc.code}</p>
                                                                {movingUnits > 0 && <Box className="w-2.5 h-2.5 text-sky-500 animate-pulse" />}
                                                            </div>
                                                            <div className="h-1 w-full rounded-full bg-muted overflow-hidden flex">
                                                                <div className="h-full bg-emerald-500" style={{ width: `${(finalUnits/totalCap)*100}%` }} />
                                                                <div className="h-full bg-sky-400 opacity-60" style={{ width: `${(movingUnits/totalCap)*100}%` }} />
                                                            </div>
                                                            <div className="flex justify-between items-center mt-1">
                                                                <p className="text-[9px] text-muted-foreground whitespace-nowrap font-medium">{totalUnits}/{totalCap}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

const PutAwayPage: React.FC = () => {
    const router = useRouter();
    const { 
        inboundShipments, locations, putAwayRecords, stocks,
        loadInboundShipments, loadLocations, loadStocks, loadProducts, loadPurchaseOrders, loadPutAwayRecords,
        dataState, getProductById, getCategoryById, putAwayShipment
    } = useAppContext();
    const { addToast } = useToast();

    const [selectedShipment, setSelectedShipment] = useState<InboundShipment | null>(null);
    const [suggestedLocationId, setSuggestedLocationId] = useState<string>();
    const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
    const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
    const [putAwaySearchTerm, setPutAwaySearchTerm] = useState('');
    const [dockStatus, setDockStatus] = useState<'pending' | 'completed'>('pending');

    const refreshAllData = useCallback(async (force = false) => {
        try {
            await Promise.all([
                loadInboundShipments(force),
                loadLocations(force),
                loadStocks(force),
                loadPutAwayRecords(force),
                loadProducts(force)
            ]);
        } catch (error) {
            console.error("Data refresh failed", error);
        }
    }, [loadInboundShipments, loadLocations, loadStocks, loadPutAwayRecords, loadProducts]);
    
    useEffect(() => {
        refreshAllData(true);
    }, []);

    const filteredInboundShipments = useMemo(() => {
        let baseList: InboundShipment[] = [];

        if (dockStatus === 'completed') {
            const completedItems = putAwayRecords.filter(r => (r.status || '').toLowerCase().includes('complete'));
            const groupedByPo: Record<string, InboundShipment> = {};

            completedItems.forEach(r => {
                if (!groupedByPo[r.purchaseOrderId]) {
                    groupedByPo[r.purchaseOrderId] = {
                        id: `ship-comp-${r.purchaseOrderId}`,
                        purchaseOrderId: r.purchaseOrderId,
                        items: [],
                        receivedAt: r.receivedAt,
                        status: 'Received',
                        receivedByUserId: r.userId
                    };
                }
                groupedByPo[r.purchaseOrderId].items.push({
                    itemId: r.id,
                    productId: r.productId,
                    quantity: r.quantity,
                    recordId: r.putawayId
                });
            });
            baseList = Object.values(groupedByPo);
        } else {
            const pendingList = inboundShipments
                .map(s => ({
                    ...s,
                    items: s.items.filter(item => {
                        const historyRecord = putAwayRecords.find(r => r.id === item.itemId);
                        const isHandled = historyRecord && (
                            (historyRecord.status || '').toLowerCase().includes('complete') ||
                            (historyRecord.status || '').toLowerCase().includes('in progress')
                        );
                        return !isHandled;
                    })
                }))
                .filter(s => s.items.length > 0);

            const inProgressItems = putAwayRecords.filter(r => (r.status || '').toLowerCase().includes('in progress'));
            const groupedInProgress: Record<string, InboundShipment> = {};
            inProgressItems.forEach(r => {
                if (!groupedInProgress[r.purchaseOrderId]) {
                    groupedInProgress[r.purchaseOrderId] = {
                        id: `ship-prog-${r.purchaseOrderId}`,
                        purchaseOrderId: r.purchaseOrderId,
                        items: [],
                        receivedAt: r.receivedAt,
                        status: 'Partially Received',
                        receivedByUserId: r.userId
                    };
                }
                groupedInProgress[r.purchaseOrderId].items.push({
                    itemId: r.id,
                    productId: r.productId,
                    quantity: r.quantity,
                    recordId: r.putawayId
                });
            });
            
            baseList = [...pendingList, ...Object.values(groupedInProgress)];
        }

        if (!putAwaySearchTerm) return baseList;
        const q = putAwaySearchTerm.toLowerCase();
        return baseList.filter(s => 
            s.purchaseOrderId.toLowerCase().includes(q) || 
            s.items.some((i: any) => getProductById(i.productId)?.name.toLowerCase().includes(q))
        );
    }, [inboundShipments, putAwayRecords, dockStatus, putAwaySearchTerm, getProductById]);

    const handleSuggest = async (shipment: InboundShipment) => {
        if (!shipment.items.length) return;
        const firstItem = shipment.items[0];
        const product = getProductById(firstItem.productId);
        if (!product) return;
        
        setIsSuggesting(shipment.id);
        try {
            const suggestedCode = await suggestPutAwayLocation(
                product.name, 
                getCategoryById(product.categoryId)?.name || '', 
                locations.filter(l => l.status === 'Available')
            );
            const suggestedLoc = locations.find(l => l.code === suggestedCode);
            if (suggestedLoc) {
                setSuggestedLocationId(suggestedLoc.id);
                addToast({ type: 'success', message: `AI recommends ${suggestedLoc.code} for this shipment.` });
            }
        } finally {
            setIsSuggesting(null);
        }
    };
    
    const handleConfirmBulkPutAway = async (locationId: string) => {
        if (!selectedShipment || !viewingLocation) return;
        
        try {
            await putAwayShipment(selectedShipment, locationId);
            setViewingLocation(null);
            setSelectedShipment(null);
            setSuggestedLocationId(undefined);
            await refreshAllData(true);
        } catch (error) {
            console.error("Bulk put-away failed", error);
        }
    };

    if (!dataState.locations.loaded) return <CardSkeleton />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 flex flex-col gap-4 max-h-[85vh]">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-medium">{dockStatus === 'pending' ? 'Pending Shipments' : 'Completed Shipments'}</h2>
                                <Button variant="ghost" size="sm" onClick={() => refreshAllData(true)} title="Refresh Data">
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative group">
                                <Select 
                                    id="dock-filter" 
                                    value={dockStatus} 
                                    onChange={e => setDockStatus(e.target.value as any)}
                                    className="pl-9 h-10"
                                >
                                    <option value="pending">Awaiting Put-Away</option>
                                    <option value="completed">History</option>
                                </Select>
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="relative">
                                <Input 
                                    id="q" 
                                    placeholder="Search POs..." 
                                    value={putAwaySearchTerm} 
                                    onChange={e => setPutAwaySearchTerm(e.target.value)} 
                                    className="pl-9 h-10"
                                />
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex-grow overflow-y-auto space-y-4 pr-1 sidebar-scrollbar">
                        {filteredInboundShipments.length === 0 ? (
                            <EmptyState 
                                icon={dockStatus === 'pending' ? Package : CheckCircle2} 
                                title={dockStatus === 'pending' ? "Dock is Clear" : "No History"} 
                                message={dockStatus === 'pending' ? "No shipments found at the receiving dock." : "No completed put-away tasks found."} 
                            />
                        ) : (
                            filteredInboundShipments.map(s => {
                                const isSelected = selectedShipment?.purchaseOrderId === s.purchaseOrderId;
                                const isCompleted = dockStatus === 'completed';
                                
                                return (
                                    <Card key={s.id} className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary border-primary shadow-lg' : ''} ${isCompleted ? 'opacity-80 border-dashed' : ''}`}>
                                        <CardHeader className="p-4 bg-muted/20 flex flex-row justify-between items-center">
                                            <div>
                                                <p className="font-bold text-foreground">PO: #{s.purchaseOrderId}</p>
                                                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{s.items.length} Items Received</p>
                                            </div>
                                            {!isCompleted && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => handleSuggest(s)} loading={isSuggesting === s.id} title="AI Placement Suggestion">
                                                        <Sparkles className="w-4 h-4 text-primary"/>
                                                    </Button>
                                                    <Button size="sm" variant={isSelected ? "primary" : "secondary"} onClick={() => setSelectedShipment(s)}>
                                                        {isSelected ? 'Active' : 'Stow All'}
                                                    </Button>
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <ul className="divide-y divide-border">
                                                {s.items.map((i: any) => {
                                                    const p = getProductById(i.productId);
                                                    return (
                                                        <li key={i.itemId} className="p-3 flex justify-between items-center text-xs">
                                                            <div className="flex-1 truncate pr-4">
                                                                <p className="font-medium text-foreground truncate">{p?.name || i.productId}</p>
                                                                <p className="text-[10px] text-muted-foreground font-mono">SKU: {p?.sku || '...'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-bold text-primary">{i.quantity}</span>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <WarehouseLayout 
                        locations={locations} 
                        stocks={stocks}
                        putAwayRecords={putAwayRecords}
                        getProductById={getProductById}
                        onViewLocation={setViewingLocation} 
                        suggestedLocationId={suggestedLocationId} 
                    />
                </div>
            </div>
            <LocationDetailsModal 
                isOpen={!!viewingLocation} 
                onClose={() => setViewingLocation(null)} 
                location={viewingLocation} 
                selectedShipment={selectedShipment} 
                onConfirmPutAway={handleConfirmBulkPutAway} 
            />
        </div>
    );
};

export default PutAwayPage;