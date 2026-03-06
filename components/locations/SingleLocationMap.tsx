'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Location } from '@/types';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';

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
        script.onload = () => callback();
    } else {
        existingScript.addEventListener('load', callback);
    }
};

interface SingleLocationMapProps {
    location: Location;
}

const SingleLocationMap: React.FC<SingleLocationMapProps> = ({ location }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        loadGoogleMapsScript(() => {
            setScriptLoaded(true);
        });
    }, []);
    
    useEffect(() => {
        if (scriptLoaded && mapRef.current && !map && location.latitude && location.longitude) {
            const position = { lat: location.latitude, lng: location.longitude };
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: position,
                zoom: 15,
                disableDefaultUI: true,
                zoomControl: true,
            });
            
            new window.google.maps.Marker({
                position,
                map: newMap,
                title: location.name,
            });
            
            setMap(newMap);
        }
    }, [scriptLoaded, mapRef, map, location]);

    if (!location.latitude || !location.longitude) {
        return <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">No coordinate data available.</div>;
    }

    if (!scriptLoaded) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                <SpinnerIcon className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

export default SingleLocationMap;