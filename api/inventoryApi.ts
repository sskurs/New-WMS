import { Product, Stock, AdjustmentType, ProductPackaging, StockAdjustment, SupplierProduct, ProductVariant } from '../types';
import { apiClient } from './apiClient';

/**
 * Maps a product object from the API response to the frontend's Product type.
 */
const mapProductFromAPI = (apiProduct: any): Product => {
    const productId = String(apiProduct.productId || apiProduct.Id || apiProduct.id);

    // Variants parsing logic
    let variants: ProductVariant[] = [];
    let rawVariantsData: any[] = [];
    
    if (typeof apiProduct.variants === 'string') {
        try {
            const parsed = JSON.parse(apiProduct.variants);
            if (Array.isArray(parsed)) {
                rawVariantsData = parsed;
            }
        } catch (e) {
            console.error(`Failed to parse variants string for product ${productId}:`, apiProduct.variants);
        }
    } else if (Array.isArray(apiProduct.variants)) {
        rawVariantsData = apiProduct.variants;
    }
    
    if (rawVariantsData.length > 0) {
        const mappedVariants = rawVariantsData.map((v, index) => ({
            id: String(v.variantId || v.id || `temp-get-${productId}-${index}`),
            name: v.name,
            value: v.value,
        }));

        const uniqueVariants: ProductVariant[] = [];
        const seen = new Set<string>();
        for (const variant of mappedVariants) {
            const key = `${variant.name}:${variant.value}`.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueVariants.push(variant);
            }
        }
        variants = uniqueVariants;
    }

    let packaging: ProductPackaging | undefined;
    let rawPackagingData: any | undefined;
    
    if (typeof apiProduct.packaging === 'string') {
        try {
            const parsed = JSON.parse(apiProduct.packaging);
            if (parsed && typeof parsed === 'object') {
                 rawPackagingData = parsed;
            }
        } catch (e) {
            console.error(`Failed to parse packaging string for product ${productId}:`, apiProduct.packaging);
        }
    } else if (typeof apiProduct.packaging === 'object' && apiProduct.packaging !== null) {
        rawPackagingData = apiProduct.packaging;
    }
    
    if (rawPackagingData) {
        packaging = {
            ...rawPackagingData,
            packagingId: Number(rawPackagingData.packagingId || 0),
            materials: Array.isArray(rawPackagingData.materials)
                ? rawPackagingData.materials
                    .map((m: any) => typeof m === 'object' ? m?.materialName : m)
                    .filter((name: any): name is string => typeof name === 'string' && name.length > 0)
                : [],
            shelfLife: String(rawPackagingData.shelfLife ?? apiProduct.shelfLife ?? ''),
            packagingType: rawPackagingData.packagingType || apiProduct.packagingType || 'Primary Packaging'
        };
    }

    const getNumber = (...values: any[]): number => {
        for (const val of values) {
            if (val !== undefined && val !== null && val !== '') {
                const num = Number(val);
                if (!isNaN(num)) return num;
            }
        }
        return 0;
    };

    const getString = (...values: any[]): string => {
        for (const val of values) {
            if (val !== undefined && val !== null && val !== '') {
                return String(val);
            }
        }
        return '';
    };

    const sku = getString(apiProduct.sku, apiProduct.Sku, apiProduct.SKU, apiProduct.productSku, apiProduct.ProductSku) || `SKU-${productId}`;
    const productCode = getString(apiProduct.productCode, apiProduct.ProductCode, apiProduct.product_code);

    return {
        id: productId,
        name: apiProduct.productName || apiProduct.ProductName || apiProduct.product || 'Unknown Product',
        categoryId: apiProduct.categoryId ? String(apiProduct.categoryId) : (apiProduct.category || ''),
        price: Number(apiProduct.price || apiProduct.Price) || 0,
        sku: sku,
        description: apiProduct.description || apiProduct.Description || `Description for ${apiProduct.productName || apiProduct.product || 'product'}.`,
        reorderPoint: getNumber(
            apiProduct.reorderPoint, 
            apiProduct.ReorderPoint, 
            apiProduct.reOrderPoint, 
            apiProduct.minStock,
            apiProduct.MinStock
        ),
        supplierId: (apiProduct.supplierId || apiProduct.SupplierId || apiProduct.fkSupplierId) ? String(apiProduct.supplierId || apiProduct.SupplierId || apiProduct.fkSupplierId) : '',
        supplierName: getString(apiProduct.supplierName, apiProduct['supplierName '], apiProduct.SupplierName),
        productCode: productCode,
        imageUrl: apiProduct.imageUrl || apiProduct.ImageUrl,
        pricingRuleId: apiProduct.pricingRuleId ? String(apiProduct.pricingRuleId) : undefined,
        variants: variants, 
        packaging: packaging,
        productGroup: apiProduct.productGroup,
        stockUom: apiProduct.stockUom,
        disabled: apiProduct.disabled,
        allowAlternativeItem: apiProduct.allowAlternativeItem,
        isStockItem: apiProduct.isStockItem,
        hasVariants: apiProduct.hasVariants,
        isFixedAsset: apiProduct.isFixedAsset,
        openingStock: apiProduct.openingStock,
        valuationRate: apiProduct.valuationRate,
        standardRate: apiProduct.standardRate,
        supplierType: apiProduct.supplierType,
        brandId: apiProduct.brandId ? String(apiProduct.brandId) : undefined,
        labelId: apiProduct.labelId ? String(apiProduct.labelId) : undefined,
        unitId: apiProduct.unitId ? String(apiProduct.unitId) : undefined,
        packSize: apiProduct.packSize ? String(apiProduct.packSize) : undefined,
        hsnCode: apiProduct.hsnCode,
        gstPercentage: apiProduct.gstPercentage,
    };
};

