
'use client';

import React from "react";
import { usePathname, useRouter } from 'next/navigation';
import ProtectedRoute from "@/components/ProtectedRoute";
import Button from "@/components/ui/Button";
import { MapPin as LocationIcon, List, LayoutGrid, GalleryVertical, Plus } from "lucide-react";

const locationTabs = [
  { name: 'Location List', href: '/locations', icon: List },
  { name: 'Zones', href: '/locations/zones', icon: LayoutGrid },
  { name: 'Visual Layout', href: '/locations/visual', icon: LayoutGrid },
  { name: 'Gallery View', href: '/locations/gallery', icon: GalleryVertical },
];

const LocationsLayoutContent: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();

    const isActionPage = pathname === '/locations/new' || /^\/locations\/[^/]+\/edit$/.test(pathname);

    const tabClasses = (href: string) => 
        `flex items-center gap-2 px-3 py-2 font-medium text-sm cursor-pointer border-b-2 transition-all duration-200 ease-in-out whitespace-nowrap
        ${pathname === href
            ? 'border-primary text-primary' 
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                  <LocationIcon className="w-8 h-8 text-emerald-500"/>
                  Location Management
                </h1>
                {!isActionPage && (
                    <Button onClick={() => router.push('/locations/new')}>
                        <Plus className="h-4 w-4 mr-2 -ml-1" />
                        Add Location
                    </Button>
                )}
            </div>
             {/* Tabs */}
             {!isActionPage && (
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto sidebar-scrollbar" aria-label="Tabs">
                        {locationTabs.map(tab => (
                            <button key={tab.name} type="button" onClick={() => router.push(tab.href)} className={tabClasses(tab.href)}>
                                <tab.icon className="h-4 w-4"/> {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
             )}
            <div className="pt-2 animate-fadeIn">
                {children}
            </div>
        </div>
    );
}

export default function LocationsLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute requiredPermission='manageLocations'>
            <LocationsLayoutContent>
                {children}
            </LocationsLayoutContent>
        </ProtectedRoute>
    );
}