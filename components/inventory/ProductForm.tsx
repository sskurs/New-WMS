'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductPackaging, Uom, MaterialUsed, EnvironmentalFactor, PackagingType, Category, ProductVariant } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import { generateProductDescription, suggestSku, validateProductName, suggestCategory, suggestProductCode, suggestBrandId, suggestLabelId } from '@/services/geminiService';
import { Sparkles, Loader2, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { uomData } from '@/data/uom';

interface ProductFormProps { 
    initialProduct?: Partial<Product>;
    onSave: (product: Partial<Product>) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

interface FormErrors {
    name?: string;
    sku?: string;
    productCode?: string;
    description?: string;
    categoryId?: string;
    supplierId?: string;
    basePrice?: string;
    reorderPoint?: string;
    shelfLife?: string;
    brandId?: string;
    labelId?: string;
    hsnCode?: string;
}

const materialsList: MaterialUsed[] = [
    'Cardboard', 'Plastic', 'Glass', 'Shrink Wrap', 'Bubble Wrap', 'Foam', 'Paper', 'Paperboard',
];

const packagingTypesList: PackagingType[] = [
    'Primary Packaging', 'Secondary Packaging', 'Tertiary Packaging', 'Pallets',
];

const environmentalFactorsList: EnvironmentalFactor[] = [
    'Standard', 'Refrigerated', 'Frozen', 'Humidity Controlled'
];

const findUomCategory = (abbreviation: string | undefined): string => {
  if (!abbreviation) return '';
  for (const category in uomData) {
    if (uomData[category].some(uom => uom.abbreviation === abbreviation)) {
      return category;
    }
  }
  return '';
};


const ProductForm: React.FC<ProductFormProps> = ({ initialProduct, onSave, onCancel, isSaving }) => {
    const { getCategoryById, pricingRules, categories, dataState, suppliers, products } = useAppContext();
    const { addToast } = useToast();

    const [product, setProduct] = useState<Partial<Product>>(initialProduct || {
        name: '', sku: '', productCode: '', description: '', categoryId: '', price: 0, reorderPoint: 0,
        supplierId: '', imageUrl: '', variants: [],
        packaging: { packagingType: 'Primary Packaging', unitOfMeasure: 'PCS', materials: [], environmentalFactors: 'Standard', shelfLife: '' },
        pricingRuleId: '',
        gstPercentage: 0,
        supplierType: 'Local',
        brandId: '',
        labelId: '',
        unitId: '',
        packSize: '1',
        hsnCode: '',
    });
    
    const [activeTab, setActiveTab] = useState('general');
    const [basePrice, setBasePrice] = useState<number | string>('');
    const [isBasePriceFocused, setIsBasePriceFocused] = useState(false);
    const [uomCategory, setUomCategory] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    
    // AI-related state
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeneratingSku, setIsGeneratingSku] = useState(false);
    const [isGeneratingProdCode, setIsGeneratingProdCode] = useState(false);
    const [isSuggestingCat, setIsSuggestingCat] = useState(false);
    const [isGeneratingBrandId, setIsGeneratingBrandId] = useState(false);
    const [isGeneratingLabelId, setIsGeneratingLabelId] = useState(false);
    const [nameValidation, setNameValidation] = useState<{ status: 'idle' | 'loading' | 'valid' | 'invalid'; message: string }>({ status: 'idle', message: '' });

    useEffect(() => {
        if (initialProduct) {
            setProduct({
                ...initialProduct,
                gstPercentage: initialProduct.gstPercentage ?? 0,
                packaging: initialProduct.packaging || {
                    packagingType: 'Primary Packaging', unitOfMeasure: 'PCS', materials: [], environmentalFactors: 'Standard', shelfLife: ''
                }
            });
            if (initialProduct.stockUom) {
                const category = findUomCategory(initialProduct.stockUom);
                setUomCategory(category);
            }
            // Reverse-calculate base price for editing
            if (initialProduct.price && (initialProduct.gstPercentage || initialProduct.gstPercentage === 0)) {
                const gst = initialProduct.gstPercentage;
                const finalPrice = initialProduct.price;
                const calculatedBasePrice = finalPrice / (1 + gst / 100);
                setBasePrice(calculatedBasePrice.toFixed(2));
            } else {
                setBasePrice(initialProduct.price || '');
            }
        }
    }, [initialProduct]);
    
    const uniquePricingRules = useMemo(() => {
        if (!Array.isArray(pricingRules)) return [];
        const seen = new Set();
        return pricingRules.filter(rule => {
            if (!rule || !rule.id) return false;
            if (seen.has(rule.id)) {
                console.warn(`Duplicate pricing rule ID found: ${rule.id}. It will be excluded from the dropdown.`);
                return false;
            }
            seen.add(rule.id);
            return true;
        });
    }, [pricingRules]);

    const handleChange = (field: keyof Product, value: any) => {
        setProduct(prev => ({ ...prev, [field]: value }));
        
        // Inline validation for HSN Code
        if (field === 'hsnCode') {
            const hsnValue = String(value);
            // Allow typing but validate logic
            if (/[^0-9]/.test(hsnValue)) {
                 setErrors(prev => ({ ...prev, hsnCode: 'HSN Code must contain only digits.' }));
            } else if (hsnValue.length > 8) {
                 setErrors(prev => ({ ...prev, hsnCode: 'HSN Code cannot exceed 8 digits.' }));
            } else {
                 setErrors(prev => ({ ...prev, hsnCode: undefined }));
            }
        } else if (errors[field as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
        }
    };

    const handleHsnBlur = () => {
         const hsn = product.hsnCode?.trim();
         if (!hsn) {
             setErrors(prev => ({ ...prev, hsnCode: 'HSN Code is required.' }));
         } else if (hsn.length !== 8) {
             setErrors(prev => ({ ...prev, hsnCode: 'HSN Code must be exactly 8 digits.' }));
         } else if (!/^\d+$/.test(hsn)) {
             setErrors(prev => ({ ...prev, hsnCode: 'HSN Code must contain only digits.' }));
         } else {
             // Clear error if valid
             if (errors.hsnCode) {
                 setErrors(prev => ({ ...prev, hsnCode: undefined }));
             }
         }
    };

    // Auto-calculate final price when base price or GST changes
    useEffect(() => {
        const bp = parseFloat(String(basePrice));
        const gst = product.gstPercentage ?? 0;
        if (!isNaN(bp)) {
            const finalPrice = bp * (1 + gst / 100);
            handleChange('price', parseFloat(finalPrice.toFixed(2)));
        } else {
            handleChange('price', 0);
        }
    }, [basePrice, product.gstPercentage]);

    
    const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange('name', e.target.value);
        if (nameValidation.status !== 'idle') {
            setNameValidation({ status: 'idle', message: '' });
        }
    };

    const handleNameValidation = async () => {
        const trimmedName = product.name?.trim();
        if (!trimmedName) {
            setNameValidation({ status: 'idle', message: '' });
            return;
        }
        
        setNameValidation({ status: 'loading', message: '' });
        try {
            const result = await validateProductName(trimmedName);
            if (result.isValid) setNameValidation({ status: 'valid', message: '' });
            else setNameValidation({ status: 'invalid', message: result.reason });
        } catch (error) {
            setNameValidation({ status: 'idle', message: '' });
            addToast({ type: 'info', message: 'Could not perform AI name validation.' });
        }
    };
    
    const handleProductNameBlur = async () => {
        // Run name validation first
        handleNameValidation();
    
        // Then, attempt to auto-generate if fields are empty
        if (product.name) {
            const category = product.categoryId ? getCategoryById(product.categoryId) : undefined;
            
            if (!product.productCode) {
                setIsGeneratingProdCode(true);
                try {
                    const code = await suggestProductCode(product.name, category?.name || '');
                    setProduct(p => ({...p, productCode: code}));
                } catch (e) { 
                    console.error("Failed to auto-generate Product Code", e); 
                    addToast({ type: 'error', message: "Could not generate Product Code." });
                } finally { 
                    setIsGeneratingProdCode(false); 
                }
            }
            if (!product.brandId) {
                setIsGeneratingBrandId(true);
                try {
                    const id = await suggestBrandId(product.name);
                    setProduct(p => ({...p, brandId: id}));
                } catch (e) {
                    console.error("Failed to auto-generate Brand ID", e);
                    addToast({ type: 'error', message: "Could not generate Brand ID." });
                } finally {
                    setIsGeneratingBrandId(false);
                }
            }
            if (!product.labelId) {
                setIsGeneratingLabelId(true);
                try {
                    const id = await suggestLabelId(product.name);
                    setProduct(p => ({...p, labelId: id}));
                } catch (e) {
                    console.error("Failed to auto-generate Label ID", e);
                    addToast({ type: 'error', message: "Could not generate Label ID." });
                } finally {
                    setIsGeneratingLabelId(false);
                }
            }
        }
    };

    const handleUomCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value;
        setUomCategory(newCategory);
        // Reset sub-category and product UOM when category changes
        handleChange('stockUom', ''); 
    };

    const handlePackagingChange = (field: keyof ProductPackaging, value: any) => {
        setProduct(prev => ({ ...prev, packaging: { ...(prev.packaging as ProductPackaging), [field]: value }}));
         if (field === 'shelfLife' && errors.shelfLife) {
            setErrors(prev => ({ ...prev, shelfLife: undefined }));
        }
    };

    const handleMaterialChange = (material: MaterialUsed, isChecked: boolean) => {
        const currentMaterials = product.packaging?.materials || [];
        const newMaterials = isChecked ? [...currentMaterials, material] : currentMaterials.filter(m => m !== material);
        handlePackagingChange('materials', newMaterials);
    };

    const handleGenerateDescription = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!product.name) return addToast({type: 'info', message: 'Please enter a product name first.'});
        setIsGeneratingDesc(true);
        try {
            const description = await generateProductDescription({ name: product.name, category: product.categoryId ? getCategoryById(product.categoryId)?.name : undefined, price: product.price, variants: product.variants });
            handleChange('description', description);
            addToast({ type: 'success', message: 'Description generated successfully!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate description.' });
        } finally {
            setIsGeneratingDesc(false);
        }
    };
    
    const handleGenerateSku = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!product.name) return addToast({ type: 'info', message: 'Please enter a product name first.' });
        setIsGeneratingSku(true);
        try {
            const category = product.categoryId ? getCategoryById(product.categoryId) : undefined;
            const sku = await suggestSku(product.name, category?.name || '');
            handleChange('sku', sku);
            addToast({ type: 'success', message: 'SKU generated successfully!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate SKU.' });
        } finally {
            setIsGeneratingSku(false);
        }
    };
    
    const handleGenerateProdCode = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!product.name) return addToast({ type: 'info', message: 'Please enter a product name first.' });
        setIsGeneratingProdCode(true);
        try {
            const category = product.categoryId ? getCategoryById(product.categoryId) : undefined;
            const code = await suggestProductCode(product.name, category?.name || '');
            handleChange('productCode', code);
            addToast({ type: 'success', message: 'Product Code generated successfully!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate Product Code.' });
        } finally {
            setIsGeneratingProdCode(false);
        }
    };

    const handleGenerateBrandId = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!product.name) return addToast({ type: 'info', message: 'Please enter a product name first.' });
        setIsGeneratingBrandId(true);
        try {
            const id = await suggestBrandId(product.name);
            handleChange('brandId', id);
            addToast({ type: 'success', message: 'Brand ID generated successfully!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate Brand ID.' });
        } finally {
            setIsGeneratingBrandId(false);
        }
    };

    const handleGenerateLabelId = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!product.name) return addToast({ type: 'info', message: 'Please enter a product name first.' });
        setIsGeneratingLabelId(true);
        try {
            const id = await suggestLabelId(product.name);
            handleChange('labelId', id);
            addToast({ type: 'success', message: 'Label ID generated successfully!' });
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to generate Label ID.' });
        } finally {
            setIsGeneratingLabelId(false);
        }
    };

    const handleSuggestCategory = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!product.name) return addToast({ type: 'info', message: 'Please enter a product name first.' });
        if (!categories || categories.length === 0) return addToast({ type: 'info', message: 'No categories available to suggest from.' });
        setIsSuggestingCat(true);
        try {
            const suggestedId = await suggestCategory(product.name, categories);
            if (suggestedId) {
                handleChange('categoryId', suggestedId);
                addToast({ type: 'success', message: 'AI suggested a category!' });
            } else {
                addToast({ type: 'info', message: 'AI could not determine a suitable category.' });
            }
        } catch (error) {
            addToast({ type: 'error', message: 'Failed to get category suggestion.' });
        } finally {
            setIsSuggestingCat(false);
        }
    };
    
    const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        // Allow empty string, or a string that is a valid start of a decimal number with up to 2 decimal places
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setBasePrice(value);
             if (errors.basePrice) {
                setErrors(prev => ({ ...prev, basePrice: undefined }));
            }
        }
    };

    const formattedBasePriceOnBlur = useMemo(() => {
        if (basePrice === '' || basePrice === null || basePrice === undefined) return '';
        const num = parseFloat(String(basePrice));
        if (isNaN(num)) return '';
        return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [basePrice]);

    const validate = (): FormErrors => {
        const newErrors: FormErrors = {};
        if (!product.name?.trim()) newErrors.name = 'Product name is required.';
        if (!product.sku?.trim()) newErrors.sku = 'SKU is required.';
        
        // Product Code Validation
        if (!product.productCode?.trim()) {
            newErrors.productCode = 'Product code is required.';
        } else {
            // Uniqueness check for Product Code
            const codeToCheck = product.productCode.trim().toLowerCase();
            const duplicate = products.find(p => 
                p.productCode && // Ensure code exists
                p.productCode.trim().toLowerCase() === codeToCheck && 
                String(p.id) !== String(initialProduct?.id || '') // Robust ID comparison
            );

            if (duplicate) {
                newErrors.productCode = 'Product Code must be unique.';
            }
        }

        if (!product.description?.trim()) newErrors.description = 'Description is required.';
        if (!product.categoryId) newErrors.categoryId = 'Category is required.';
        if (!product.supplierId) newErrors.supplierId = 'Supplier is required.';
        if (basePrice === '' || Number(basePrice) <= 0) newErrors.basePrice = 'Base price must be greater than 0.';
        if (product.reorderPoint == null || product.reorderPoint < 0) newErrors.reorderPoint = 'Reorder point is required.';
        if (!product.packaging?.shelfLife || Number(product.packaging.shelfLife) < 0) newErrors.shelfLife = 'Shelf life is required and must be a positive number.';
        if (!product.brandId?.trim()) newErrors.brandId = 'Brand ID is required.';
        if (!product.labelId?.trim()) newErrors.labelId = 'Label ID is required.';
        
        // HSN Validation
        if (!product.hsnCode?.trim()) {
            newErrors.hsnCode = 'HSN Code is required.';
        } else if (!/^\d{8}$/.test(product.hsnCode.trim())) {
             newErrors.hsnCode = 'HSN Code must be exactly 8 digits.';
        }

        return newErrors;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            addToast({ type: 'error', message: 'Please fix the validation errors.' });
            
            // Auto-switch tabs to show the error
            if (validationErrors.name || validationErrors.sku || validationErrors.productCode || validationErrors.description || validationErrors.categoryId || validationErrors.supplierId || validationErrors.brandId || validationErrors.labelId) {
                setActiveTab('general');
            } else if (validationErrors.basePrice || validationErrors.hsnCode) {
                setActiveTab('pricing');
            } else if (validationErrors.reorderPoint) {
                setActiveTab('inventory');
            } else if (validationErrors.shelfLife) {
                setActiveTab('packaging');
            }
            return;
        }

        if (nameValidation.status === 'loading' || nameValidation.status === 'invalid') {
            addToast({ type: 'error', message: 'Please fix the validation errors before saving.' });
            setActiveTab('general');
            return;
        }
       
        await onSave(product);
    };

    const handleAddVariant = () => {
        setProduct(prev => ({
            ...prev,
            variants: [...(prev.variants || []), { id: `new-${Date.now()}`, name: '', value: '' }]
        }));
    };

    const handleRemoveVariant = (indexToRemove: number) => {
        setProduct(prev => ({
            ...prev,
            variants: (prev.variants || []).filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleVariantChange = (index: number, field: keyof Omit<ProductVariant, 'id'>, value: string) => {
        setProduct(prev => {
            const newVariants = JSON.parse(JSON.stringify(prev.variants || []));
            newVariants[index][field] = value;
            return { ...prev, variants: newVariants };
        });
    };
    
    const TabButton = ({ tabName, label }: { tabName: string; label: string }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 focus:outline-none ${
                activeTab === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
        </button>
    );

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                 <CardHeader className="p-0">
                    <div className="border-b border-border">
                        <nav className="flex space-x-2 px-4 -mb-px" aria-label="Tabs">
                            <TabButton tabName="general" label="General" />
                            <TabButton tabName="pricing" label="Pricing" />
                            <TabButton tabName="inventory" label="Inventory" />
                            <TabButton tabName="packaging" label="Packaging" />
                            <TabButton tabName="variants" label="Variants" />
                        </nav>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                            <div className="md:col-span-2 space-y-6">
                                <div className="relative">
                                    <Input id="name" label="Product Name" value={product.name || ''} onChange={handleProductNameChange} onBlur={handleProductNameBlur} required error={errors.name || (nameValidation.status === 'invalid' ? nameValidation.message : undefined)} />
                                    <div className="absolute top-9 right-3 flex items-center">
                                        {nameValidation.status === 'loading' && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                                        {nameValidation.status === 'valid' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                        {nameValidation.status === 'invalid' && <XCircle className="h-5 w-5 text-destructive" />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-end gap-2">
                                        <Input
                                            id="sku"
                                            label="SKU"
                                            value={product.sku || ''}
                                            onChange={e => handleChange('sku', e.target.value)}
                                            required
                                            error={errors.sku}
                                            disabled={isGeneratingSku}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateSku} loading={isGeneratingSku} disabled={!product.name} aria-label="Generate SKU">
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Input
                                            id="productCode"
                                            label="Product Code"
                                            value={product.productCode || ''}
                                            onChange={e => handleChange('productCode', e.target.value)}
                                            required
                                            error={errors.productCode}
                                            disabled={isGeneratingProdCode}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateProdCode} loading={isGeneratingProdCode} disabled={!product.name} aria-label="Generate Product Code">
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div className="relative">
                                        <Select id="category" label="Category" value={product.categoryId || ''} onChange={e => handleChange('categoryId', e.target.value)} required disabled={dataState.categories.loading} error={errors.categoryId}>
                                            <option value="" disabled>{dataState.categories.loading ? "Loading..." : "Select..."}</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </Select>
                                        <Button type="button" variant="ghost" size="sm" className="absolute top-7 right-1 h-8 px-2 text-primary hover:bg-accent" onClick={handleSuggestCategory} loading={isSuggestingCat} disabled={!product.name}>
                                            {!isSuggestingCat && <Sparkles className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <Select id="supplier" label="Supplier" value={product.supplierId || ''} onChange={e => handleChange('supplierId', e.target.value)} required disabled={dataState.suppliers.loading} error={errors.supplierId}>
                                        <option value="" disabled>{dataState.suppliers.loading ? "Loading..." : "Select..."}</option>
                                        {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                                    </Select>
                                    <Select id="supplierType" label="Supplier Type" value={product.supplierType || ''} onChange={e => handleChange('supplierType', e.target.value)}>
                                        <option value="Local">Local</option>
                                        <option value="International">International</option>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-end gap-2">
                                        <Input
                                            id="brandId"
                                            label="Brand ID"
                                            value={product.brandId || ''}
                                            onChange={e => handleChange('brandId', e.target.value)}
                                            required
                                            error={errors.brandId}
                                            disabled={isGeneratingBrandId}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateBrandId} loading={isGeneratingBrandId} disabled={!product.name} aria-label="Generate Brand ID">
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Input
                                            id="labelId"
                                            label="Label ID"
                                            value={product.labelId || ''}
                                            onChange={e => handleChange('labelId', e.target.value)}
                                            required
                                            error={errors.labelId}
                                            disabled={isGeneratingLabelId}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-accent flex-shrink-0" onClick={handleGenerateLabelId} loading={isGeneratingLabelId} disabled={!product.name} aria-label="Generate Label ID">
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1.5">Description<span className="text-destructive ml-1">*</span></label>
                                    <textarea id="description" rows={4} className={`block w-full px-3 py-2 border rounded-md bg-background ${errors.description ? 'border-destructive' : 'border-input'}`} value={product.description || ''} onChange={e => handleChange('description', e.target.value)} required />
                                    {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
                                    <Button size="sm" variant="ghost" type="button" className="absolute top-0 right-0 mt-1 mr-1 text-primary hover:bg-accent" onClick={handleGenerateDescription} loading={isGeneratingDesc}>
                                        {!isGeneratingDesc && <Sparkles className="h-4 w-4 mr-1" />} AI Generate
                                    </Button>
                                </div>
                            </div>
                            <div className="md:col-span-1 space-y-4">
                                <ImageUploader initialImage={product.imageUrl} onImageChange={(base64) => handleChange('imageUrl', base64)} />
                            </div>
                        </div>
                    )}
                    {activeTab === 'pricing' && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <Input id="basePrice" label="Base Price (₹)" type="text" value={isBasePriceFocused ? basePrice : formattedBasePriceOnBlur} onChange={handleBasePriceChange} onFocus={() => setIsBasePriceFocused(true)} onBlur={() => setIsBasePriceFocused(false)} placeholder="e.g., 1500.00" required error={errors.basePrice}/>
                                <Select id="gstPercentage" label="GST Percentage" value={product.gstPercentage ?? ''} onChange={e => handleChange('gstPercentage', Number(e.target.value))}>
                                    <option value="0">0% (Exempt)</option> <option value="5">5%</option> <option value="12">12%</option> <option value="18">18%</option> <option value="28">28%</option>
                                </Select>
                            </div>
                            <Input 
                                id="hsnCode" 
                                label="HSN/SAC Code" 
                                value={product.hsnCode || ''} 
                                onChange={e => handleChange('hsnCode', e.target.value)} 
                                onBlur={handleHsnBlur}
                                placeholder="e.g. 99831412" 
                                error={errors.hsnCode} 
                                required 
                                maxLength={8}
                            />
                             <div>
                                <Input id="finalPrice" label="Final Price (incl. GST)" type="text" value={`₹ ${product.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`} readOnly disabled className="bg-muted/50 font-bold" />
                            </div>
                            <Select id="pricingRule" label="Pricing Rule" value={product.pricingRuleId || ''} onChange={e => handleChange('pricingRuleId', e.target.value)}>
                                <option value="">None (Standard)</option>
                                {uniquePricingRules.map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
                            </Select>
                        </div>
                    )}
                     {activeTab === 'inventory' && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select id="uomCategory" label="UOM Category" value={uomCategory} onChange={handleUomCategoryChange}>
                                    <option value="">Select Category...</option>
                                    {Object.keys(uomData).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </Select>
                                <Select id="stockUom" label="Unit of Measure" value={product.stockUom || ''} onChange={e => handleChange('stockUom', e.target.value)} disabled={!uomCategory}>
                                    <option value="">Select Unit...</option>
                                    {uomCategory && uomData[uomCategory].map(uom => ( <option key={uom.abbreviation} value={uom.abbreviation}>{uom.name} ({uom.abbreviation})</option>))}
                                </Select>
                            </div>
                            <Input id="unitId" label="Unit ID" value={product.unitId || ''} onChange={e => handleChange('unitId', e.target.value)} placeholder="e.g. 789" />
                            <div>
                                <label htmlFor="packSize" className="block text-sm font-medium text-muted-foreground mb-1.5">Pack Size</label>
                                <div className="flex items-center">
                                    <Input id="packSize" type="number" value={product.packSize || ''} onChange={e => handleChange('packSize', e.target.value)} min="0" onKeyDown={(e) => { if (['-', '+', '.', 'e', 'E'].includes(e.key)) e.preventDefault(); }} className="rounded-r-none" />
                                    <span className="inline-flex items-center px-3 h-10 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground">{product.stockUom || 'unit'}</span>
                                </div>
                            </div>
                            <Input id="reorderPoint" label="Reorder Point" type="number" value={product.reorderPoint || ''} onChange={e => handleChange('reorderPoint', Math.max(0, parseInt(e.target.value, 10) || 0))} min="0" onKeyDown={(e) => { if (['-', '+', '.', 'e', 'E'].includes(e.key)) e.preventDefault(); }} required error={errors.reorderPoint} />
                        </div>
                    )}
                    {activeTab === 'packaging' && (
                         <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
                             <Select id="packagingType" label="Packaging Type" value={product.packaging?.packagingType || ''} onChange={e => handlePackagingChange('packagingType', e.target.value)} required>
                                {packagingTypesList.map(type => <option key={type} value={type}>{type}</option>)}
                            </Select>
                            <fieldset>
                                <legend className="text-sm font-medium text-muted-foreground mb-1.5">Materials Used</legend>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 mt-2 pt-2">
                                    {materialsList.map(material => (
                                        <div key={material} className="flex items-center">
                                            <input id={`material-${material.replace(/\s+/g, '-')}`} type="checkbox" checked={product.packaging?.materials?.includes(material) || false} onChange={e => handleMaterialChange(material, e.target.checked)} className="h-4 w-4 text-primary border-input rounded focus:ring-ring" />
                                            <label htmlFor={`material-${material.replace(/\s+/g, '-')}`} className="ml-3 text-sm text-muted-foreground">{material}</label>
                                        </div>
                                    ))}
                                </div>
                            </fieldset>
                            <Select id="environmentalFactors" label="Handling" value={product.packaging?.environmentalFactors || 'Standard'} onChange={e => handlePackagingChange('environmentalFactors', e.target.value)}>
                                {environmentalFactorsList.map(factor => <option key={factor} value={factor}>{factor}</option>)}
                            </Select>
                            <Input id="shelfLife" label="Shelf Life (days)" type="number" value={product.packaging?.shelfLife || ''} onChange={e => handlePackagingChange('shelfLife', e.target.value)} min="0" placeholder="e.g., 180" onKeyDown={(e) => { if (['-', '+', '.', 'e', 'E'].includes(e.key)) e.preventDefault(); }} required error={errors.shelfLife}/>
                        </div>
                    )}
                    {activeTab === 'variants' && (
                        <div className="space-y-4 max-w-2xl mx-auto animate-fadeIn">
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Variants</label>
                                <div className="space-y-2">
                                    {product.variants?.map((variant, index) => (
                                        <div key={variant.id || index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                            <Input id={`variant-name-${index}`} placeholder="e.g., Color" value={variant.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} className="!h-9" />
                                            <Input id={`variant-value-${index}`} placeholder="e.g., Red" value={variant.value} onChange={e => handleVariantChange(index, 'value', e.target.value)} className="!h-9" />
                                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive flex-shrink-0" onClick={() => handleRemoveVariant(index)}> <X className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    {(!product.variants || product.variants.length === 0) && ( <p className="text-sm text-muted-foreground text-center py-2">No variants added.</p>)}
                                </div>
                                <Button type="button" variant="secondary" size="sm" onClick={handleAddVariant} className="mt-2">
                                    <Plus className="h-4 w-4 mr-2" /> Add Variant
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="mt-6 flex justify-end space-x-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={isSaving} disabled={isSaving || nameValidation.status === 'loading' || nameValidation.status === 'invalid'}>Save Product</Button>
            </div>
        </form>
    );
};

export default ProductForm;