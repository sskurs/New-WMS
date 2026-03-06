'use client';

import React, { useState, useEffect, PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Toaster from './Toaster';
import { AppProvider, useAppContext } from '@/contexts/AppContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { SpinnerIcon } from './icons/SpinnerIcon';
import UserGuide from './guides/UserGuide';

const GlobalLoadingScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center">
            <SpinnerIcon className="h-16 w-16 animate-spin text-emerald-500" />
            <div className="mt-6 flex flex-col items-center space-y-2">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">WMSPro™</p>
                <p className="text-sm font-medium text-emerald-500/80 animate-pulse">Initializing components...</p>
            </div>
        </div>
    </div>
);

const LayoutRenderer = ({ children }: PropsWithChildren) => {
    const { isAuthenticated, isLoading } = useAuth();
    const { activeGuide } = useAppContext();
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Whitelist routes that don't require authentication
    const publicRoutes = ['/login', '/forgot-password'];

    useEffect(() => {
        if (!isLoading) {
            const isPublicRoute = publicRoutes.includes(pathname);
            
            if (!isAuthenticated && !isPublicRoute) {
                router.replace('/login');
            } else if (isAuthenticated && pathname === '/login') {
                router.replace('/');
            }
        }
    }, [isAuthenticated, isLoading, pathname, router]);

    if (isLoading) {
        return <GlobalLoadingScreen />;
    }

    // Unauthenticated users only see the login page or public pages, otherwise show a loader during redirect
    if (!isAuthenticated) {
        const isPublicRoute = publicRoutes.includes(pathname);
        return <>{isPublicRoute ? children : <GlobalLoadingScreen />}</>;
    }
    
    // Authenticated users see the main app shell
    return (
        <div className="flex h-screen bg-background">
            <Sidebar 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="dark">
                    <Header setSidebarOpen={setSidebarOpen} />
                </div>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/70 sidebar-scrollbar">
                    {children}
                </main>
                <Footer />
            </div>
            {activeGuide && <UserGuide />}
        </div>
    );
};

const AppLayout = ({ children }: PropsWithChildren) => {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <LocaleProvider>
                        <AppProvider>
                            <LayoutRenderer>{children}</LayoutRenderer>
                            <Toaster />
                        </AppProvider>
                    </LocaleProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
};

export default AppLayout;