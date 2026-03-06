import { 
        InboundShipment, Stock, PurchaseOrder, PickListItem, PickList, Order, OrderStatus, PackedOrder, CycleCountItem, CycleCount, StockMovement, User, PackedOrderItem, PurchaseOrderItem, ReceiveShipmentPayload, UpdatePutAwayPayload, ReceiveShipmentData,
        InProgressPutAwayItem, InboundItem
    } from '../types';
    import { apiClient } from './apiClient';

    // Helper to handle API responses that may or may not be nested in a `data` property.
    const unwrapData = (response: any) => response?.data || response;

    // Helper to safely parse string IDs to numbers, consistent with other API modules.
    const parseNumericId = (idString: string | undefined | null): number => {
        if (!idString) return 0;
        const num = parseInt(idString.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
    };

    const mapCycleCountStatus = (apiStatus: string): CycleCount['status'] => {
        const lowerStatus = (apiStatus || '').toLowerCase();
        if (lowerStatus.includes('in progress') || lowerStatus.includes('inprogress')) return 'In Progress';
        if (lowerStatus.includes('completed')) return 'Completed';
        if (lowerStatus.includes('adjusted')) return 'Adjusted';
        if (lowerStatus.includes('pending')) return 'Pending';
        return 'Pending';
    };

    const mapCycleCountFromAPI = (apiCycleCount: any): CycleCount => {
        const master = apiCycleCount.master || apiCycleCount;
        const rawDetails = apiCycleCount.details || apiCycleCount.items || [];
        const status = mapCycleCountStatus(master.Status || master.status);
        const isFinished = status === 'Completed' || status === 'Adjusted';
        
        let items: CycleCountItem[] = [];
        const jsonStr = master.itemsJson || apiCycleCount.itemsJson;
        if (typeof jsonStr === 'string' && jsonStr.length > 2) {
            try {
                const parsedItems = JSON.parse(jsonStr);
                if (Array.isArray(parsedItems)) {
                    items = parsedItems.map((item: any): CycleCountItem => {
                        const sysQty = Number(item.SystemQuantity || item.systemQuantity || 0);
                        let countedQty: number | null = null;
                        if (item.CountedQuantity !== null && item.CountedQuantity !== undefined) {
                            countedQty = Number(item.CountedQuantity);
                        } else if (item.countedQuantity !== null && item.countedQuantity !== undefined) {
                            countedQty = Number(item.countedQuantity);
                        }
                        if (isFinished && countedQty === null) countedQty = sysQty;
                        return {
                            id: String(item.CycleCountItemId || item.cycleCountItemId || item.id || `temp-${Math.random()}`),
                            productId: String(item.ProductId || item.productId),
                            locationId: String(item.LocationId || item.locationId),
                            systemQuantity: sysQty,
                            countedQuantity: countedQty,
                            countedAt: item.CountedAt || item.countedAt || item.ModifiedOn || item.modifiedOn || null,
                        };
                    });
                }
            } catch (e) { console.error(`Failed to parse itemsJson`, e); }
        } 
        
        if (items.length === 0 && Array.isArray(rawDetails)) {
            items = rawDetails.map((item: any): CycleCountItem => {
                const sysQty = Number(item.SystemQuantity || item.systemQuantity || 0);
                let countedQty: number | null = (item.CountedQuantity !== null && item.CountedQuantity !== undefined) 
                    ? Number(item.CountedQuantity) 
                    : (item.countedQuantity !== null && item.countedQuantity !== undefined) ? Number(item.countedQuantity) : null;
                if (isFinished && countedQty === null) countedQty = sysQty;
                return {
                    id: String(item.CycleCountItemID || item.cycleCountItemId || item.id || `temp-${Math.random()}`),
                    productId: String(item.ProductID || item.productId),
                    locationId: String(item.LocationID || item.locationId),
                    systemQuantity: sysQty,
                    countedQuantity: countedQty,
                    countedAt: item.CountedAt || item.countedAt || null,
                };
            });
        }
        
        const cycleCountId = master.CycleCountID || master.cycleCountId || apiCycleCount.id || apiCycleCount.pkCycleCountId;
        const idStr = cycleCountId ? String(cycleCountId) : `temp-${Date.now()}`;

        return { id: idStr, status: status, createdAt: master.CreatedAt || master.createdAt || master.createdOn || new Date().toISOString(), items: items };
    };

    const mapPackedOrderFromAPI = (apiOrder: any): PackedOrder => ({
        id: String(apiOrder.id),
        orderId: String(apiOrder.orderId),
        items: Array.isArray(apiOrder.items) ? apiOrder.items.map((item: any): PackedOrderItem => ({
            productId: String(item.productId),
            quantity: Number(item.quantity),
            locationId: String(apiOrder.locationId),
        })) : [],
        packedAt: apiOrder.packedAt || apiOrder.modifiedOn || new Date().toISOString(),
        shippedAt: apiOrder.shippedAt,
        status: apiOrder.status as 'Packed' | 'Shipped',
    });


    // --- Getters ---

    export const getPutAwayRecordsAPI = async (): Promise<InboundShipment[]> => {
        try {
            const response = await apiClient.get<any[]>('/warehouse-management/put-away/all');
            const records = unwrapData(response);
            if (!Array.isArray(records)) return [];
            
            const filteredRecords = records.filter(record => {
                const status = (record.status || '').toLowerCase();
                return status === 'received' || status === 'partially received';
            });
            
            const groupedShipments = filteredRecords.reduce((acc: Record<string, InboundShipment>, record: any) => {
                const poId = String(record.purchaseOrderId);
                if (!acc[poId]) {
                    const rawStatus = (record.status || '').toLowerCase();
                    let status: InboundShipment['status'] = 'Received';
                    if (rawStatus === 'partially received') status = 'Partially Received';
                    acc[poId] = { id: poId, purchaseOrderId: poId, items: [], receivedAt: record.receivedOn, status: status, receivedByUserId: String(record.userId) };
                }
                if (Array.isArray(record.items) && record.items.length > 0) {
                    record.items.forEach((subItem: any) => {
                        if (Number(subItem.quantity || 0) > 0) {
                            acc[poId].items.push({ itemId: String(subItem.id), productId: String(subItem.productId), quantity: Number(subItem.quantity || 0), recordId: String(record.id) });
                        }
                    });
                } else if (record.productId && typeof record.quantity !== 'undefined') {
                    if (Number(record.quantity || 0) > 0) {
                        acc[poId].items.push({ itemId: String(record.id), productId: String(record.productId), quantity: Number(record.quantity || 0), recordId: String(record.id) });
                    }
                }
                return acc;
            }, {});
            return Object.values(groupedShipments);
        } catch (error) { console.error("Failed to fetch put-away records:", error); throw error; }
    };

    export const getPickLists = async (): Promise<PickList[]> => {
        try {
            const response = await apiClient.get<any[]>('/Picklist');
            let rawPickLists = unwrapData(response);
            if (!Array.isArray(rawPickLists)) return [];
            rawPickLists = rawPickLists.filter(list => list.status !== 'Packed' && list.status !== 'Shipped');
            return rawPickLists.map((apiList: any): PickList => {
                const pickListId = (apiList.id || apiList.pickListId)?.toString();
                const items: PickListItem[] = Array.isArray(apiList.items)
                    ? apiList.items.map((item: any) => ({
                        productId: item.productId?.toString(),
                        quantity: Number(item.quantity) || 0,
                        locationId: apiList.locationId?.toString(),
                        picked: !!item.isPicked || false,
                    }))
                    : [];
                return { id: pickListId, orderId: apiList.orderId?.toString(), status: apiList.status || 'Pending', createdAt: apiList.createdAt || apiList.createdOn || new Date().toISOString(), items: items };
            });
        } catch (error) { console.error("Failed to fetch pick lists:", error); throw error; }
    };

    export const getPackedOrders = async (): Promise<PackedOrder[]> => {
        const response = await apiClient.get<any[]>('/Picklist');
        const data = unwrapData(response);
        if (Array.isArray(data)) {
            const packedAndShipped = data.filter(item => item.status === 'Packed' || item.status === 'Shipped');
            return packedAndShipped.map(mapPackedOrderFromAPI);
        }
        return [];
    };

    export const getCycleCounts = async (): Promise<CycleCount[]> => {
        try {
            const response = await apiClient.get<any>('/warehouse-management/cyclecount/GetAll');
            const isSuccess = response && (response.success === 'success' || response.status === 'success' || response.status === 'Success' || response.success === true);
            if (isSuccess && Array.isArray(response.data)) return response.data.map(mapCycleCountFromAPI);
            if (Array.isArray(response)) return response.map(mapCycleCountFromAPI);
            return [];
        } catch (error) { console.error("Failed to fetch cycle counts:", error); throw error; }
    };


    // --- Mutations ---

    export const receiveShipmentAPI = async (shipmentData: ReceiveShipmentData): Promise<void> => {
        const payload = {
            purchaseOrderId: parseNumericId(shipmentData.purchaseOrderId),
            items: shipmentData.items.map(item => ({ productId: parseNumericId(item.productId), quantity: item.quantity })),
            receivedByUserId: parseNumericId(shipmentData.userId),
            receivedAt: new Date().toISOString(), 
            status: shipmentData.status,
        };
        await apiClient.post<void>('/warehouse-management/put-away/create', payload);
    };

    export const updateAwaitingPutAwayRecordAPI = async (data: {
        recordId: string; purchaseOrderId: string; items: { id: number; putawayId: number; productId: number; quantity: number; locationId?: number; }[];
        userId: string; status: string; receivedAt: string; locationId?: string; productId?: string; quantity?: number;
    }): Promise<void> => {
        const payload = {
            id: parseNumericId(data.recordId),
            purchaseOrderId: parseNumericId(data.purchaseOrderId),
            items: data.items.map(item => ({ id: item.id, putawayId: item.putawayId, productId: item.productId, quantity: item.quantity, locationId: item.locationId ?? 0 })),
            receivedByUserId: parseNumericId(data.userId),
            receivedAt: data.receivedAt,
            status: data.status,
            productId: data.productId ? parseNumericId(data.productId) : 0,
            quantity: data.quantity || 0,
            locationId: data.locationId ? parseNumericId(data.locationId) : 0
        };
        await apiClient.post<void>('/warehouse-management/put-away/update', payload);
    };

    export const updatePickStatusAPI = async (
        pickList: PickList, itemToUpdate: PickListItem, newPickedStatus: boolean, userId: string
    ): Promise<void> => {
        const tempUpdatedItems = pickList.items.map(item => item.productId === itemToUpdate.productId ? { ...item, picked: newPickedStatus } : item);
        const allItemsPicked = tempUpdatedItems.every(item => item.picked);
        const newStatus = allItemsPicked ? 'Picked' : 'In Progress';
        const payload = { id: parseNumericId(pickList.id), orderId: pickList.orderId, status: newStatus, pickerId: parseNumericId(userId), pickDate: new Date().toISOString(), locationId: parseNumericId(itemToUpdate.locationId), modifiedOn: new Date().toISOString(), modifiedBy: parseNumericId(userId), isActive: 1, isArchived: 0, item: { productId: itemToUpdate.productId, quantity: itemToUpdate.quantity } };
        await apiClient.put<void>('/Picklist/update', payload);
    };

    export const packOrderAPI = async (pickList: PickList): Promise<{ newPackedOrder: PackedOrder; updatedOrder: Partial<Order> }> => {
        if (!pickList || !pickList.id) throw new Error("Invalid or missing PickList");
        if (pickList.status !== 'Picked') throw new Error("Order not fully picked");
        const payload = { id: parseNumericId(pickList.id), status: "Packed" };
        const response = await apiClient.put<any>(`/Picklist/pack`, payload);
        const data = unwrapData(response);

        // Normalize backend confirmation
        const confirmedStatus = (data?.status || '').toString().toLowerCase();
        if (confirmedStatus !== 'packed') throw new Error("Backend did not confirm packing");

        const newPackedOrder: PackedOrder = {
            id: pickList.id, orderId: pickList.orderId, packedAt: new Date().toISOString(), status: 'Packed',
            items: pickList.items.map(item => ({ productId: item.productId, quantity: item.quantity, locationId: item.locationId })),
        };
        const updatedOrder: Partial<Order> = { id: pickList.orderId, status: 'Ready for Pickup' };
        return { newPackedOrder, updatedOrder };
    };

    export const shipOrderAPI = async (packedOrder: PackedOrder, userId: string): Promise<{ updatedPackedOrder: PackedOrder; updatedOrder: Partial<Order> }> => {
        if (!packedOrder || !packedOrder.id) throw new Error("Invalid packed order");
        const payload = { id: parseNumericId(packedOrder.id), status: "Shipped" };
        const response = await apiClient.put<any>(`/Picklist/pack`, payload);

        let dataWithStatus;
        if (response?.status === 'success' && response.data?.status === 'Shipped') dataWithStatus = response.data;
        else if ((response?.status === 'success' || response?.success === 'success') && Array.isArray(response.data) && response.data[0]?.status === 'Shipped') dataWithStatus = response.data[0];
        else if (response?.status === 'Shipped') dataWithStatus = response;
        else if (Array.isArray(response) && response[0]?.status === 'Shipped') dataWithStatus = response[0];

        if (!dataWithStatus) {
            // Check lowercase/normalized if explicit check fails
            const rawResponse = unwrapData(response);
            const confirmedStatus = (Array.isArray(rawResponse) ? rawResponse[0]?.status : rawResponse?.status || '').toString().toLowerCase();
            if (confirmedStatus !== 'shipped') throw new Error("Backend did not confirm shipping");
            dataWithStatus = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse;
        }
        
        const updatedPackedOrder: PackedOrder = { ...packedOrder, status: 'Shipped', shippedAt: dataWithStatus.modifiedOn || new Date().toISOString() };
        const updatedOrder: Partial<Order> = { id: packedOrder.orderId, status: 'Shipped' };
        return { updatedPackedOrder, updatedOrder };
    };

    export const createCycleCountAPI = async ({ itemsToCount, stocks, userId }: { itemsToCount: {productId: string, locationId: string}[], stocks: Stock[], userId: string }): Promise<CycleCount> => {
        const now = new Date().toISOString();
        const numericUserId = parseNumericId(userId);
        const payload = { master: { status: "In Progress", createdByUserId: numericUserId, createdAt: now, modifiedByUserId: numericUserId, modifiedOn: now, completedAt: null, isActive: true }, details: itemsToCount.map(item => { const stock = stocks.find(s => s.productId === item.productId && s.locationId === item.locationId); return { cycleCountId: 0, productId: parseNumericId(item.productId), locationId: parseNumericId(item.locationId), systemQuantity: stock?.quantity || 0, countedQuantity: null, countedAt: null, countedByUserId: numericUserId, isActive: true }; }) };
        const response = await apiClient.post<any>('/warehouse-management/cyclecount/create', payload);
        const data = unwrapData(response);
        if (data && (data.status === 'Success' || data.status === 'success') && data.id) {
            const newCycleCountId = String(data.id);
            return { id: newCycleCountId, status: 'In Progress', createdAt: payload.master.createdAt, items: payload.details.map((detail, index) => ({ id: `temp-cci-${newCycleCountId}-${index}`, productId: String(detail.productId), locationId: String(detail.locationId), systemQuantity: detail.systemQuantity, countedQuantity: null, countedAt: null })) };
        }
        if (data && (data.master?.cycleCountId || data.cycleCountId)) return mapCycleCountFromAPI(data);
        throw new Error("Creation failed");
    };

    export const saveCycleCountAPI = async ({ cycleCount, updatedQuantities, userId }: { cycleCount: CycleCount; updatedQuantities: Record<string, number>; userId: string; }): Promise<CycleCount> => {
        const now = new Date().toISOString();
        const numericUserId = parseNumericId(userId);
        let allItemsHaveCount = true;
        const updatedItemsForPayload = cycleCount.items.map(item => {
            const newCount = updatedQuantities[item.id];
            const hasNewCount = newCount !== undefined;
            const finalCountedQuantity = hasNewCount ? (isNaN(newCount) ? null : newCount) : item.countedQuantity;
            if (finalCountedQuantity === null) allItemsHaveCount = false;
            return { cycleCountItemId: parseNumericId(item.id), cycleCountId: parseNumericId(cycleCount.id), productId: parseNumericId(item.productId), locationId: parseNumericId(item.locationId), systemQuantity: item.systemQuantity, countedQuantity: finalCountedQuantity, countedAt: hasNewCount ? now : item.countedAt, countedByUserId: numericUserId, isActive: true };
        });
        const newStatus = allItemsHaveCount ? "Completed" : "In Progress";
        const payload = { cycleCountId: parseNumericId(cycleCount.id), status: newStatus, createdByUserId: 0, createdAt: cycleCount.createdAt, modifiedByUserId: numericUserId, modifiedOn: now, completedAt: allItemsHaveCount ? now : null, isActive: true, items: updatedItemsForPayload };
        await apiClient.put<any>('/warehouse-management/cyclecount/update', payload);
        return { id: String(payload.cycleCountId), status: payload.status as CycleCount['status'], createdAt: payload.createdAt, items: payload.items.map(item => ({ id: String(item.cycleCountItemId), productId: String(item.productId), locationId: String(item.locationId), systemQuantity: item.systemQuantity, countedQuantity: item.countedQuantity, countedAt: item.countedAt })) };
    };

    export const finalizeCycleCountAPI = async ({ cycleCountId, status, userId }: { cycleCountId: string, status: CycleCount['status'], userId: string }): Promise<void> => {
        const payload = { cycleCountId: parseNumericId(cycleCountId), status: status, createdByUserID: parseNumericId(userId) };
        await apiClient.put<any>('/warehouse-management/cyclecount/Finalized', payload);
    };

    export const getAllPutAwayRecordsAPI = async (): Promise<InProgressPutAwayItem[]> => {
        try {
            const response = await apiClient.get<any>('/warehouse-management/put-away/all');
            const records = unwrapData(response);
            if (!Array.isArray(records)) return [];
            return records.flatMap((record: any) => {
                if (record.items && Array.isArray(record.items) && record.items.length > 0) {
                    return record.items.map((item: any): InProgressPutAwayItem => ({ id: String(item.id), putawayId: String(record.id), purchaseOrderId: String(record.purchaseOrderId), productId: String(item.productId), quantity: Number(item.quantity || 0), locationId: String(item.locationId ?? record.locationId ?? ''), receivedAt: record.receivedOn || record.receivedAt || new Date().toISOString(), completedAt: (record.status || '').toLowerCase().includes('complete') ? (record.modifiedOn || record.receivedOn) : undefined, status: record.status as any, userId: String(record.userId) }));
                } else if (record.productId && typeof record.quantity !== 'undefined') {
                    return [{ id: String(record.id), putawayId: String(record.id), purchaseOrderId: String(record.purchaseOrderId), productId: String(record.productId), quantity: Number(record.quantity || 0), locationId: String(record.locationId), receivedAt: record.receivedOn || record.receivedAt || new Date().toISOString(), completedAt: (record.status || '').toLowerCase().includes('complete') ? (record.modifiedOn || record.receivedOn) : undefined, status: record.status as any, userId: String(record.userId) }];
                }
                return [];
            });
        } catch (error) { console.error("Failed to fetch all put-away records:", error); throw error; }
    };

    export const finalizePutAwayAPI = (item: InProgressPutAwayItem, finalizerUserId: string) => {
        const payload = { id: parseNumericId(item.putawayId), purchaseOrderId: parseNumericId(item.purchaseOrderId), items: [{ id: parseNumericId(item.id), putawayId: parseNumericId(item.putawayId), productId: parseNumericId(item.productId), quantity: item.quantity, locationId: parseNumericId(item.locationId) }], receivedByUserId: parseNumericId(item.userId), receivedAt: item.receivedAt, status: "Completed", productId: parseNumericId(item.productId), quantity: item.quantity, locationId: parseNumericId(item.locationId) };
        return apiClient.post<any>('/warehouse-management/put-away/update', payload);
    };

    export const createPutAwayInProgressRecordAPI = (): Promise<void> => {
        throw new Error("Deprecated");
    };
