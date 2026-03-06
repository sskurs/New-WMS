
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useAppContext } from '../contexts/AppContext';
import { Menu, Bell, CalendarDays, User, Settings, Sun, Moon, Monitor, ChevronDown, LogOut, Package, ShoppingCart, DollarSign, HelpCircle, Clock, Key } from 'lucide-react';
import Dropdown, { DropdownItem } from './ui/Dropdown';
import { formatCurrency } from '@/api/utils';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user: currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLocale();
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  const { 
    dataState,
    kpis,
    startGuide
  } = useAppContext();

  const { totalProducts, activeOrders, inventoryValue } = kpis;

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      setCurrentDate(now.toLocaleDateString('en-US', dateOptions));

      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setCurrentTime(now.toLocaleTimeString('en-US', timeOptions));
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);
  
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (!mainContent) return;

    const handleScroll = () => {
        setIsScrolled(mainContent.scrollTop > 10);
    };
    
    // Check scroll position on mount in case the page is already scrolled
    handleScroll();

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
        mainContent.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!currentUser) {
    return null;
  }
  

  return (
    <header className="sticky top-0 bg-sidebar/90 border-b border-white/20 z-30 backdrop-blur-sm transition-all duration-300">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'h-12' : 'h-16'}`}>
          {/* Header: Left side */}
          <div className="flex items-center">
             {/* Hamburger button */}
            <button
              className="p-2 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground md:hidden mr-4"
              aria-controls="sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          {/* Header: Center section for stats */}
           <div className="hidden lg:flex items-center space-x-8">
               {(!dataState.products.loaded || !dataState.stocks.loaded || !dataState.orders.loaded) ? (
                  <>
                      <div className="h-9 w-32 bg-muted/10 rounded-md animate-pulse"></div>
                      <div className="h-9 w-32 bg-muted/10 rounded-md animate-pulse"></div>
                      <div className="h-9 w-32 bg-muted/10 rounded-md animate-pulse"></div>
                  </>
               ) : (
                  <>
                      <div className="flex items-center">
                          <Package className="h-7 w-7 text-primary" />
                          <div className="ml-3">
                          <p className="text-sm font-bold text-foreground">{totalProducts.toLocaleString()}</p>
                          <p className="text-xs text-foreground/70 -mt-1">Total Products</p>
                          </div>
                      </div>
                      <div className="flex items-center">
                          <ShoppingCart className="h-7 w-7 text-primary" />
                          <div className="ml-3">
                          <p className="text-sm font-bold text-foreground">{activeOrders.toLocaleString()}</p>
                          <p className="text-xs text-foreground/70 -mt-1">Active Orders</p>
                          </div>
                      </div>
                      <div className="flex items-center">
                          <DollarSign className="h-7 w-7 text-primary" />
                          <div className="ml-3">
                          <p className="text-sm font-bold text-foreground">{formatCurrency(inventoryValue)}</p>
                          <p className="text-xs text-foreground/70 -mt-1">Inventory Value</p>
                          </div>
                      </div>
                  </>
               )}
          </div>


          {/* Header: Right side */}
          <div className="flex items-center space-x-3">
            

             {/* Date & Time */}
            <div className="hidden md:flex items-center bg-white/10 px-3 py-1.5 rounded-md">
              <CalendarDays className="h-5 w-5 text-foreground/70" />
              <span className="ml-2 text-sm font-medium text-foreground/80">{currentDate}</span>
              <div className="h-4 w-px bg-foreground/20 mx-3" aria-hidden="true" />
              <Clock className="h-5 w-5 text-foreground/70" />
              <span className="ml-2 text-sm font-medium text-foreground/80 tabular-nums">{currentTime}</span>
            </div>

            <button className="p-2 rounded-full text-foreground/70 hover:bg-white/10 hover:text-foreground">
              <span className="sr-only">{t('header.notifications')}</span>
              <Bell className="h-6 w-6" />
            </button>
            
            <Dropdown
                align="right"
                trigger={
                  <button className="p-2 rounded-full text-foreground/70 hover:bg-white/10 hover:text-foreground">
                    <span className="sr-only">Help</span>
                    <HelpCircle className="h-6 w-6" />
                  </button>
                }
            >
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Interactive Tours</div>
                <DropdownItem onClick={() => startGuide('supplier')}>
                    <span>Supplier Workflow Tour</span>
                </DropdownItem>
                 <DropdownItem onClick={() => startGuide('customerOrder')}>
                    <span>Customer Order Tour</span>
                </DropdownItem>
            </Dropdown>

            <Dropdown
                align="right"
                trigger={
                  <button className="p-2 rounded-full text-foreground/70 hover:bg-white/10 hover:text-foreground">
                    <span className="sr-only">{t('header.settings')}</span>
                    <Settings className="h-6 w-6" />
                  </button>
                }
            >
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{t('header.theme')}</div>
                <DropdownItem onClick={() => setTheme('light')} className={`flex items-center justify-between ${theme === 'light' ? 'text-primary' : ''}`}>
                    <span>{t('header.light')}</span> <Sun className="h-4 w-4" />
                </DropdownItem>
                <DropdownItem onClick={() => setTheme('dark')} className={`flex items-center justify-between ${theme === 'dark' ? 'text-primary' : ''}`}>
                    <span>{t('header.dark')}</span> <Moon className="h-4 w-4" />
                </DropdownItem>
                <DropdownItem onClick={() => setTheme('system')} className={`flex items-center justify-between ${theme === 'system' ? 'text-primary' : ''}`}>
                    <span>{t('header.system')}</span> <Monitor className="h-4 w-4" />
                </DropdownItem>
                 <div className="border-t border-border my-1"></div>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{t('header.language')}</div>
                 <DropdownItem onClick={() => setLanguage('en')} className={`flex items-center justify-between ${language === 'en' ? 'text-primary' : ''}`}>
                    <span>{t('header.english')}</span>
                </DropdownItem>
                 <DropdownItem onClick={() => setLanguage('es')} className={`flex items-center justify-between ${language === 'es' ? 'text-primary' : ''}`}>
                    <span>{t('header.spanish')}</span>
                </DropdownItem>
                 <DropdownItem onClick={() => setLanguage('hi')} className={`flex items-center justify-between ${language === 'hi' ? 'text-primary' : ''}`}>
                    <span>{t('header.hindi')}</span>
                </DropdownItem>
            </Dropdown>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-foreground/20" aria-hidden="true" />

            {/* User menu */}
             <Dropdown
                align="right"
                width="w-64"
                trigger={
                   <button
                    className="p-2 rounded-full text-foreground/70 hover:bg-white/10 hover:text-foreground"
                  >
                    <span className="sr-only">{currentUser.name}</span>
                    <User className="h-6 w-6" />
                  </button>
                }
              >
                  <div className="pt-1.5 pb-2 px-3 border-b border-border">
                    <div className="font-semibold text-foreground">{currentUser.name}</div>
                    <div className="text-xs text-muted-foreground italic">{currentUser.role}</div>
                  </div>
                  <DropdownItem onClick={() => router.push('/change-password')}>
                      <div className="flex items-center">
                          <Key className="h-4 w-4 mr-2" />
                          <span>Change Password</span>
                      </div>
                  </DropdownItem>
                  <DropdownItem onClick={logout}>
                    <div className="flex items-center text-destructive hover:text-destructive/90">
                        <LogOut className="h-4 w-4 mr-2" />
                        <span>{t('header.signOut')}</span>
                    </div>
                  </DropdownItem>
              </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