export const getProducts = async (): Promise<Product[]> => {
    try {
        const productsArray = await apiClient.get<any[]>('/Product/getAll');
        if (!Array.isArray(productsArray)) return [];
        return productsArray.filter(Boolean).map(mapProductFromAPI);
    } catch (error) {
        console.error("Failed to fetch products:", error);
        throw error;
    }
};

export const getProductByIdAPI = async (productId: string): Promise<Product> => {
    try {
        const numericProductId = parseInt(productId.replace(/[^0-9]/g, ''), 10);
        const response = await apiClient.get<any>(`/Product/getById?productId=${numericProductId}`);
        let responseData = response?.data || response;
        if (Array.isArray(responseData) && responseData.length > 0) responseData = responseData[0];
        return mapProductFromAPI(responseData);
    } catch (error) {
        console.error(`Failed to fetch product ${productId}:`, error);
        throw error;
    }
};

export const addProductAPI = async (product: Omit<Product, 'id'>, userId?: string): Promise<Product> => {
    try {
        const p = product;
        const pkg = p.packaging;
        const uid = userId ? parseInt(userId, 10) : 0;

        const payload = {
            sku: p.sku || "",
            productCode: p.productCode || "",
            productName: p.name || "",
            description: p.description || "",
            categoryId: p.categoryId ? parseInt(p.categoryId, 10) : 0,
            supplierId: p.supplierId ? parseInt(p.supplierId, 10) : 0,
            pricingRuleId: p.pricingRuleId ? parseInt(p.pricingRuleId, 10) : 0,
            price: p.price || 0,
            reorderPoint: p.reorderPoint || 0,
            imageUrl: p.imageUrl || "",
            productGroup: p.productGroup || "None",
            stockUom: p.stockUom || "Nos",
            disabled: p.disabled ?? 0,
            allowAlternativeItem: p.allowAlternativeItem ?? 0,
            isStockItem: p.isStockItem ?? 1,
            hasVariants: p.hasVariants ?? 0,
            isFixedAsset: p.isFixedAsset ?? 0,
            openingStock: p.openingStock ?? 0,
            valuationRate: p.price || 0,
            standardRate: p.price || 0,
            supplierType: p.supplierType || "Local",
            brandId: p.brandId ? parseInt(p.brandId, 10) : 0,
            labelId: p.labelId ? parseInt(p.labelId, 10) : 0,
            unitId: p.unitId ? parseInt(p.unitId, 10) : 0,
            packSize: String(p.packSize || "1"),
            hsnCode: p.hsnCode || "",
            gstPercentage: p.gstPercentage || 0,
            createdBy: uid,
            shelfLife: pkg?.shelfLife ? parseInt(pkg.shelfLife, 10) : 0,
            packagingType: pkg?.packagingType || "Primary Packaging",
            variants: (p.variants || []).map(v => ({
                name: v.name,
                value: v.value
            })),
            packaging: {
                packagingType: pkg?.packagingType || "Primary Packaging",
                unitOfMeasure: pkg?.unitOfMeasure || "Nos",
                environmentalFactors: pkg?.environmentalFactors || "Standard",
                shelfLife: String(pkg?.shelfLife || "0"),
                materials: pkg?.materials || []
            }
        };

        const response = await apiClient.post<any>('/Product/Create', payload);
        return mapProductFromAPI(response.data || response);
    } catch (error) {
        console.error("Failed to add product:", error);
        throw error;
    }
};

