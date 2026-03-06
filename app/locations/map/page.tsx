'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { MapPin } from 'lucide-react';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import Select from '@/components/ui/Select';

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAQY_WihN95g7mzZ9rrasc3THeM4zaKeAI";

const loadGoogleMapsScript = (callback: () => void) => {
    if (window.google && window.google.maps) {
        callback();
        return;
    }
    const existingScript = document.getElementById('googleMapsScript');
    if (!existingScript) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
        script.id = 'googleMapsScript';
        document.body.appendChild(script);
        script.onload = () => {
            callback();
        };
    } else {
        // If script is already there but not loaded, wait for it
        existingScript.addEventListener('load', callback);
    }
};

const MapViewPage: React.FC = () => {
    const { locations, loadLocations, dataState } = useAppContext();
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState<string | 'all'>('all');
    
    const markersRef = useRef<Record<string, any>>({});
    const infoWindowRef = useRef<any | null>(null);

    useEffect(() => {
        loadLocations();
        loadGoogleMapsScript(() => {
            setScriptLoaded(true);
        });
    }, [loadLocations]);

    const locationsWithCoords = useMemo(() => {
        if (!Array.isArray(locations)) return [];
        return locations.filter(loc => typeof loc.latitude === 'number' && typeof loc.longitude === 'number');
    }, [locations]);
    
    // Initialize map
    useEffect(() => {
        if (scriptLoaded && mapRef.current && !map) {
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: { lat: 20.5937, lng: 78.9629 }, // Default to India
                zoom: 5,
            });
            setMap(newMap);
            infoWindowRef.current = new window.google.maps.InfoWindow();
        }
    }, [scriptLoaded, mapRef, map]);
    
    // Create/update markers when locations change
    useEffect(() => {
        if (map && locationsWithCoords.length > 0) {
            // Clear old markers
            Object.values(markersRef.current).forEach((marker: any) => marker.setMap(null));
            markersRef.current = {};

            // Create new markers
            locationsWithCoords.forEach((location) => {
                const position = { lat: location.latitude!, lng: location.longitude! };
                
                const marker = new window.google.maps.Marker({
                    position,
                    map,
                    title: location.name,
                });
                
                marker.addListener('click', () => {
                     const contentString = `
                        <div style="font-family: sans-serif; color: #333;">
                            <h3 style="font-weight: bold; margin: 0 0 5px;">${location.name}</h3>
                            <p style="margin: 0;"><strong>Code:</strong> ${location.code}</p>
                            <p style="margin: 0;"><strong>Type:</strong> ${location.type}</p>
                        </div>
                    `;
                    infoWindowRef.current.setContent(contentString);
                    infoWindowRef.current.open(map, marker);
                });

                markersRef.current[location.id] = marker;
            });
        }
    }, [map, locationsWithCoords]);

    // Handle zoom/pan when selection changes
    useEffect(() => {
        if (!map) return;

        if (selectedLocationId === 'all') {
            if (locationsWithCoords.length > 0) {
                const bounds = new window.google.maps.LatLngBounds();
                locationsWithCoords.forEach(loc => bounds.extend({ lat: loc.latitude!, lng: loc.longitude! }));
                if (locationsWithCoords.length > 1) {
                    map.fitBounds(bounds);
                } else {
                    map.setCenter(bounds.getCenter());
                    map.setZoom(12);
                }
            }
        } else {
            const location = locationsWithCoords.find(l => l.id === selectedLocationId);
            if (location) {
                map.panTo({ lat: location.latitude!, lng: location.longitude! });
                map.setZoom(15);
            }
        }
    }, [map, selectedLocationId, locationsWithCoords]);

    const renderContent = () => {
        if (!dataState.locations.loaded || !scriptLoaded) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <SpinnerIcon className="w-8 h-8 animate-spin mb-4" />
                    <p>Loading Map & Locations...</p>
                </div>
            );
        }
        
        if (locationsWithCoords.length === 0) {
            return (
                 <EmptyState
                    icon={MapPin}
                    title="No Locations with Coordinates"
                    message="Add latitude and longitude to your locations to see them on the map."
                />
            );
        }

        return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
    };

    return (
        <Card>
             <CardHeader>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-medium text-foreground">Locations Map View</h2>
                        <p className="text-sm text-muted-foreground">Visualize your warehouse network.</p>
                    </div>
                    {locationsWithCoords.length > 0 && (
                        <div className="w-full sm:w-auto sm:max-w-xs">
                             <Select 
                                id="location-select" 
                                value={selectedLocationId} 
                                onChange={e => setSelectedLocationId(e.target.value)}
                                aria-label="Zoom to location"
                                label="Zoom to Location"
                            >
                                <option value="all">Show All Locations</option>
                                {locationsWithCoords.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0" style={{ height: '65vh' }}>
                {renderContent()}
            </CardContent>
        </Card>
    );
};
export default MapViewPage;
