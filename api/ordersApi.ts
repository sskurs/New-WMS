import { Order, OrderStatus, RMA, PickList, PackedOrder, Product, InboundItem, RMAStatus, PickListItem, OrderItem, RMAReason, RMAResolution, AdjustmentType } from '../types';
import { apiClient } from './apiClient';

// --- Mappers ---
const mapPickListFromAPI = (apiPickList: any): PickList => {
    return {
        id: (apiPickList.id || apiPickList.pickListId)?.toString() || `PL-${Date.now()}`,
        orderId: (apiPickList.orderId || apiPickList.fkOrderId)?.toString(),
        status: apiPickList.status || 'Pending',
        createdAt: apiPickList.createdAt || new Date().toISOString(),
        items: Array.isArray(apiPickList.items) ? apiPickList.items.map((item: any) => ({
            productId: (item.productId || item.fkProductId)?.toString(),
            quantity: Number(item.quantity) || 0,
            locationId: (item.locationId || item.fkLocationId)?.toString(),
            picked: !!item.picked,
        })) : [],
    };
};

const mapOrderFromAPI = (apiOrder: any): Order => {
    const rawItems = Array.isArray(apiOrder.items || apiOrder.orderItems) ? (apiOrder.items || apiOrder.orderItems) : [];
    
    // Aggregate items by productId to handle potential duplicates from the API
    const aggregatedItemsMap = new Map<string, OrderItem>();
    rawItems.forEach((item: any) => {
        const productIdString = item.productId?.toString() || item.fkProductId?.toString();
        if (productIdString) {
            const productId = productIdString.trim();
            const quantity = Number(item.quantity || item.orderQty) || 0;
            const price = Number(item.price || item.unitPrice) || 0;

            const existingItem = aggregatedItemsMap.get(productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                aggregatedItemsMap.set(productId, {
                    productId: productId,
                    quantity: quantity,
                    price: price,
                });
            }
        }
    });
    const items = Array.from(aggregatedItemsMap.values());

    const totalAmount = apiOrder.totalAmount ?? items.reduce((sum: number, item: { price: number; quantity: number; }) => sum + item.price * item.quantity, 0);

    // Enhanced Status Normalization: Handle casing and extra spaces from the backend
    const rawStatus = (apiOrder.status || 'Pending').toString().trim();
    const validStatuses: OrderStatus[] = ['Pending', 'Processing', 'Ready for Pickup', 'Shipped', 'Returned', 'Completed', 'Cancelled'];
    
    // Case-insensitive lookup
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase());
    const status: OrderStatus = matchedStatus || 'Pending';

    return {
        id: (apiOrder.orderid || apiOrder.orderId || apiOrder.id)?.toString() || '',
        customerId: (apiOrder.customerId || apiOrder.fkCustomerId)?.toString(),
        customerName: apiOrder.customerName || apiOrder.customer?.name || apiOrder.fullName || `Customer for Order #${apiOrder.orderid || apiOrder.orderId || apiOrder.id}`,
        customerEmail: apiOrder.customerEmail || apiOrder.customer?.email || apiOrder.emailId || '',
        customerPhone: apiOrder.customerPhone || apiOrder.customer?.phone || apiOrder.contactNo || '',
        shippingAddress: apiOrder.shippingAddress || (apiOrder.address1 ? {
            address1: apiOrder.address1 || '',
            address2: apiOrder.address2 || undefined,
            city: apiOrder.city || '',
            state: apiOrder.state || '',
            zipCode: apiOrder.zipCode || '',
            country: apiOrder.country || '',
        } : apiOrder.deliveryAddress ? {
            address1: apiOrder.deliveryAddress.addressLine1 || '',
            address2: apiOrder.deliveryAddress.addressLine2 || undefined,
            city: apiOrder.deliveryAddress.city || '',
            state: apiOrder.deliveryAddress.state || '',
            zipCode: apiOrder.deliveryAddress.pinCode || '',
            country: apiOrder.deliveryAddress.country || '',
        } : undefined),
        items: items,
        status: status,
        createdAt: apiOrder.createdAt || apiOrder.orderDate || new Date().toISOString(),
        updatedAt: apiOrder.updatedAt || apiOrder.modifiedDate || new Date().toISOString(),
        priority: apiOrder.priority || apiOrder.orderPriority || 'Medium',
        notes: apiOrder.notes || apiOrder.remarks || '',
        totalAmount: totalAmount,
    };
};