export const updateProductAPI = async (product: Product, userId?: string): Promise<Product> => {
    try {
        const p = product;
        const pkg = p.packaging;
        const uid = userId ? parseInt(userId, 10) : 0;

        const payload = {
            productId: parseInt(p.id, 10),
            sku: p.sku || "",
            productCode: p.productCode || "",
            productName: p.name || "",
            description: p.description || "",
            categoryId: p.categoryId ? parseInt(p.categoryId, 10) : 0,
            supplierId: p.supplierId ? parseInt(p.supplierId, 10) : 0,
            pricingRuleId: p.pricingRuleId ? parseInt(p.pricingRuleId, 10) : 0,
            price: p.price || 0,
            reorderPoint: p.reorderPoint || 0,
            imageUrl: p.imageUrl || "",
            productGroup: p.productGroup || "None",
            stockUom: p.stockUom || "Nos",
            disabled: p.disabled ?? 0,
            allowAlternativeItem: p.allowAlternativeItem ?? 0,
            isStockItem: p.isStockItem ?? 1,
            hasVariants: p.hasVariants ?? 0,
            isFixedAsset: p.isFixedAsset ?? 0,
            openingStock: p.openingStock ?? 0,
            valuationRate: p.price || 0,
            standardRate: p.price || 0,
            supplierType: p.supplierType || "Local",
            brandId: p.brandId ? parseInt(p.brandId, 10) : 0,
            labelId: p.labelId ? parseInt(p.labelId, 10) : 0,
            unitId: p.unitId ? parseInt(p.unitId, 10) : 0,
            packSize: String(p.packSize || "1"),
            hsnCode: p.hsnCode || "",
            gstPercentage: p.gstPercentage || 0,
            updatedBy: uid,
            shelfLife: pkg?.shelfLife ? parseInt(pkg.shelfLife, 10) : 0,
            packagingType: pkg?.packagingType || "Primary Packaging",
            variants: (p.variants || []).map(v => {
                const vid = parseInt(v.id, 10);
                return {
                    variantId: isNaN(vid) ? 0 : vid,
                    name: v.name,
                    value: v.value
                };
            }),
            packaging: {
                packagingId: pkg?.packagingId || 0,
                packagingType: pkg?.packagingType || "Primary Packaging",
                unitOfMeasure: pkg?.unitOfMeasure || "Nos",
                environmentalFactors: pkg?.environmentalFactors || "Standard",
                shelfLife: String(pkg?.shelfLife || "0"),
                materials: (pkg?.materials || []).map(m => ({
                    packagingDetailId: 0,
                    materialName: m
                }))
            }
        };

        await apiClient.put<any>('/Product/update', payload);
        return product;
    } catch (error) {
        console.error(`Failed to update product ${product.id}:`, error);
        throw error;
    }
};

export const deleteProductAPI = async (productId: string, userId: string): Promise<void> => {
    try {
        const numericProductId = parseInt(productId.replace(/[^0-9]/g, ''), 10);
        await apiClient.delete<any>('/Product/delete', { productId: numericProductId, userId: parseInt(userId, 10) });
    } catch (error) {
        console.error(`Failed to delete product ${productId}:`, error);
        throw error;
    }
};

const mapStockFromAPI = (item: any): Stock => {
    if (!item) return { id: 'unknown', productId: '0', quantity: 0, locationId: null };
    // Prioritize currentStock from the provided payload format
    return {
        id: String(item.stockDetailId || item.stockId || item.StockDetailId || item.id),
        productId: String(item.productId || item.ProductId || '0'),
        quantity: Number(item.currentStock ?? item.quantity ?? 0),
        locationId: (item.locationId || item.LocationId) ? String(item.locationId || item.LocationId) : null,
    };
};

export const getStocks = async (): Promise<Stock[]> => {
    try {
        const response = await apiClient.get<any>('/StockDetails/GetAll');
        const data = response?.data || response;
        if (Array.isArray(data)) return data.filter(Boolean).map(mapStockFromAPI);
        return [];
    } catch (error) {
        console.error("Failed to fetch stocks:", error);
        throw error;
    }
};

/**
 * Fetches specific stock detail using the path /api/StockDetails/GetById/{id}
 * Aligned with the payload structure: { status: "success", data: { ... } }
 */
