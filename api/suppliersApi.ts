import { Supplier, PurchaseOrder, PurchaseOrderItem, SupplierReturn, SupplierReturnStatus } from '../types';
import { apiClient } from './apiClient';

const mapSupplierFromAPI = (apiSupplier: any): Supplier => ({
    id: apiSupplier.supplierId?.toString() || apiSupplier.id,
    name: apiSupplier.supplierName || apiSupplier.name || '',
    contactPerson: apiSupplier.contactPersonName || apiSupplier.contactPerson || '',
    email: apiSupplier.email || apiSupplier.emailId || '',
    phone: apiSupplier.phoneNo || apiSupplier.contactNo || apiSupplier.phone,
    address: apiSupplier.address || '',
    city: apiSupplier.city || '',
    state: apiSupplier.state || '',
    zipCode: apiSupplier.zipCode || apiSupplier.postalCode || '',
    country: apiSupplier.country || 'India',
    website: apiSupplier.website || '',
    status: (apiSupplier.isActive === 1 || apiSupplier.status === 'Active') ? 'Active' : 'Inactive',
    rating: apiSupplier.rating ? Number(apiSupplier.rating) : undefined,
    notes: apiSupplier.notes || '',
});

const mapSupplierToAPIPayload = (supplier: Partial<Supplier>) => {
    return {
        supplierId: 0,
        supplierName: supplier.name || '',
        contactPersonName: supplier.contactPerson || '',
        email: supplier.email || '',
        phoneNo: supplier.phone || '',
        createdAt: new Date().toISOString(),
        website: supplier.website || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        zipCode: supplier.zipCode ? parseInt(String(supplier.zipCode), 10) : 0,
        country: supplier.country || 'India',
        rating: supplier.rating || 0,
        status: supplier.status || 'Active',
        notes: supplier.notes || '',
        isArchived: false,
        isActive: supplier.status === 'Active',
        createdBy: 0,
        modifiedBy: 0,
        fkLocationId: 0
    };
};

const mapApiStatusToPoStatus = (apiStatus: string | number | undefined): PurchaseOrder['status'] => {
    if (!apiStatus) return 'Issued';
    const lowerStatus = String(apiStatus).toLowerCase().trim();

    if (lowerStatus.includes('partial')) return 'Partially Received';
    if (lowerStatus.includes('in-process')) return 'Partially Received';
    if (lowerStatus === 'received') return 'Received';
    if (lowerStatus === 'cancelled') return 'Cancelled';
    if (lowerStatus === 'draft') return 'Draft';
    if (lowerStatus === 'pending' || lowerStatus === 'issued' || lowerStatus === 'ordered') return 'Issued';
    
    const validStatuses: PurchaseOrder['status'][] = ['Draft', 'Issued', 'Partially Received', 'Received', 'Cancelled'];
    const match = validStatuses.find(s => s.toLowerCase() === lowerStatus);
    if (match) return match;

    return 'Issued';
};

const mapPurchaseOrderFromAPI = (apiPo: any): PurchaseOrder => {
    const rawItems: any[] = Array.isArray(apiPo.items) ? apiPo.items : [];
    
    const items: PurchaseOrderItem[] = rawItems.map(item => ({
        id: item.id?.toString(),
        productId: (item.productId?.toString() || item.fkProductId?.toString()),
        quantity: Number(item.quantity) || 0,
        cost: Number(item.costPerUnit || item.cost) || 0,
        receivedQuantity: Number(item.receivedQuantity) || 0,
    })).filter(item => item.productId);

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const receivedQuantity = items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    let totalAmount = apiPo.totalAmount != null 
        ? Number(apiPo.totalAmount) 
        : items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    const poId = apiPo.purchaseOrderId?.toString() || apiPo.id;

    return {
        id: poId,
        poNumber: apiPo.orderNumber || apiPo.poNumber || (poId ? `PO-${poId}` : 'N/A'),
        supplierId: (apiPo.supplierId || apiPo.fkSupplierId) ? String(apiPo.supplierId || apiPo.fkSupplierId) : '',
        supplierName: apiPo.supplierName,
        items: items,
        createdAt: apiPo.orderDate || apiPo.createdAt,
        // Corrected reference from apiStatus to apiPo.status
        status: mapApiStatusToPoStatus(apiPo.status),
        totalAmount: totalAmount,
        totalQuantity: totalQuantity,
        receivedQuantity: receivedQuantity,
        putAwayId: (apiPo.putAwayId || apiPo.putawayId)?.toString(),
    };
};

