'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../contexts/AppContext';
import { Permission } from '../types';
import { useLocale } from '../contexts/LocaleContext'; // Import
import {
    Home, Package, ClipboardList, MapPin, ShoppingCart, Building2, PieChart,
    Users, Settings, ChevronDown, X, Database, Shield, Languages, ChevronLeft, ChevronRight,
    ArrowDownLeft, ArrowUpRight, RefreshCw
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

// Explicitly define types for clarity and type safety
interface SidebarChildLink {
    nameKey: string;
    href?: string;
    permission: Permission;
    children?: SidebarChildLink[];
    isHeader?: boolean;
    isIndented?: boolean;
}

type NavLinkItem = {
    nameKey: string;
    href: string;
    icon: React.ElementType;
    permission: Permission;
    colorClass: string;
    children?: SidebarChildLink[];
};

// Define navLinks with translation keys
const navLinks: NavLinkItem[] = [
    { nameKey: 'sidebar.dashboard', href: '/', icon: Home, permission: 'viewDashboard', colorClass: 'text-sky-500' },
    { 
        nameKey: 'sidebar.inventory', href: '/inventory', icon: Package, permission: 'manageInventory', colorClass: 'text-violet-500',
        children: [
            { nameKey: 'sidebar.productCatalog', href: '/inventory/catalog', permission: 'manageProducts' },
            { nameKey: 'sidebar.stockLevels', href: '/inventory/stock-levels', permission: 'viewStockLevels' },
            { nameKey: 'sidebar.stockAdjustments', href: '/inventory/adjustments', permission: 'manageAdjustments' },
            { nameKey: 'sidebar.lowStockAlerts', href: '/inventory/alerts', permission: 'viewAlerts' },
            { nameKey: 'sidebar.cycleCounting', href: '/operations/cycle-counting', permission: 'manageCycleCounts' },
        ]
    },
    { 
        nameKey: 'sidebar.inbound', href: '/operations/inbound', icon: ArrowDownLeft, permission: 'manageOperations', colorClass: 'text-sky-500',
        children: [
            { nameKey: 'sidebar.putAway', href: '/operations/put-away', permission: 'managePutAway' },
            { nameKey: 'sidebar.putAwayConfirmation', href: '/operations/put-away-confirmation', permission: 'managePutAway' },
        ]
    },
    { 
        nameKey: 'sidebar.outbound', href: '/operations/outbound', icon: ArrowUpRight, permission: 'manageOperations', colorClass: 'text-rose-500',
        children: [
            { nameKey: 'sidebar.picking', href: '/operations/picking', permission: 'managePicking' },
            { nameKey: 'sidebar.packingShipping', href: '/operations/packing-shipping', permission: 'managePackingShipping' },
        ]
    },
    { nameKey: 'sidebar.locations', href: '/locations', icon: MapPin, permission: 'manageLocations', colorClass: 'text-emerald-500' },
    { 
        nameKey: 'sidebar.orders', href: '/orders', icon: ShoppingCart, permission: 'manageOrders', colorClass: 'text-rose-500',
        children: [
            { nameKey: 'sidebar.orderProcessing', href: '/orders/processing', permission: 'manageOrders' },
            { nameKey: 'sidebar.workflowBoard', href: '/orders/workflow', permission: 'manageOrders' },
            { nameKey: 'sidebar.statusTracking', href: '/orders/tracking', permission: 'manageOrders' },
            { nameKey: 'sidebar.returnsRMA', href: '/orders/returns', permission: 'manageReturns' },
            { nameKey: 'sidebar.historyAnalytics', href: '/orders/analytics', permission: 'viewAnalytics' },
        ]
    },
    { 
        nameKey: 'sidebar.supplierOrder', href: '/suppliers', icon: Building2, permission: 'manageSuppliers', colorClass: 'text-blue-500',
        children: [
            { nameKey: 'sidebar.suppliers', href: '/suppliers/database', permission: 'manageSuppliers' },
            { nameKey: 'sidebar.purchaseOrders', href: '/suppliers/purchase-orders', permission: 'managePurchaseOrders' },
            { nameKey: 'sidebar.receiving', href: '/suppliers/receiving', permission: 'manageReceiving' },
            { nameKey: 'sidebar.vendorReturns', href: '/suppliers/returns', permission: 'manageSuppliers' },
        ]
    },
    { 
        nameKey: 'sidebar.reporting', href: '/reports', icon: PieChart, permission: 'viewReports', colorClass: 'text-fuchsia-500',
        children: [
            { nameKey: 'sidebar.reportsDashboard', href: '/reports/dashboard', permission: 'viewReports' },
            { nameKey: 'sidebar.stockMovement', href: '/reports/stock-movement', permission: 'viewReports' },
            { nameKey: 'sidebar.inventoryValuation', href: '/reports/valuation', permission: 'viewReports' },
            { nameKey: 'sidebar.inventoryValidation', href: '/reports/inventory-validation', permission: 'viewReports' },
            { nameKey: 'sidebar.discrepancyReport', href: '/reports/discrepancies', permission: 'viewReports' },
            { nameKey: 'sidebar.forecasting', href: '/reports/forecasting', permission: 'generateForecasts' },
        ]
    },
    { 
        nameKey: 'sidebar.usersAndRole', href: '/users', icon: Users, permission: 'manageUsers', colorClass: 'text-slate-500',
        children: [
            { nameKey: 'sidebar.users', href: '/users', permission: 'manageUsers' },
            { nameKey: 'sidebar.roles', href: '/users/roles', permission: 'manageUsers' },
            { nameKey: 'sidebar.permissions', href: '/users/permissions', permission: 'manageUsers' },
        ]
    },
    { 
        nameKey: 'sidebar.configure', href: '/configure', icon: Settings, permission: 'manageConfiguration', colorClass: 'text-slate-500',
        children: [
            {
                nameKey: 'sidebar.masterData',
                href: '/configure/master-data',
                permission: 'manageConfiguration',
                children: [
                    { nameKey: 'sidebar.overview', href: '/configure/master-data', permission: 'manageConfiguration' },
                    { nameKey: 'sidebar.categories', href: '/configure/master-data/categories', permission: 'manageConfiguration' },
                    { nameKey: 'sidebar.unitsOfMeasure', href: '/configure/uom', permission: 'manageUOM' },
                    { nameKey: 'sidebar.pricingRules', href: '/configure/pricing', permission: 'managePricing' },
                    { nameKey: 'sidebar.pricingDebugger', href: '/configure/pricing/debugger', permission: 'managePricing' },
                    { nameKey: 'sidebar.localization', href: '/configure/localization', permission: 'manageLocalization' },
                ]
            },
            { nameKey: 'sidebar.warehouse', href: '/configure/warehouse', permission: 'manageWarehouseConfiguration' },
        ]
    },
];

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen, isSidebarCollapsed, setIsSidebarCollapsed }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission } = useAppContext();
  const { t } = useLocale(); // Get translation function
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);
  
  const [openSection, setOpenSection] = useState('');
  const [openSubSection, setOpenSubSection] = useState('');

  useEffect(() => {
    const activeParent = navLinks.find(
      (link) => link.children && (pathname.startsWith(link.href) || link.children.some(c => c.href && pathname.startsWith(c.href)))
    );
    setOpenSection(activeParent?.nameKey || '');

    if (activeParent) {
        const activeSubParent = activeParent.children?.find(
            (child) => child.children && child.href && pathname.startsWith(child.href)
        );
        setOpenSubSection(activeSubParent?.nameKey || '');
    }
  }, [pathname]);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node) || trigger.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };

    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };

    document.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);

    return () => {
      document.removeEventListener('click', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden md:z-auto transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 md:static md:left-auto md:top-auto md:translate-x-0 h-screen shrink-0 bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-64'
        } ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className={`flex items-center h-16 shrink-0 px-4 bg-sidebar-header transition-all duration-300 ${isSidebarCollapsed ? 'md:justify-center' : 'md:justify-between'}`}>
            <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center space-x-3">
                <img src="/logo.png" alt="Propix Technologies Pvt. Ltd." className="h-8 w-auto flex-shrink-0" />
                <div className={`overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'md:w-0 md:opacity-0' : 'md:w-auto md:opacity-100'}`}>
                  <span className="text-sidebar-header-foreground text-lg font-bold whitespace-nowrap">
                    WMSPro™
                  </span>
                  <p className="text-xs text-sidebar-header-foreground/70 whitespace-nowrap -mt-1">
                    Propix Technologies Pvt. Ltd.
                  </p>
                </div>
            </Link>

            {/* Desktop Toggle Button - Enhanced and Moved to Top */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`hidden md:flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 text-sidebar-header-foreground/60 hover:bg-white/10 hover:text-white transition-all duration-200 border border-white/10 shadow-sm ${isSidebarCollapsed ? 'fixed left-14 top-4 z-50' : 'relative ml-2'}`}
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
                ref={trigger}
                className="md:hidden text-sidebar-header-foreground/80 hover:text-sidebar-header-foreground"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
            >
                <span className="sr-only">Close sidebar</span>
                <X className="w-6 h-6" />
            </button>
        </div>
        
        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto sidebar-scrollbar p-2">
              <nav className="space-y-1">
                {navLinks.map(link => {
                  const isActive = (link.href === '/' && pathname === link.href) || (link.href !== '/' && (pathname.startsWith(link.href) || link.children?.some(c => c.href && pathname.startsWith(c.href))));
                  const isSectionOpen = !isSidebarCollapsed && openSection === link.nameKey;
                  
                  return hasPermission(link.permission) ? (
                    <div key={link.nameKey}>
                        <a
                            href={link.href}
                            title={t(link.nameKey)}
                            onClick={(e) => {
                                e.preventDefault();
                                if (link.children && !isSidebarCollapsed) {
                                    setOpenSection(prev => prev === link.nameKey ? '' : link.nameKey);
                                } else {
                                    router.push(link.href);
                                    setSidebarOpen(false);
                                }
                            }}
                            className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                                isActive ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
                            } ${isSidebarCollapsed ? 'md:justify-center' : ''}`}
                        >
                            <div className="flex items-center">
                                <link.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'} ${isSidebarCollapsed ? '' : 'mr-3'}`}/>
                                <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{t(link.nameKey)}</span>
                            </div>
                            {link.children && !isSidebarCollapsed && (
                                <div className={`shrink-0 ml-2 transform transition-transform duration-200 ${isSectionOpen ? 'rotate-0' : '-rotate-90'}`}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            )}
                        </a>

                        {link.children && !isSidebarCollapsed && (
                           <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSectionOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                              <div className="pl-5 pt-1">
                                <div className="space-y-0.5 border-l-2 border-white/10">
                                    {link.children.map((child: SidebarChildLink) => {
                                        if (!hasPermission(child.permission)) return null;

                                        if (child.children) {
                                            const isSubSectionOpen = openSubSection === child.nameKey;
                                            const isSubActive = child.href && pathname.startsWith(child.href) && !child.children.some(c => c.href === pathname && c.href !== child.href);
                                            return (
                                                <div key={child.nameKey}>
                                                    <a
                                                        href={child.href}
                                                        onClick={(e) => { e.preventDefault(); setOpenSubSection(prev => prev === child.nameKey ? '' : child.nameKey); }}
                                                        className={`group relative flex items-center justify-between ml-px pr-3 py-1.5 text-sm rounded-r-md transition-colors duration-150 pl-5 ${ isSubActive ? 'text-white font-semibold' : 'text-sidebar-foreground/70 hover:text-white' }`}
                                                    >
                                                        {isSubActive && <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"></span>}
                                                        <span className="whitespace-nowrap">{t(child.nameKey)}</span>
                                                        <div className={`shrink-0 ml-2 transform transition-transform duration-200 ${isSubSectionOpen ? 'rotate-0' : '-rotate-90'}`}>
                                                            <ChevronDown className="w-4 h-4" />
                                                        </div>
                                                    </a>
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSubSectionOpen ? 'max-h-96' : 'max-h-0'}`}>
                                                        <div className="pt-1">
                                                            <div className="space-y-0.5 border-l-2 border-white/10 ml-5">
                                                                {child.children.map((subChild: SidebarChildLink) => {
                                                                    if (!hasPermission(subChild.permission) || !subChild.href) return null;
                                                                    return (
                                                                        <Link key={subChild.nameKey} href={subChild.href}
                                                                            className={`relative block ml-px pr-3 py-1.5 text-sm rounded-r-md transition-colors duration-150 pl-5 ${pathname === subChild.href ? 'text-white font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                                                                            onClick={() => setSidebarOpen(false)}>
                                                                            {pathname === subChild.href && <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"></span>}
                                                                            {t(subChild.nameKey)}
                                                                        </Link>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        if (child.isHeader) {
                                            return (
                                                <div key={child.nameKey} className="ml-px pl-5 pr-3 pt-4 pb-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                                                    {t(child.nameKey)}
                                                </div>
                                            );
                                        }

                                        return child.href ? (
                                            <Link
                                                key={child.nameKey}
                                                href={child.href}
                                                className={`relative block ml-px pr-3 py-1.5 text-sm rounded-r-md transition-colors duration-150 ${child.isIndented ? 'pl-9' : 'pl-5'} ${pathname === child.href ? 'text-white font-semibold' : 'text-sidebar-foreground/70 hover:text-white'}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                {pathname === child.href && (
                                                    <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"></span>
                                                )}
                                                {t(child.nameKey)}
                                            </Link>
                                        ) : null;
                                    })}
                                </div>
                              </div>
                           </div>
                        )}
                    </div>
                  ) : null;
                })}
              </nav>
            </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;