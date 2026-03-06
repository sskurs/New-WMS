'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Location, Product } from '@/types';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { LayoutGrid, Server, Archive, Inbox, Sparkles, MapPin, X } from 'lucide-react';
import { GitBranchIcon } from '@/components/icons/GitBranchIcon';
import CardSkeleton from '@/components/skeletons/CardSkeleton';
import { suggestPutAwayLocation } from '@/services/geminiService';
import { useToast } from '@/contexts/ToastContext';
import Table from '@/components/ui/Table';

const locationTypeIcons: Record<Location['type'], React.ElementType> = {
    Warehouse: LayoutGrid,
    Zone: LayoutGrid,
    Aisle: GitBranchIcon,
    Rack: Server,
    Shelf: Archive,
    Bin: Inbox,
};

interface LocationBlockProps {
    location: Location;
    utilization: number;
    currentUnits: number;
    onClick: () => void;
    isSuggested: boolean;
}

const LocationBlock: React.FC<LocationBlockProps> = ({ location, utilization, currentUnits, onClick, isSuggested }) => {
    const Icon = locationTypeIcons[location.type] || MapPin;
    return (
        <button
            onClick={onClick}
            className={`relative p-3 rounded-lg border bg-background text-left transition-all hover:border-primary/50 ${isSuggested ? 'ring-2 ring-primary shadow-lg animate-pulse' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <p className="font-semibold text-foreground truncate">{location.code}</p>
                </div>
            </div>
            <div className="mt-2">
                <p className="text-[10px] text-muted-foreground truncate">{location.name}</p>
                <ProgressBar value={utilization} className="h-1 mt-1" />
                <p className="text-[9px] text-muted-foreground mt-1">{currentUnits} / {location.capacity}</p>
            </div>
        </button>
    );
};

const VisualLayoutPage = () => {
    const { locations, stocks, products, getCategoryById, loadLocations, loadStocks, loadProducts, dataState } = useAppContext();
    const { addToast } = useToast();

    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [suggestedLocationId, setSuggestedLocationId] = useState<string | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);

    useEffect(() => {
        loadLocations();
        loadStocks();
        loadProducts();
    }, [loadLocations, loadStocks, loadProducts]);

    const zonesData = useMemo(() => {
        if (!dataState.locations.loaded) return [];
        const zones: Record<string, { locations: { location: Location; utilization: number; currentUnits: number }[] }> = {};

        locations.forEach(loc => {
            if (['Warehouse', 'Zone'].includes(loc.type)) return;
            const zoneName = loc.zone || 'Uncategorized';
            if (!zones[zoneName]) zones[zoneName] = { locations: [] };
            
            const locStocks = stocks.filter(s => s.locationId === loc.id);
            const units = locStocks.reduce((sum, s) => sum + s.quantity, 0);
            const util = loc.capacity > 0 ? (units / loc.capacity) * 100 : 0;
            
            zones[zoneName].locations.push({ location: loc, utilization: util, currentUnits: units });
        });
        
        return Object.entries(zones).sort(([a], [b]) => a.localeCompare(b));
    }, [locations, stocks, dataState.locations.loaded]);

    // suggest logic...
    const handleSuggest = async () => {
        const p = products.find(prod => prod.id === selectedProductId);
        if (!p) return;
        setIsSuggesting(true);
        try {
            const code = await suggestPutAwayLocation(p.name, getCategoryById(p.categoryId)?.name || '', locations.filter(l => l.status === 'Available'));
            const loc = locations.find(l => l.code === code);
            if (loc) setSuggestedLocationId(loc.id);
        } finally { setIsSuggesting(false); }
    };

    if (!dataState.locations.loaded) return <CardSkeleton />;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader><h2 className="text-xl font-bold">Heat Map & AI Placement</h2></CardHeader>
                <CardContent className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Select id="p" label="Find Placement for Product" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                            <option value="">Select a product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </div>
                    <Button onClick={handleSuggest} loading={isSuggesting} disabled={!selectedProductId}>Find Best Spot</Button>
                </CardContent>
            </Card>

            {zonesData.map(([name, data]) => (
                <Card key={name}>
                    <CardHeader><h2 className="text-xl font-bold">{name}</h2></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            {data.locations.map(d => (
                                <LocationBlock
                                    key={d.location.id}
                                    location={d.location}
                                    utilization={d.utilization}
                                    currentUnits={d.currentUnits}
                                    onClick={() => setSelectedLocation(d.location)}
                                    isSuggested={d.location.id === suggestedLocationId}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Modal isOpen={!!selectedLocation} onClose={() => setSelectedLocation(null)} title="Location Info">
                {selectedLocation && (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-muted-foreground uppercase font-bold">Code</p><p>{selectedLocation.code}</p></div>
                            <div><p className="text-xs text-muted-foreground uppercase font-bold">Capacity</p><p>{selectedLocation.capacity}</p></div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default VisualLayoutPage;