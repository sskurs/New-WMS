'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import ProductCard from '@/components/inventory/ProductCard';
import Input from '@/components/ui/Input';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { 
    Package, 
    Plus, 
    Search, 
    Filter, 
    QrCode, 
    Edit, 
    MoreHorizontal, 
    Trash2, 
    List, 
    Grid,
    ChevronDown,
    X,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    Archive,
    DollarSign,
    Tag
} from 'lucide-react';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import { formatCurrency } from '@/api/utils';
import { Product } from '@/types';
import { getProductByIdAPI } from '@/api/inventoryApi';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjQwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz4KICA8cGF0aCBkPSJNMjAwIDIwSDQwQzI5IDIwIDIwIDI5IDIwIDQwVjE2MEMyMCAxNzEgMjkgMTgwIDQwIDE4MEgyMDBDMjExIDE4MCAyMjAgMTcxIDIyMCAxNjBWNDBDMjIwIDI5IDIxMSAyMCAyMDAgMjBaTTEwMCA4MEMxMDAgNjkgOTEgNjAgODAgNjBDNjkgNjAgNjAgNjkgNjAgODBDNjAgOTEgNjkgMTAwIDgwIDEwMEM5MSAxMDAgMTAwIDkxIDEwMCA4MFpNMTgwIDE2MEg2MEw5MCAxMjBMMTIwIDE1MEwxNTAgMTAwTDIwMCAxNjBIMTgwWiIgZmlsbD0iI0NCRDVFMSIvPgo8L3N2Zz4=';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);