export const getStockDetailByIdAPI = async (stockId: number): Promise<Stock> => {
    try {
        const response = await apiClient.get<any>(`/StockDetails/GetById/${stockId}`);
        const responseData = response?.data || response;
        const finalData = Array.isArray(responseData) ? responseData[0] : responseData;
        return mapStockFromAPI(finalData);
    } catch (error) {
        console.error(`Failed to fetch stock detail for ID ${stockId}:`, error);
        throw error;
    }
};

/**
 * Atomic stock update workflow implementing the requested recovery logic.
 */
export const updateStockQuantityAPI = async (productId: string, quantityChange: number, locationId: string | null, userId: string) => {
    const numProductId = parseInt(productId.replace(/[^0-9]/g, ''), 10);
    const numLocationId = locationId ? parseInt(locationId.replace(/[^0-9]/g, ''), 10) : 0;
    const numUserId = parseInt(userId, 10) || 0;

    const createPayload = {
        stockId: 0,
        productId: numProductId,
        locationId: numLocationId,
        batchId: `BATCH-${numProductId}-${Date.now()}`,
        warehouseId: 1,
        currentStock: quantityChange, 
        flagId: 1,
        createdBy: numUserId,
        modifiedBy: numUserId,
        isActive: 1,
    };

    try {
        const response = await apiClient.post<any>('/StockDetails/Create', createPayload);
        return response;
    } catch (error) {
        const errorMsg = (error as Error).message || "";
        let conflictData: any = null;

        try {
            conflictData = JSON.parse(errorMsg);
        } catch (e) {}
        
        if (conflictData && conflictData.status === 'failed' && conflictData.message === 'PRODUCT_ID_ALREADY_EXISTS') {
            const stockIdToUpdate = Number(conflictData.stockId || 0);
            
            let currentQuantity = 0;
            if (stockIdToUpdate > 0) {
                try {
                    const existingRecord = await getStockDetailByIdAPI(stockIdToUpdate);
                    currentQuantity = existingRecord.quantity;
                } catch (e) {
                    currentQuantity = Number(conflictData.currentStock || 0);
                }
            } else {
                currentQuantity = Number(conflictData.currentStock || 0);
            }
            
            const newAbsoluteStock = currentQuantity + quantityChange;

            const updatePayload = {
                stockDetailId: stockIdToUpdate,
                stockId: stockIdToUpdate,
                productId: numProductId,
                locationId: numLocationId,
                warehouseId: 1,
                currentStock: newAbsoluteStock,
                modifiedBy: numUserId,
                isActive: 1,
            };
            
            return await apiClient.put('/StockDetails/Update', updatePayload);
        }
        throw error;
    }
};

export const getStockAdjustmentsAPI = async (): Promise<StockAdjustment[]> => {
    try {
        const response = await apiClient.get<any>('/StockAdjustment/GetAll');
        const data = response?.data || response;
        if (Array.isArray(data)) return data.map(adj => ({
            id: String(adj.id),
            productId: String(adj.productId),
            quantity: Number(adj.quantity),
            type: adj.type as AdjustmentType,
            reason: adj.reason,
            createdAt: adj.createdOn,
            userId: String(adj.userId),
            // Fix: Include locationId in the mapping, ensuring 0 is treated as null
            locationId: (adj.locationId && adj.locationId !== 0) ? String(adj.locationId) : null,
        }));
        return [];
    } catch (error) {
        console.error("Failed to fetch adjustments:", error);
        throw error;
    }
};

export const createStockAdjustmentAPI = async (adjustment: any): Promise<StockAdjustment> => {
    try {
        const response = await apiClient.post<any>('/StockAdjustment/Create', adjustment);
        return response.data || response;
    } catch (error) {
        console.error("Failed to create adjustment:", error);
        throw error;
    }
};

export const getProductsBySupplierId = async (supplierId: string): Promise<SupplierProduct[]> => {
    try {
        const numericId = parseInt(supplierId.replace(/[^0-9]/g, ''), 10);
        const response = await apiClient.get<any>(`/Product/getBySupplierId?SupplierId=${numericId}`);
        const data = response?.data || response;
        if (Array.isArray(data)) return data.map(p => ({
            id: String(p.productId || p.Id || p.id),
            name: p.product || p.productName || p.ProductName || 'Unknown',
            // Robust SKU mapping to handle inconsistent API property names
            sku: p.sku || p.Sku || p.SKU || p.productSku || p.ProductSku || p.productCode || 'N/A',
            cost: Number(p.price || p.Price || p.standardRate || 0)
        }));
        return [];
    } catch (error) {
        console.error(`Failed to fetch supplier products ${supplierId}:`, error);
        throw error;
    }
};