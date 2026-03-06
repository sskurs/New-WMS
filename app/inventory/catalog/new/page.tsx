'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Product } from '@/types';
import ProductForm from '@/components/inventory/ProductForm';

const AddProduct: React.FC = () => {
    const router = useRouter();
    const { addProduct, loadProducts, loadSuppliers, loadCategories } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadProducts();
        loadSuppliers();
        loadCategories();
    }, [loadProducts, loadSuppliers, loadCategories]);

    const handleSave = async (productData: Partial<Product>) => {
        setIsSaving(true);
        try {
            await addProduct(productData as Omit<Product, 'id'>);
            router.push('/inventory/catalog');
        } catch (error) {
            // Error toast is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/inventory/catalog');
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Add New Product</h1>
            </div>
            <ProductForm onSave={handleSave} onCancel={handleCancel} isSaving={isSaving} />
        </div>
    );
};

export default AddProduct;