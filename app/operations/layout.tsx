'use client';

import React from "react";
import { usePathname, useRouter } from 'next/navigation';
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClipboardList, ArchiveRestore, PackageSearch, Truck, RefreshCw, LayoutGrid, CheckCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const inboundTabs = [
  { name: 'Put-Away', href: '/operations/put-away', icon: ArchiveRestore },
  { name: 'Confirmation', href: '/operations/put-away-confirmation', icon: CheckCircle },
];

const outboundTabs = [
  { name: 'Picking', href: '/operations/picking', icon: PackageSearch },
  { name: 'Packing & Shipping', href: '/operations/packing-shipping', icon: Truck },
];

const generalTabs = [
    { name: 'Dashboard', href: '/operations', icon: LayoutGrid },
    { name: 'Cycle Counting', href: '/operations/cycle-counting', icon: RefreshCw },
];

const OperationsLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();

    const isInternal = pathname === '/operations/cycle-counting';
    const isInbound = inboundTabs.some(t => t.href === pathname);
    const isOutbound = outboundTabs.some(t => t.href === pathname);

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
                  {isInbound ? <ArrowDownLeft className="w-8 h-8 text-sky-500" /> : isOutbound ? <ArrowUpRight className="w-8 h-8 text-rose-500" /> : <ClipboardList className="w-8 h-8 text-amber-500"/>}
                  {isInbound ? 'Inbound Operations' : isOutbound ? 'Outbound Operations' : 'Warehouse Operations'}
                </h1>
            </div>
             {/* Dynamic Tab Navigation based on section context */}
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto sidebar-scrollbar" aria-label="Tabs">
                    <button key="overview" type="button" onClick={() => router.push('/operations')} className={tabClasses('/operations')}>
                        <LayoutGrid className="h-4 w-4"/> Overview
                    </button>
                    
                    <div className="h-8 w-px bg-border self-center mx-2" />

                    {inboundTabs.map(tab => (
                        <button key={tab.name} type="button" onClick={() => router.push(tab.href)} className={tabClasses(tab.href)}>
                            <tab.icon className="h-4 w-4"/> {tab.name}
                        </button>
                    ))}

                    <div className="h-8 w-px bg-border self-center mx-2" />

                    {outboundTabs.map(tab => (
                        <button key={tab.name} type="button" onClick={() => router.push(tab.href)} className={tabClasses(tab.href)}>
                            <tab.icon className="h-4 w-4"/> {tab.name}
                        </button>
                    ))}

                    <div className="h-8 w-px bg-border self-center mx-2" />

                    <button key="counting" type="button" onClick={() => router.push('/operations/cycle-counting')} className={tabClasses('/operations/cycle-counting')}>
                        <RefreshCw className="h-4 w-4"/> Cycle Counting
                    </button>
                </nav>
            </div>
            <div className="pt-2 animate-fadeIn">
                {children}
            </div>
        </div>
    );
}


export default function OperationsLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute requiredPermission='manageOperations'>
            <OperationsLayoutContent>
                {children}
            </OperationsLayoutContent>
        </ProtectedRoute>
    );
}