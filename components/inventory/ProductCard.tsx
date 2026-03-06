
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import Card, { CardContent } from '@/components/ui/Card';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { useAppContext } from '@/contexts/AppContext';
import { MoreHorizontal, Edit, Trash2, QrCode, Image as ImageIcon, Eye } from 'lucide-react';
import Button from '../ui/Button';

interface ProductCardProps {
  product: Product;
  onDelete: (productId: string, productName: string) => void;
  onGenerateQrCode: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjQwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz4KICA8cGF0aCBkPSJNMjAwIDIwSDQwQzI5IDIwIDIwIDI5IDIwIDQwVjE2MEMyMCAxNzEgMjkgMTgwIDQwIDE4MEgyMDBDMjExIDE4MCAyMjAgMTcxIDIyMCAxNjBWNDBDMjIwIDI5IDIxMSAyMCAyMDAgMjBaTTEwMCA4MEMxMDAgNjkgOTEgNjAgODAgNjBDNjkgNjAgNjAgNjkgNjAgODBDNjAgOTEgNjkgMTAwIDgwIDEwMEM5MSAxMDAgMTAwIDkxIDEwMCA4MFpNMTgwIDE2MEg2MEw5MCAxMjBMMTIwIDE1MEwxNTAgMTAwTDIwMCAxNjBIMTgwWiIgZmlsbD0iI0NCRDVFMSIvPgo8L3N2Zz4=';

const ProductCard: React.FC<ProductCardProps> = ({ product, onDelete, onGenerateQrCode, onQuickView }) => {
  const router = useRouter();
  const { getCategoryById, getPricingRuleById, getStockForProduct, getLocationById, purchaseOrders } = useAppContext();
  
  const { status, locations, totalStock, openPoQuantity } = React.useMemo(() => {
    const stocks = getStockForProduct(product.id);
    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
    
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (totalStock === 0) {
      status = 'Out of Stock';
    } else if (totalStock <= product.reorderPoint) {
      status = 'Low Stock';
    }

    const openPoQuantity = purchaseOrders
        .filter(po => po.status === 'Issued' || po.status === 'Partially Received')
        .flatMap(po => po.items)
        .filter(item => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
    
    const locations = stocks
        .filter(s => s.locationId)
        .map(s => getLocationById(s.locationId)?.name)
        .filter(Boolean)
        .join(', ');

    return { status, locations, totalStock, openPoQuantity };
  }, [product.id, product.reorderPoint, getStockForProduct, getLocationById, purchaseOrders]);
  
  const categoryName = getCategoryById(product.categoryId)?.name || product.categoryId;
  const pricingRule = getPricingRuleById(product.pricingRuleId);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(product.id, product.name);
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/inventory/catalog/${product.id}/edit`);
  }
  
  const handleGenerateQrCodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerateQrCode(product);
  };
  
  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(product);
  };

  const getStatusPillClasses = (status: 'In Stock' | 'Low Stock' | 'Out of Stock') => {
    switch (status) {
        case 'In Stock': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400';
        case 'Low Stock': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400';
        case 'Out of Stock': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400';
    }
  };

  const categoryColors = [
    'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
    'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-400',
    'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-400',
    'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400',
  ];

  const getCategoryPillClasses = (categoryId: string) => {
    if(!categoryId) return categoryColors[0];
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
        hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const index = Math.abs(hash % categoryColors.length);
    return categoryColors[index];
  };

  return (
    <Card className="flex flex-col h-full group transition-all duration-300 hover:border-primary">
      <div className="relative">
          <div className="absolute top-2 right-2 z-10">
              <Dropdown
              align="right"
              trigger={
                <button className="p-1.5 rounded-full bg-background/70 text-muted-foreground hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <span className="sr-only">Actions for {product.name}</span>
                    <MoreHorizontal className="h-5 w-5" />
                </button>
              }
            >
              <DropdownItem onClick={handleEditClick}>
                <div className="flex items-center">
                  <Edit className="h-4 w-4 mr-2" />
                  <span>Edit</span>
                </div>
              </DropdownItem>
              <DropdownItem onClick={handleGenerateQrCodeClick}>
                <div className="flex items-center">
                  <QrCode className="h-4 w-4 mr-2" />
                  <span>Generate QR</span>
                </div>
              </DropdownItem>
              <DropdownItem 
                onClick={handleDeleteClick}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/20 dark:hover:text-red-400"
              >
                  <div className="flex items-center">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Delete</span>
                </div>
              </DropdownItem>
            </Dropdown>
          </div>

          <div className="absolute top-2 left-2 z-10">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusPillClasses(status)}`}>
                  {status}
              </span>
          </div>
          
          <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
              <img 
                src={product.imageUrl || PLACEHOLDER_IMAGE} 
                alt={product.name} 
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                    if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }
                }}
              />
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button
                      variant="secondary"
                      onClick={handleQuickViewClick}
                      className="bg-white/90 text-black hover:bg-white"
                  >
                      <Eye className="h-4 w-4 mr-2" />
                      Quick View
                  </Button>
              </div>
          </div>
      </div>
      <CardContent 
        className="flex-grow flex flex-col p-4 cursor-pointer"
        onClick={handleEditClick}
       >
          {categoryName && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full self-start ${getCategoryPillClasses(product.categoryId)}`}>
                {categoryName}
            </span>
          )}
          <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors mt-2">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground">{product.sku}</p>

          <div className="mt-2 flex items-center text-xs text-muted-foreground" title={locations || 'No assigned location'}>
            <QrCode className="h-3 w-3 mr-1.5 flex-shrink-0" />
            <span className="truncate">{locations || 'No assigned location'}</span>
          </div>
          
          <div className="mt-auto pt-3 flex justify-between items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{totalStock} units available</p>
              {openPoQuantity > 0 && <p className="text-xs text-sky-600 dark:text-sky-400">{openPoQuantity} on order</p>}
              {pricingRule && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{pricingRule.name}</p>}
            </div>
            <span className="text-lg font-bold text-foreground">₹{product.price.toFixed(2)}</span>
          </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
