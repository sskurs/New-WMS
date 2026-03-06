'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Product } from '@/types';
import ProductForm from '@/components/inventory/ProductForm';
import { useToast } from '@/contexts/ToastContext';

const EditProduct: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const productId = params.productId as string;
    const { updateProduct, fetchProductById, loadProducts, loadSuppliers, loadCategories } = useAppContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProducts(); // Load all products for uniqueness validation
        loadSuppliers();
        loadCategories();
        
        if (productId) {
            setIsLoading(true);
            fetchProductById(productId)
                .then(foundProduct => {
                    if (foundProduct) {
                        setProduct(foundProduct);
                    } else {
                        // The error toast is handled in the context, so just redirect.
                        router.push('/inventory/catalog');
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [productId, fetchProductById, router, loadProducts, loadSuppliers, loadCategories]);

    const handleSave = async (productData: Partial<Product>) => {
        setIsSaving(true);
        try {
            await updateProduct(productData as Product);
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

    // Show a loading state until the product is found and set in local state.
    if (isLoading || !product) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Loading product details...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground">Edit Product: {product.name}</h1>
            </div>
            <ProductForm
                initialProduct={product}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
            />
        </div>
    );
};

export default EditProduct;