const mapPurchaseOrderToAPICreatePayload = (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>, userId: string) => {
    const parseNumericId = (idString?: string): number => {
        if (!idString) return 0;
        const num = parseInt(idString.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    };
    const numericUserId = parseNumericId(userId);
    const now = new Date().toISOString();

    return {
        purchaseOrderId: 0,
        supplierId: parseNumericId(po.supplierId),
        fkWarehouseId: 7,
        fkLocationId: 7,
        orderNumber: `PO-${Date.now()}`,
        orderDate: now,
        status: "Draft",
        createdOn: now,
        createdBy: numericUserId,
        purchaseItems: (po.items || []).map(item => ({
            id: 0,
            productId: parseNumericId(item.productId),
            fkPurchaseOrderId: 0,
            quantity: item.quantity,
            costPerUnit: item.cost,
            createdOn: now,
            createdBy: numericUserId,
            receivedQuantity: 0
        }))
    };
};

const mapPurchaseOrderToAPIUpdatePayload = (po: PurchaseOrder, userId: string) => {
    const parseNumericId = (idString: string | undefined | null): number => {
        if (!idString) return 0;
        const num = parseInt(String(idString).replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    };
    const numericUserId = parseNumericId(userId);
    const poId = parseNumericId(po.id);

    return {
        purchaseOrderId: poId,
        supplierId: parseNumericId(po.supplierId),
        fkWarehouseId: 5,
        fkLocationId: 8,
        orderNumber: po.poNumber,
        orderDate: po.createdAt || new Date().toISOString(),
        status: po.status || "Pending",
        modifiedBy: numericUserId,
        purchaseItems: (po.items || []).map(item => ({
            id: po.status === 'Draft' ? 0 : parseNumericId(item.id),
            productId: parseNumericId(item.productId),
            fkPurchaseOrderId: poId,
            quantity: item.quantity,
            costPerUnit: item.cost,
            modifiedBy: String(numericUserId),
            receivedQuantity: item.receivedQuantity || 0
        }))
    };
};


export const getSuppliers = async (): Promise<Supplier[]> => {
    try {
        const response = await apiClient.get<any>('/warehouse-management/supplier-master/get-all');
        const rawSuppliers = response?.data || response;
        if (Array.isArray(rawSuppliers)) {
            return rawSuppliers.map(mapSupplierFromAPI);
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch suppliers:", error);
        throw error;
    }
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    try {
        const response = await apiClient.get<any>('/warehouse-management/purchase-order/get-all');
        const rawPOs = response?.data || response;
        if (Array.isArray(rawPOs)) {
            return rawPOs.filter(Boolean).map(mapPurchaseOrderFromAPI);
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch purchase orders:", error);
        throw error;
    }
};

export const getPurchaseOrderById = async (poId: string): Promise<PurchaseOrder> => {
    try {
        const numericId = parseInt(poId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid Purchase Order ID format: ${poId}`);
        }
        const response = await apiClient.get<any>(`/warehouse-management/purchase-order/get-by-id?id=${numericId}`, { cache: 'no-store' });
        const responseData = response?.data || response;
        if (responseData && responseData.purchaseOrderId && Array.isArray(responseData.items)) {
            return mapPurchaseOrderFromAPI(responseData);
        } else {
            throw new Error('Received malformed data from the purchase order endpoint.');
        }
    } catch (error) {
        console.error(`Failed to fetch purchase order with ID ${poId}:`, error);
        throw error;
    }
};


export const addSupplierAPI = async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const payload = mapSupplierToAPIPayload(supplier);
    const response = await apiClient.post<any>('/warehouse-management/supplier-master/create', payload);
    const responseData = response.data || response;
    let apiSupplier = responseData;
    if (responseData?.status === 'success' && Array.isArray(responseData.data)) {
        apiSupplier = responseData.data[0];
    } else if (Array.isArray(responseData) && responseData.length > 0) {
        apiSupplier = responseData[0];
    }
    if (!apiSupplier || Object.keys(apiSupplier).length === 0) {
        return { ...supplier, id: `temp-${Date.now()}` } as Supplier;
    }
    return mapSupplierFromAPI(apiSupplier);
};

export const updateSupplierAPI = async (supplier: Supplier): Promise<Supplier> => {
    const payload = {
      ...mapSupplierToAPIPayload(supplier),
      supplierId: supplier.id ? parseInt(String(supplier.id).replace(/[^0-9]/g, ''), 10) : 0,
    };
    const response = await apiClient.put<any>('/warehouse-management/supplier-master/update', payload);
    return mapSupplierFromAPI(response.data || response);
};

export const deleteSupplierAPI = (supplierId: string): Promise<null> => {
    const numericId = parseInt(supplierId.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numericId)) {
        return Promise.reject(new Error("Invalid supplier ID format."));
    }
    return apiClient.delete(`/warehouse-management/supplier-master/delete`, { id: numericId });
};


export const addPurchaseOrderAPI = async (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>, userId: string): Promise<void> => {
    const payload = mapPurchaseOrderToAPICreatePayload(po, userId);
    await apiClient.post<any>('/warehouse-management/purchase-order/create', payload);
};

export const updatePurchaseOrderAPI = async (po: PurchaseOrder, userId: string): Promise<PurchaseOrder> => {
    const payload = mapPurchaseOrderToAPIUpdatePayload(po, userId);
    const response = await apiClient.put<any>('/warehouse-management/purchase-order/update', payload);
    let responseData = response?.data || response;
    if (Array.isArray(responseData) && responseData.length > 0 && typeof responseData[0].data === 'string') {
        try {
            const parsed = JSON.parse(responseData[0].data);
            responseData = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) { }
    } else if (Array.isArray(responseData) && responseData.length > 0) {
        responseData = responseData[0];
    } else if (responseData?.status === 'success' && Array.isArray(responseData.data) && responseData.data.length > 0) {
        responseData = responseData.data[0];
    }
    if (!responseData || !(responseData.purchaseOrderId || responseData.id)) {
        return po;
    }
    return mapPurchaseOrderFromAPI(responseData);
};

export const deletePurchaseOrderAPI = (poId: string): Promise<void> => {
    const numericId = parseInt(poId.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numericId)) {
        return Promise.reject(new Error("Invalid Purchase Order ID format."));
    }
    return apiClient.delete(`/warehouse-management/purchase-order/delete`, { id: numericId });
};

// --- Supplier Returns (Return to Vendor) API ---

export const getSupplierReturnsAPI = async (status?: string): Promise<SupplierReturn[]> => {
    try {
        // Map 'all' from UI filter to 'All' required by backend, or default to 'All'
        const effectiveStatus = (status && status !== 'all') ? status : 'All';
        const endpoint = `/v1/logistics/rtv/list?status=${effectiveStatus}`;
            
        const response = await apiClient.get<any>(endpoint);
        
        const data = response?.data || [];
        
        if(Array.isArray(data)) {
            return data.map((item: any) => ({
                id: String(item.rtvId || item.id),
                supplierId: String(item.supplierId),
                status: item.status as SupplierReturnStatus,
                createdAt: item.dispatchDate || item.createdAt || new Date().toISOString(),
                createdByUserId: String(item.userId || '0'),
                notes: item.debitNoteNumber ? `Debit Note: ${item.debitNoteNumber}` : (item.notes || ''),
                shippedAt: item.dispatchDate,
                items: Array.isArray(item.itemsList) ? item.itemsList.map((i: any, idx: number) => ({
                    id: `item-${item.rtvId || item.id}-${idx}`,
                    productId: String(i.productId),
                    quantity: Number(i.quantity),
                    locationId: String(i.batchId || ''),
                    reason: i.reasonCode || i.reason || ''
                })) : []
            }));
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch supplier returns:", error);
        return [];
    }
};

export const createSupplierReturnAPI = async (data: Omit<SupplierReturn, 'id' | 'status' | 'createdAt'>): Promise<SupplierReturn> => {
    try {
        // Spec Endpoint: /api/v1/logistics/rtv/initiate
        // Request Payload mapping based on spec
        const payload = {
            rtvId: 0,
            supplierId: parseInt(data.supplierId, 10) || 0,
            purchaseOrderId: parseInt(data.purchaseOrderId || '0', 10) || 0,
            warehouseId: parseInt(data.warehouseId || '0', 10) || 1, // Default or provided
            status: "Draft",
            notes: data.notes || "",
            items: data.items.map(item => ({
                productId: parseInt(item.productId, 10) || 0,
                batchId: item.batchId || "",
                quantity: item.quantity || 0,
                reasonCode: item.reasonCode || item.reason || ""
            }))
        };
        
        const response = await apiClient.post<any>('/v1/logistics/rtv/initiate', payload);
        const responseData = response?.data || response;

        // Response mapping based on spec: { success, rtvId, status, message }
        return {
            ...data,
            id: String(responseData?.rtvId || `rtv-${Date.now()}`),
            status: (responseData?.status as SupplierReturnStatus) || 'Draft',
            createdAt: new Date().toISOString()
        };
    } catch (error) {
        throw error;
    }
};

export const updateSupplierReturnStatusAPI = async (returnId: string, status: SupplierReturnStatus): Promise<void> => {
    try {
        const numericId = returnId.replace(/[^0-9]/g, '');
        
        if (status === 'Approved') {
            await apiClient.put(`/v1/logistics/rtv/${numericId}/approve`, {});
        } else if (status === 'Shipped') {
            const payload = {
                trackingNumber: `TRK-${Date.now()}`,
                transporterName: "BlueDart Logistics",
                dispatchDocs: ["DOC-001"]
            };
            await apiClient.put(`/v1/logistics/rtv/${numericId}/dispatch`, payload);
        } else if (status === 'Settled') {
            await apiClient.put(`/v1/logistics/rtv/${numericId}/settle`, {});
        } else {
            const payload = {
                returnId: parseInt(numericId, 10),
                status: status
            };
            await apiClient.put('/v1/logistics/rtv/update-status', payload);
        }
    } catch (error) {
        console.error("Failed to update return status:", error);
        throw error;
    }
};