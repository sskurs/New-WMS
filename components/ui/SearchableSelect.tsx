'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Loader2 } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
}

interface SearchableSelectProps {
    id: string;
    label?: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    required?: boolean;
    'data-testid'?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    id,
    label,
    options = [],
    value,
    onChange,
    placeholder = "Search...",
    error,
    disabled = false,
    loading = false,
    className = "",
    required = false,
    'data-testid': dataTestId
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => 
        (options || []).find(opt => opt.value === value), 
    [options, value]);

    const filteredOptions = useMemo(() => {
        const safeOptions = options || [];
        if (!searchTerm) return safeOptions;
        const lowerTerm = searchTerm.toLowerCase();
        return safeOptions.filter(opt => 
            (opt.label || "").toLowerCase().includes(lowerTerm) || 
            (opt.description && opt.description.toLowerCase().includes(lowerTerm))
        );
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            // Slight delay to ensure focus works correctly
            const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !loading) {
            setIsOpen(!isOpen);
            setSearchTerm("");
        }
    };

    const handleSelect = (e: React.MouseEvent, optionValue: string) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    const displayLabel = useMemo(() => {
        if (loading) return "Loading...";
        if (selectedOption) return selectedOption.label;
        return placeholder;
    }, [loading, selectedOption, placeholder]);

    return (
        <div className={`w-full relative ${className}`} ref={containerRef}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1.5">
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </label>
            )}
            
            <button
                type="button"
                id={id}
                data-testid={dataTestId || id}
                onClick={handleToggle}
                disabled={disabled || loading}
                className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    error ? 'border-destructive' : 'border-input'
                } ${!selectedOption ? 'text-muted-foreground' : 'text-foreground'}`}
            >
                <span className="truncate pr-2">{displayLabel}</span>
                {loading ? (
                    <Loader2 className="h-4 w-4 shrink-0 opacity-50 animate-spin" />
                ) : (
                    <ChevronDown className={`h-4 w-4 shrink-0 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 z-[100] mt-1 min-w-[280px] rounded-md border bg-popover text-popover-foreground shadow-xl animate-in fade-in zoom-in duration-150 origin-top">
                    <div className="p-2 border-b sticky top-0 bg-popover z-10">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="h-9 w-full bg-transparent pl-8 pr-8 py-2 text-sm outline-none placeholder:text-muted-foreground border-none focus:ring-0"
                                placeholder="Filter results..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchTerm && (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSearchTerm(""); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto p-1 sidebar-scrollbar min-h-[100px]">
                        {filteredOptions.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                {searchTerm ? "No matches found" : "No items available"}
                            </div>
                        ) : (
                            <>
                                {filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={(e) => handleSelect(e, option.value)}
                                        className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-9 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
                                            value === option.value ? 'bg-accent/70 font-semibold' : ''
                                        }`}
                                    >
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="truncate w-full text-left font-medium">{option.label}</span>
                                            {option.description && (
                                                <span className="truncate w-full text-[11px] text-muted-foreground text-left mt-0.5">{option.description}</span>
                                            )}
                                        </div>
                                        {value === option.value && (
                                            <span className="absolute right-3 flex h-3.5 w-3.5 items-center justify-center">
                                                <Check className="h-4 w-4 text-primary" />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {error && <p className="mt-1 text-[11px] text-destructive font-medium">{error}</p>}
        </div>
    );
};

export default SearchableSelect;