const ProductCatalog: React.FC = () => {
    const { 
        products, getCategoryById, deleteProduct, getStockForProduct, getLocationById, purchaseOrders, categories, dataState, loadProducts, getSupplierById, loadSuppliers,
        stocks, loadStocks, loadCategories, loadLocations, loadZones
    } = useAppContext();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
    const [deletingProduct, setDeletingProduct] = useState<{ id: string; name: string } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [viewingQrCode, setViewingQrCode] = useState<Product | null>(null);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

    useEffect(() => {
        const loadPageData = async () => {
            setLoadError(null);
            try {
                await Promise.all([
                    loadProducts(true),
                    loadSuppliers(true),
                    loadStocks(true),
                    loadCategories(true),
                    loadLocations(true),
                    loadZones(true)
                ]);
            } catch (error) {
                setLoadError((error as Error).message || 'An unknown error occurred while loading data.');
            }
        };
        loadPageData();
    }, [loadProducts, loadSuppliers, loadStocks, loadCategories, loadLocations, loadZones]);

    const handleRetry = async () => {
        setLoadError(null); 
        try {
            await Promise.all([loadProducts(true), loadSuppliers(true), loadStocks(true), loadCategories(true), loadLocations(true), loadZones(true)]);
        } catch (error) {
            setLoadError((error as Error).message || 'An unknown error occurred while loading data.');
        }
    };

    const stockStatusOptions: ('In Stock' | 'Low Stock' | 'Out of Stock')[] = ['In Stock', 'Low Stock', 'Out of Stock'];

    const isDataLoading = (
        (!dataState.products.loaded && dataState.products.loading && !loadError) || 
        (!dataState.suppliers.loaded && dataState.suppliers.loading) ||
        (!dataState.stocks.loaded && dataState.stocks.loading) ||
        (!dataState.categories.loaded && dataState.categories.loading) ||
        (!dataState.locations.loaded && dataState.locations.loading)
    );

    const kpis = useMemo(() => {
        if (!dataState.products.loaded || !dataState.stocks.loaded) {
            return { totalSkus: 0, totalUnits: 0, inventoryValue: 0, lowStockItems: 0 };
        }

        const totalUnits = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

        const inventoryValue = stocks.reduce((sum, stock) => {
            const product = products.find(p => p.id === stock.productId);
            return sum + (product ? product.price * stock.quantity : 0);
        }, 0);

        const lowStockItems = products.filter(p => {
            const totalStock = getStockForProduct(p.id).reduce((sum, s) => sum + s.quantity, 0);
            return totalStock > 0 && totalStock <= p.reorderPoint;
        }).length;

        return {
            totalSkus: products.length,
            totalUnits,
            inventoryValue,
            lowStockItems,
        };
    }, [products, stocks, dataState.products.loaded, dataState.stocks.loaded, getStockForProduct]);

    const handleDelete = (productId: string, productName: string) => {
        setDeletingProduct({ id: productId, name: productName });
    };
    
    const confirmDelete = () => {
        if (deletingProduct) {
            deleteProduct(deletingProduct.id);
            setDeletingProduct(null);
        }
    };

    const handleGenerateQrCode = (product: Product) => {
        setViewingQrCode(product);
    };

    const handleQuickView = async (product: Product) => {
        setViewingProduct(product);
        try {
            const [fullProductDetails] = await Promise.all([
                getProductByIdAPI(product.id),
                loadStocks(true) 
            ]);

            if (fullProductDetails) {
                setViewingProduct(fullProductDetails);
            }
        } catch (error) {
            console.error("Failed to refresh product details or stocks for quick view", error);
        }
    };
    
    const handleSortRequest = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(c => c !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleStockStatusToggle = (status: string) => {
        setSelectedStockStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedStockStatuses([]);
    };

    const categoryColors = [
        'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400 border-sky-500',
        'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-400 border-violet-500',
        'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-400 border-pink-500',
        'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 border-fuchsia-500',
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500',
    ];

    const getCategoryStyles = (categoryId: string) => {
        if(!categoryId) return categoryColors[0];
        let hash = 0;
        for (let i = 0; i < categoryId.length; i++) {
            hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        const index = Math.abs(hash % categoryColors.length);
        return categoryColors[index];
    };

    const processedProducts = useMemo(() => {
        const categoryNameToIdMap = new Map((categories || []).map(c => [c.name, c.id]));
    
        let detailedProducts = products.map(product => {
            const stocks = getStockForProduct(product.id);
            const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
            let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
            if (totalStock <= 0) {
                status = 'Out of Stock';
            } else if (totalStock <= product.reorderPoint) {
                status = 'Low Stock';
            }
            const categoryName = getCategoryById(product.categoryId)?.name || product.categoryId || 'Uncategorized';
            const locations = stocks
                .filter(s => s.locationId)
                .map(s => getLocationById(s.locationId)?.name)
                .filter(Boolean)
                .join(', ');

            return { ...product, totalStock, status, categoryName, locations };
        });

        let filtered = detailedProducts.filter(product => {
            const categoryMatch = selectedCategories.length === 0 || 
                selectedCategories.includes(product.categoryId) || 
                selectedCategories.includes(categoryNameToIdMap.get(product.categoryId)!);
            
            const supplier = product.supplierId ? getSupplierById(product.supplierId) : null;
            const searchTermLower = (searchTerm || '').toLowerCase();

            const name = product?.name || '';
            const sku = product?.sku || '';
            const desc = product?.description || '';
            const supName = supplier?.name || '';

            const searchMatch = (
                name.toLowerCase().includes(searchTermLower) ||
                sku.toLowerCase().includes(searchTermLower) ||
                desc.toLowerCase().includes(searchTermLower) ||
                supName.toLowerCase().includes(searchTermLower)
            );
            
            const stockStatusMatch = selectedStockStatuses.length === 0 || selectedStockStatuses.includes(product.status);
            return searchMatch && categoryMatch && stockStatusMatch;
        });
        
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                const aValue = a[key];
                const bValue = b[key];

                if (aValue == null || bValue == null) {
                    if (aValue === bValue) return 0;
                    if (sortConfig.direction === 'ascending') {
                        return aValue == null ? 1 : -1;
                    } else {
                        return aValue == null ? -1 : 1;
                    }
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [products, getStockForProduct, getCategoryById, getLocationById, categories, selectedCategories, searchTerm, selectedStockStatuses, sortConfig, getSupplierById]);


    const paginatedProducts = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return processedProducts.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [processedProducts, currentPage, itemsPerPage]);

    // Grouping logic for the current page
    const groupedProducts = useMemo(() => {
        const groups: Record<string, { products: any[], categoryId: string }> = {};
        paginatedProducts.forEach(product => {
            const catName = product.categoryName || 'Uncategorized';
            if (!groups[catName]) {
                groups[catName] = { 
                    products: [], 
                    categoryId: product.categoryId 
                };
            }
            groups[catName].products.push(product);
        });
        // Sort category names alphabetically
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, { products: any[], categoryId: string }>);
    }, [paginatedProducts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategories, selectedStockStatuses]);
    
    const getStatusPillClasses = (status: 'In Stock' | 'Low Stock' | 'Out of Stock') => {
        switch (status) {
        case 'In Stock':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400';
        case 'Low Stock':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400';
        case 'Out of Stock':
            return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400';
        }
    };

    const renderContent = () => {
        if (loadError) {
            return (
                <EmptyState 
                    icon={AlertTriangle}
                    title="Failed to Load Products"
                    message={loadError || "An unexpected error occurred. Please check your connection and try again."}
                    retry={{ onClick: handleRetry }}
                />
            );
        }

        if (isDataLoading) {
            if (viewMode === 'list') {
                 const skeletonHeaders = [
                    { content: 'Product' }, { content: 'Category' },
                    { content: 'Brand ID' }, { content: 'Label ID' },
                    { content: 'Available' }, { content: 'Price' }, { content: 'Actions', className: 'text-right' }
                ];
                return <TableSkeleton headers={skeletonHeaders} rows={5} />;
            }
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                    ))}
                </div>
            );
        }

        if (products.length === 0) {
            return (
                <EmptyState 
                    icon={Package}
                    title="No products found"
                    message="Get started by adding your first product to the catalog."
                    action={{ text: (
                        <>
                            <Plus className="h-4 w-4 -ml-1 mr-2" />
                            New
                        </>
                    ), onClick: () => router.push('/inventory/catalog/new') }}
                />
            );
        }

        if (processedProducts.length === 0) {
            return (
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-foreground">No products found for "{searchTerm}"</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
            );
        }
        
        return (
            <div className="space-y-12">
                {/* FIX: Explicitly typed the mapped elements to resolve the 'unknown' argument error on the getCategoryStyles call. */}
                {(Object.entries(groupedProducts) as [string, { products: any[], categoryId: string }][]).map(([categoryName, group]: [string, { products: any[], categoryId: string }]) => (
                    <div key={categoryName} className="space-y-4">
                        <div className="flex items-center gap-4">
                             <div className={`flex items-center gap-3 px-4 py-2 border-l-4 rounded-r-lg bg-muted/40 w-full ${getCategoryStyles(group.categoryId).split(' ')[3]}`}>
                                <Tag className="w-5 h-5 text-muted-foreground" />
                                <h3 className="text-lg font-bold text-foreground font-variant-small-caps tracking-wide">
                                    {categoryName}
                                </h3>
                                <span className="ml-auto text-xs font-semibold text-muted-foreground bg-background px-2 py-1 rounded-full shadow-sm">
                                    {group.products.length} Products
                                </span>
                            </div>
                        </div>

                        {viewMode === 'list' ? (
                            <Table headers={[
                                { content: (
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => handleSortRequest('name')}>
                                        Product {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                )},
                                { content: 'Brand / Label ID' },
                                { content: (
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => handleSortRequest('totalStock')}>
                                        Available {sortConfig.key === 'totalStock' && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                )},
                                { content: (
                                    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => handleSortRequest('price')}>
                                        Price {sortConfig.key === 'price' && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                )},
                                { content: 'Actions', className: 'text-right' }
                            ]}>
                                {group.products.map((product) => {
                                    const openPoQuantity = purchaseOrders
                                        .filter(po => po.status === 'Issued' || po.status === 'Partially Received')
                                        .flatMap(po => po.items)
                                        .filter(item => item.productId === product.id)
                                        .reduce((sum, item) => sum + (item.receivedQuantity ? item.quantity - item.receivedQuantity : item.quantity), 0);
                                    return (
                                        <tr key={product.id} className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        <img 
                                                            className="h-10 w-10 rounded-md object-cover border" 
                                                            src={product.imageUrl || PLACEHOLDER_IMAGE} 
                                                            alt={product.name}
                                                            onError={(e) => { if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                                                        />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-foreground">{product.name}</div>
                                                        <div className="text-xs text-muted-foreground font-mono">{product.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span>B: {product.brandId || '-'}</span>
                                                    <span>L: {product.labelId || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center">
                                                    <div className="text-foreground font-bold">{product.totalStock}</div>
                                                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusPillClasses(product.status)}`}>
                                                        {product.status}
                                                    </span>
                                                </div>
                                                {openPoQuantity > 0 && <div className="text-[10px] text-sky-600 font-bold mt-1 uppercase">+{openPoQuantity} Ordered</div>}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-foreground">
                                                ₹{product.price.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Dropdown
                                                    align="right"
                                                    trigger={
                                                        <button className="p-1.5 rounded-full text-muted-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </button>
                                                    }
                                                >
                                                    <DropdownItem onClick={() => handleQuickView(product)}>
                                                        <div className="flex items-center"><Edit className="h-4 w-4 mr-2" />Quick View</div>
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => router.push(`/inventory/catalog/${product.id}/edit`)}>
                                                        <div className="flex items-center"><Edit className="h-4 w-4 mr-2" />Edit</div>
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => handleGenerateQrCode(product)}>
                                                        <div className="flex items-center"><QrCode className="h-4 w-4 mr-2" />QR Code</div>
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => handleDelete(product.id, product.name)} className="text-rose-600 hover:!text-rose-700">
                                                        <div className="flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</div>
                                                    </DropdownItem>
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {group.products.map(product => (
                                    <ProductCard key={product.id} product={product} onDelete={handleDelete} onGenerateQrCode={handleGenerateQrCode} onQuickView={handleQuickView} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const quickViewData = useMemo(() => {
        if (!viewingProduct) return null;

        const stocks = getStockForProduct(viewingProduct.id);
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (totalStock === 0) {
            status = 'Out of Stock';
        } else if (totalStock <= viewingProduct.reorderPoint) {
            status = 'Low Stock';
        }
        
        const stockByLocation = stocks
            .filter(s => s.locationId && s.quantity > 0)
            .map(s => ({
                locationName: getLocationById(s.locationId)?.name || 'Unknown Location',
                quantity: s.quantity
            }));
            
        return { totalStock, status, stockByLocation };
    }, [viewingProduct, getStockForProduct, getLocationById]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {isDataLoading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatCard icon={Package} title="Total SKUs" value={kpis.totalSkus.toLocaleString()} color="text-sky-500" />
                        <StatCard icon={Archive} title="Total Units" value={kpis.totalUnits.toLocaleString()} color="text-violet-500" />
                        <StatCard icon={DollarSign} title="Inventory Value" value={formatCurrency(kpis.inventoryValue)} color="text-emerald-500" />
                        <StatCard icon={AlertTriangle} title="Low Stock Items" value={kpis.lowStockItems.toLocaleString()} color="text-amber-500" />
                    </>
                )}
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-foreground">Product Catalog</h2>
                            <p className="text-sm text-muted-foreground mt-1">Browse and manage products grouped by category.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-muted rounded-lg flex items-center">
                                <Button size="icon" variant={viewMode === 'list' ? 'secondary' : 'ghost'} onClick={() => setViewMode('list')} className="h-8 w-8"><List className="h-4 w-4"/></Button>
                                <Button size="icon" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} onClick={() => setViewMode('grid')} className="h-8 w-8"><Grid className="h-4 w-4"/></Button>
                            </div>
                            <Button onClick={() => router.push('/inventory/catalog/new')}>
                                <Plus className="h-4 w-4 mr-2 -ml-1" />
                                New Product
                            </Button>
                        </div>
                    </div>
                     <div className="mt-4 flex flex-col gap-4 pt-4 border-t">
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <div className="relative w-full flex-grow">
                                <Input
                                    id="product-search"
                                    placeholder="Search by name, SKU, description, supplier..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 !py-1.5 text-sm"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="flex items-center w-full sm:w-auto flex-shrink-0">
                                <Dropdown
                                    align="left"
                                    width="w-64"
                                    trigger={
                                        <Button
                                            variant="secondary"
                                            className="w-full sm:w-52 justify-between h-9 px-3 text-sm rounded-r-none bg-muted hover:bg-accent"
                                        >
                                            <span>Category ({selectedCategories.length})</span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    }
                                >
                                    <div onClick={(e) => e.stopPropagation()} className="p-2 border-b border-border">
                                        <Input 
                                            id="category-search-dropdown"
                                            placeholder="Search categories..."
                                            value={categorySearch}
                                            onChange={e => setCategorySearch(e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="max-h-52 overflow-y-auto sidebar-scrollbar">
                                        {(categories || [])
                                            .filter(cat => {
                                                const catName = cat?.name || '';
                                                const search = categorySearch || '';
                                                return catName.toLowerCase().includes(search.toLowerCase());
                                            })
                                            .map(cat => (
                                            <label key={cat.id} className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(cat.id)}
                                                    onChange={() => handleCategoryToggle(cat.id)}
                                                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                                />
                                                <span className="ml-3 text-foreground">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedCategories.length > 0 && (
                                        <div className="p-1 border-t border-border">
                                            <Button variant="ghost" size="sm" className="w-full text-primary" onClick={(e) => { e.stopPropagation(); setSelectedCategories([]); }}>
                                                Clear selection
                                            </Button>
                                        </div>
                                    )}
                                </Dropdown>
                                <Dropdown
                                    align="left"
                                    width="w-64"
                                    trigger={
                                        <Button
                                            variant="secondary"
                                            className="w-full sm:w-52 justify-between h-9 px-3 text-sm rounded-l-none bg-muted hover:bg-accent -ml-px"
                                        >
                                            <span>Stock Status ({selectedStockStatuses.length})</span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    }
                                >
                                    <div onClick={(e) => e.stopPropagation()}>
                                        {stockStatusOptions.map(status => (
                                            <label key={status} className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStockStatuses.includes(status)}
                                                    onChange={() => handleStockStatusToggle(status)}
                                                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                                />
                                                <span className="ml-3 text-foreground">{status}</span>
                                            </label>
                                        ))}
                                     </div>
                                     {selectedStockStatuses.length > 0 && (
                                        <div className="p-1 border-t border-border">
                                            <Button variant="ghost" size="sm" className="w-full text-primary" onClick={(e) => { e.stopPropagation(); setSelectedStockStatuses([]); }}>
                                                Clear selection
                                            </Button>
                                        </div>
                                    )}
                                </Dropdown>
                            </div>
                        </div>
                        {(selectedCategories.length > 0 || selectedStockStatuses.length > 0) && (
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <span className="text-sm font-semibold text-muted-foreground">Active:</span>
                                {selectedCategories.map(catId => {
                                    const cat = getCategoryById(catId);
                                    return (
                                        <div key={catId} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-1 rounded-full">
                                            <span>{cat?.name}</span>
                                            <button onClick={() => handleCategoryToggle(catId)} className="text-secondary-foreground/70 hover:text-secondary-foreground">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )
                                })}
                                {selectedStockStatuses.map(status => (
                                    <div key={status} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-1 rounded-full">
                                        <span>{status}</span>
                                        <button onClick={() => handleStockStatusToggle(status)} className="text-secondary-foreground/70 hover:text-secondary-foreground">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <Button variant="link" size="sm" onClick={clearAllFilters} className="text-xs h-auto py-1 px-2 text-primary">
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
                {dataState.products.loaded && processedProducts.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination 
                            itemsPerPage={itemsPerPage}
                            totalItems={processedProducts.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>

            <Modal isOpen={!!deletingProduct} onClose={() => setDeletingProduct(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete <strong className="text-foreground">{deletingProduct?.name}</strong>? This action may fail if the product is associated with existing orders or stock records.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingProduct(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
            
             <Modal isOpen={!!viewingQrCode} onClose={() => setViewingQrCode(null)} title={`QR Code for ${viewingQrCode?.name}`}>
                {viewingQrCode && (
                    <div className="text-center printable-area">
                        <p className="font-semibold text-lg">{viewingQrCode.name}</p>
                        <p className="text-sm text-muted-foreground mb-4 font-mono">{viewingQrCode.sku}</p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(viewingQrCode.sku || viewingQrCode.id)}&size=250x250&bgcolor=ffffff`}
                            alt={`QR Code for ${viewingQrCode.name}`}
                            className="mx-auto border rounded-md"
                            width="250"
                            height="250"
                        />
                    </div>
                )}
                <div className="mt-6 flex justify-end space-x-2 no-print">
                    <Button variant="secondary" onClick={() => setViewingQrCode(null)}>Close</Button>
                    <Button onClick={() => window.print()}>Print</Button>
                </div>
            </Modal>
            
            <Modal isOpen={!!viewingProduct} onClose={() => setViewingProduct(null)} title="Product Quick View" size="lg">
                {viewingProduct && quickViewData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                            <img 
                                src={viewingProduct.imageUrl || PLACEHOLDER_IMAGE} 
                                alt={viewingProduct.name} 
                                className="object-cover w-full h-full"
                                onError={(e) => { if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                            />
                        </div>

                        <div className="flex flex-col">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full self-start ${getStatusPillClasses(quickViewData.status)}`}>
                                {quickViewData.status}
                            </span>
                            <h2 className="text-2xl font-bold text-foreground mt-2">{viewingProduct.name}</h2>
                            <p className="text-sm text-muted-foreground font-mono">{viewingProduct.sku}</p>
                            {viewingProduct.productCode && <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-tighter">Code: {viewingProduct.productCode}</p>}
                            <p className="text-3xl font-bold text-primary mt-4">₹{viewingProduct.price.toFixed(2)}</p>
                            
                            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Total Stock:</span>
                                    <span className="font-bold text-foreground">{quickViewData.totalStock} units</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Reorder Point:</span>
                                    <span className="font-bold text-foreground">{viewingProduct.reorderPoint} units</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex-grow">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Location Ledger</h4>
                                {quickViewData.stockByLocation.length > 0 ? (
                                    <div className="max-h-32 overflow-y-auto border rounded-md">
                                        <Table headers={['Location', { content: 'Qty', className: 'text-right' }]}>
                                            {quickViewData.stockByLocation.map(stock => (
                                                <tr key={stock.locationName}>
                                                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{stock.locationName}</td>
                                                    <td className="px-3 py-1.5 text-xs text-right font-bold text-foreground">{stock.quantity}</td>
                                                </tr>
                                            ))}
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md text-center italic">No localized stock found.</p>
                                )}
                            </div>
                            
                            <Button 
                                variant="secondary" 
                                className="mt-4 w-full" 
                                onClick={() => router.push(`/inventory/catalog/${viewingProduct.id}/edit`)}
                            >
                                Edit Full Spec
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProductCatalog;