const mapOrderToAPIPayload = (order: Order) => {
    const parseNumericId = (idString: string | undefined | null): number | undefined => {
        if (!idString) return undefined;
        const num = parseInt(idString.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? undefined : num;
    };
    
    return {
        id: parseNumericId(order.id),
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail || '',
        customerPhone: order.customerPhone || '',
        shippingAddress: {
            address1: order.shippingAddress?.address1 || '',
            address2: order.shippingAddress?.address2 || null,
            city: order.shippingAddress?.city || '',
            state: order.shippingAddress?.state || '',
            zipCode: order.shippingAddress?.zipCode || '',
            country: order.shippingAddress?.country || '',
        },
        items: order.items.map(item => ({
            productId: parseNumericId(item.productId),
            quantity: item.quantity,
            price: item.price,
        })),
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        priority: order.priority,
        notes: order.notes,
        totalAmount: order.totalAmount,
        orderDate: order.createdAt,
    };
}

const mapRmaFromAPI = (apiRma: any): RMA => ({
    id: (apiRma.id || apiRma.rmaId)?.toString() || `RMA-${Date.now()}`,
    orderId: (apiRma.orderId || apiRma.fkOrderId)?.toString(),
    items: (apiRma.items || []).map((item: any): InboundItem => ({
        itemId: String(item.id || item.rmaDetailId || `${apiRma.id}-${item.productId}`),
        recordId: String(apiRma.id || apiRma.rmaId),
        productId: (item.productId || item.fkProductId)?.toString(),
        quantity: Number(item.quantity) || 0,
    })),
    reason: apiRma.reason as RMAReason,
    preferredResolution: apiRma.preferredResolution as RMAResolution,
    detailedDescription: apiRma.detailedDescription,
    photos: apiRma.photos,
    contactPhone: apiRma.contactPhone,
    status: apiRma.status as RMAStatus,
    createdAt: apiRma.createdAt || new Date().toISOString(),
    priority: apiRma.priority || 'Medium',
    refundAmount: Number(apiRma.refundAmount) || 0,
});

const mapRmaToApiPayload = (rma: Partial<RMA>) => {
    const parseNumericId = (idString: string | undefined | null): number => {
        if (!idString) return 0;
        const num = parseInt(idString.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    };

    const payloadId = parseNumericId(rma.id);

    return {
        id: payloadId,
        orderId: parseNumericId(rma.orderId),
        reason: rma.reason,
        preferredResolution: rma.preferredResolution,
        detailedDescription: rma.detailedDescription || '',
        photos: rma.photos || [],
        contactPhone: rma.contactPhone || '',
        status: rma.status,
        priority: rma.priority || 'Medium',
        refundAmount: rma.refundAmount || 0,
        items: (rma.items || []).map(item => ({
            productId: parseNumericId(item.productId),
            quantity: item.quantity,
        })),
    };
};

const mapRmaToApiCreatePayload = (rma: Partial<RMA>) => {
    const parseNumericId = (idString: string | undefined | null): number => {
        if (!idString) return 0;
        const num = parseInt(idString.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    };

    return {
      id: 0,
      orderId: parseNumericId(rma.orderId),
      reason: rma.reason,
      preferredResolution: rma.preferredResolution,
      status: rma.status || "Pending Review",
      priority: rma.priority || 'Medium',
      items: (rma.items || []).map(item => ({
        productId: parseNumericId(item.productId),
        quantity: item.quantity
      }))
    };
};

// --- Getters ---
export const getOrders = async (): Promise<Order[]> => {
    try {
        const response = await apiClient.get<any>('/Order/GetAll');
        
        if (response && (response.status === 'success' || response.success === 'success' || response.success === true) && Array.isArray(response.data)) {
            return response.data.filter(Boolean).map(mapOrderFromAPI);
        }
        
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0 && typeof response.data[0].data === 'string') {
            try {
                const ordersData = JSON.parse(response.data[0].data);
                if (Array.isArray(ordersData)) {
                    return ordersData.filter(Boolean).map(mapOrderFromAPI);
                }
            } catch (e) {
                console.error("Failed to parse nested orders JSON string:", response.data[0].data, e);
                throw new Error("Received malformed order data from the server.");
            }
        }

        if (response && Array.isArray(response.data)) {
            return response.data.filter(Boolean).map(mapOrderFromAPI);
        }

        if (Array.isArray(response)) {
            return response.filter(Boolean).map(mapOrderFromAPI);
        }

        console.error("Unexpected API response structure for getOrders. Response:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch orders:", error);
        throw error;
    }
};

export const getOrderByIdAPI = async (orderId: string): Promise<Order> => {
    try {
        const numericId = parseInt(orderId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid Order ID format: ${orderId}`);
        }
        const response = await apiClient.get<any>(`/Order/GetById?id=${numericId}`);
        const responseData = response.data || response;

        if (Array.isArray(responseData) && responseData.length > 0) {
            return mapOrderFromAPI(responseData[0]);
        }
        
        if (!responseData || !(responseData.orderid || responseData.orderId || responseData.id)) {
            throw new Error('Order not found or invalid response from API.');
        }
        return mapOrderFromAPI(responseData);
    } catch (error) {
        console.error(`Failed to fetch order with ID ${orderId}:`, error);
        throw error;
    }
};

export const getRmas = async (): Promise<RMA[]> => {
    try {
        const response = await apiClient.get<any>('/Rma/GetAll');

        // Broadened success check to include status or success keys
        const isSuccess = response && (response.success === 'success' || response.status === 'success' || response.success === true);

        if (isSuccess && Array.isArray(response.data)) {
            const groupedRmas = response.data.reduce((acc: Record<string, RMA>, record: any) => {
                // Header ID resolution
                const rmaId = String(record.rmaId || record.id || record.fkRmaId);
                
                if (!acc[rmaId]) {
                    const priority: 'Low' | 'Medium' | 'High' = ['Low', 'Medium', 'High'].includes(record.priority) ? record.priority : 'Medium';

                    acc[rmaId] = {
                        id: rmaId,
                        orderId: String(record.orderId || record.fkOrderId),
                        reason: record.reason as RMAReason || 'Other',
                        preferredResolution: record.preferredResolution as RMAResolution || 'Store Credit',
                        detailedDescription: record.detailedDescription || undefined,
                        contactPhone: record.contactPhone || undefined,
                        status: record.status as RMAStatus || 'Pending Review',
                        createdAt: record.createdAt || record.createdOn || new Date().toISOString(),
                        priority: priority,
                        refundAmount: Number(record.refundAmount) || 0,
                        photos: [],
                        items: [],
                    };
                }

                const productId = record.productId || record.fkProductId;
                const rmaItemId = record.rmaItemId || record.id; // Fallback if record.id is the detail PK

                if (productId && productId !== "0" && record.quantity > 0) {
                    const cleanProductId = String(productId);
                    // Deduplicate items using productId within the group
                    if (!acc[rmaId].items.some(item => item.productId === cleanProductId)) {
                        acc[rmaId].items.push({
                            productId: cleanProductId,
                            quantity: Number(record.quantity),
                            itemId: String(rmaItemId),
                            recordId: rmaId,
                        });
                    }
                }
                
                return acc;
            }, {});

            return Object.values(groupedRmas);
        }

        console.error("Unexpected API response structure for getRmas or failed request:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch RMAs:", error);
        throw error;
    }
};

// --- Mutations ---
export const addOrderAPI = async (
    order: Omit<Order, 'id'|'status'|'createdAt'|'updatedAt'>
): Promise<Order> => {
    const totalAmount = order.items.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0);

    const orderData = {
        id: 0,
        customerId: 0,
        customerName: order.customerName,
        customerEmail: order.customerEmail || '',
        customerPhone: order.customerPhone || '',
        shippingAddress: order.shippingAddress || {
            address1: '',
            address2: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India',
        },
        status: 'Pending',
        priority: order.priority,
        notes: order.notes,
        totalAmount: totalAmount,
        items: order.items.map(item => ({
            productId: parseInt(item.productId.replace(/[^0-9]/g, ''), 10),
            quantity: item.quantity,
            price: item.price,
        })),
    };

    const payload = {
        orderManagement: {
            orders: [orderData],
        }
    };

    const response = await apiClient.post<any>('/Order/Create', payload);
    const responseData = response.data || response;

    let createdApiOrder;
    if (response && (response.status === 'success' || response.success === 'success') && Array.isArray(response.data) && response.data.length > 0) {
        createdApiOrder = response.data[0];
    } else if (Array.isArray(responseData) && responseData.length > 0) {
        createdApiOrder = responseData[0];
    } else if (responseData.orderId || responseData.id) {
        createdApiOrder = responseData;
    } else {
        const now = new Date().toISOString();
        createdApiOrder = { 
            ...orderData, 
            id: `ORD-${Date.now()}`,
            createdAt: now,
            updatedAt: now
        };
    }
    
    return mapOrderFromAPI(createdApiOrder);
};


export const updateOrderStatusAPI = async (
    orderToUpdate: Order
): Promise<Order> => {
    const fullOrderPayload = mapOrderToAPIPayload(orderToUpdate);
    
    const payload = {
        orderManagement: {
            orders: [fullOrderPayload],
            pickLists: [],
            packedOrders: [],
            rmAs: []
        }
    };
    
    const response = await apiClient.put<any>('/Order/update', payload);
    const responseData = response.data || response;

    // Use confirmed data from server if available
    const returnedOrder = responseData?.orderManagement?.orders?.[0] || responseData;
    if (returnedOrder && (returnedOrder.orderId || returnedOrder.id)) {
        return mapOrderFromAPI(returnedOrder);
    }
    
    // If simple success but no object, return current object with status updated to signal UI success
    if (responseData && (responseData.status === 'success' || responseData.success === 'success' || responseData.success === true)) {
        return orderToUpdate;
    }

    throw new Error("API call succeeded but the response was not in a recognized format.");
};

export const createPickListAPI = async (
    order: Order, 
    item: PickListItem,
    userId: string
): Promise<void> => {
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
        throw new Error('Invalid User ID for creating picklist.');
    }

    const numericLocationId = parseInt(item.locationId.replace(/[^0-9]/g, ''), 10);
     if (isNaN(numericLocationId)) {
        throw new Error(`Invalid Location ID for product ${item.productId}.`);
    }

    const now = new Date().toISOString();

    const payload = {
        master: {
            id: 0,
            orderId: order.id,
            status: 'Ready for Pickup',
            pickerId: numericUserId,
            pickDate: now,
            locationId: numericLocationId,
            createdOn: now,
            createdBy: numericUserId,
            modifiedOn: now,
            modifiedBy: numericUserId,
            isActive: 0,
            isArchived: 0
        },
        detail: {
            productId: item.productId,
            quantity: item.quantity
        }
    };

    await apiClient.post<void>('/Picklist/Create', payload);
};


export const updateRmaAPI = async (rma: Partial<RMA>): Promise<RMA> => {
    const apiPayload = mapRmaToApiPayload(rma);
    
    const response = await apiClient.put<any>('/Rma/update', apiPayload);
    const responseData = response.data || response;

    let updatedApiRma;
    if (Array.isArray(responseData) && responseData.length > 0) {
        updatedApiRma = responseData[0];
    } else {
        updatedApiRma = responseData;
    }
    
    if (!updatedApiRma || !(updatedApiRma.id || updatedApiRma.rmaId)) {
        return { ...rma, id: rma.id || `temp-${Date.now()}` } as RMA;
    }
    
    return mapRmaFromAPI(updatedApiRma);
};

export const createRmaAPI = async (
    rmaData: Omit<RMA, 'id' | 'status' | 'createdAt' | 'refundAmount'>,
): Promise<RMA> => {
    const apiPayload = mapRmaToApiCreatePayload({
        ...rmaData,
        status: 'Pending Review',
    });
    
    const response = await apiClient.post<any>('/Rma/Create', apiPayload);
    const responseData = response.data || response;

    let createdApiRma = Array.isArray(responseData) ? responseData[0] : responseData;
    
    if (!createdApiRma || !(createdApiRma.id || createdApiRma.rmaId)) {
       const now = new Date().toISOString();
       return {
           ...rmaData,
           id: `temp-${Date.now()}`,
           status: 'Pending Review',
           createdAt: now,
           refundAmount: 0
       } as RMA;
    }

    return mapRmaFromAPI(createdApiRma);
};

export const deleteOrderAPI = (orderId: string): Promise<null> => {
    const numericId = parseInt(orderId.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numericId)) {
        return Promise.reject(new Error("Invalid Order ID format for deletion."));
    }
    return apiClient.delete(`/Order/Delete?orderId=${numericId}`);
};