
import { CycleCount, CycleCountItem, Stock, AdjustmentType, PickList, PackedOrder, Order } from '../../types';
import { mockCycleCounts, getNextCycleCountId, getNextCycleCountItemId, mockPickLists, mockPackedOrders } from '../../data/mockData';

// Simulate API delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const getMockCycleCounts = async (): Promise<CycleCount[]> => {
    await delay(300);
    return JSON.parse(JSON.stringify(mockCycleCounts)); // Deep copy to prevent mutation
};

export const createMockCycleCount = async (
    itemsToCount: { productId: string, locationId: string }[],
    stocks: Stock[]
): Promise<CycleCount> => {
    await delay(500);
    const newItems: CycleCountItem[] = itemsToCount.map(item => {
        const stock = stocks.find(s => s.productId === item.productId && s.locationId === item.locationId);
        return {
            id: getNextCycleCountItemId(),
            productId: item.productId,
            locationId: item.locationId,
            systemQuantity: stock?.quantity || 0,
            countedQuantity: null,
            countedAt: null,
        };
    });

    const newCycleCount: CycleCount = {
        id: getNextCycleCountId(),
        items: newItems,
        createdAt: new Date().toISOString(),
        status: 'In Progress',
    };
    
    mockCycleCounts.unshift(newCycleCount);
    return JSON.parse(JSON.stringify(newCycleCount));
};

export const updateMockCycleCount = async (
    cycleCountId: string,
    itemId: string,
    countedQuantity: number
): Promise<CycleCount | undefined> => {
    await delay(200);
    const ccIndex = mockCycleCounts.findIndex(cc => cc.id === cycleCountId);
    if (ccIndex > -1) {
        const itemIndex = mockCycleCounts[ccIndex].items.findIndex(item => item.id === itemId);
        if (itemIndex > -1) {
            mockCycleCounts[ccIndex].items[itemIndex].countedQuantity = countedQuantity;
            mockCycleCounts[ccIndex].items[itemIndex].countedAt = new Date().toISOString();

            // Check if all items are counted to update status
            const allCounted = mockCycleCounts[ccIndex].items.every(item => item.countedQuantity !== null);
            if (allCounted) {
                mockCycleCounts[ccIndex].status = 'Completed';
            }
            return JSON.parse(JSON.stringify(mockCycleCounts[ccIndex]));
        }
    }
    return undefined;
};


export const finalizeMockCycleCount = async (
    cycleCountId: string,
): Promise<{ updatedCycleCount: CycleCount; adjustments: any[] } | undefined> => {
    await delay(500);
    const ccIndex = mockCycleCounts.findIndex(cc => cc.id === cycleCountId);
    if (ccIndex > -1) {
        const cycleCount = mockCycleCounts[ccIndex];
        if (cycleCount.status !== 'Completed') {
            throw new Error("Cannot finalize a count that is not yet completed.");
        }
        
        const adjustments: any[] = [];
        cycleCount.items.forEach(item => {
            const variance = (item.countedQuantity ?? 0) - item.systemQuantity;
            if (variance !== 0) {
                adjustments.push({
                    productId: item.productId,
                    locationId: item.locationId,
                    quantity: Math.abs(variance),
                    type: variance > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE,
                    reason: `Cycle Count #${cycleCount.id}`,
                });
            }
        });

        cycleCount.status = 'Adjusted';
        
        return {
            updatedCycleCount: JSON.parse(JSON.stringify(cycleCount)),
            adjustments,
        };
    }
    return undefined;
};

export const getMockPickLists = async (): Promise<PickList[]> => {
    await delay(300);
    return JSON.parse(JSON.stringify(mockPickLists));
};

export const getMockPackedOrders = async (): Promise<PackedOrder[]> => {
    await delay(300);
    return JSON.parse(JSON.stringify(mockPackedOrders));
};

export const updateMockPickStatus = async (pickListId: string, productId: string, picked: boolean): Promise<PickList | undefined> => {
    await delay(100);
    const list = mockPickLists.find(pl => pl.id === pickListId);
    if (!list) return undefined;

    const item = list.items.find(i => i.productId === productId);
    if (!item) return undefined;

    item.picked = picked;

    const allPicked = list.items.every(i => i.picked);
    if (allPicked) {
        list.status = 'Picked';
    } else {
        list.status = 'In Progress';
    }

    return JSON.parse(JSON.stringify(list));
};

export const packMockOrder = async (pickListId: string): Promise<{ newPackedOrder: PackedOrder; updatedOrder: Partial<Order> }> => {
    await delay(400);
    const listIndex = mockPickLists.findIndex(pl => pl.id === pickListId);
    if (listIndex === -1) throw new Error("Pick list not found");
    
    const pickList = mockPickLists[listIndex];
    if (pickList.status !== 'Picked') throw new Error("Order is not fully picked yet.");

    // Create new packed order
    const newPackedOrder: PackedOrder = {
        id: `po-${Date.now()}`,
        orderId: pickList.orderId,
        items: pickList.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            locationId: item.locationId,
        })),
        packedAt: new Date().toISOString(),
        status: 'Packed'
    };
    mockPackedOrders.push(newPackedOrder);

    // Remove picklist from active lists
    mockPickLists.splice(listIndex, 1);
    
    // Create a partial updated order to simulate response
    const updatedOrder: Partial<Order> = {
        id: pickList.orderId,
        status: 'Ready for Pickup'
    };
    
    return { newPackedOrder: JSON.parse(JSON.stringify(newPackedOrder)), updatedOrder };
};

export const shipMockOrder = async (packedOrderId: string, userId: string): Promise<{ updatedPackedOrder: PackedOrder; updatedOrder: Partial<Order> }> => {
    await delay(400);
    const orderIndex = mockPackedOrders.findIndex(po => po.id === packedOrderId);
    if (orderIndex === -1) throw new Error("Packed order not found");
    
    const packedOrder = mockPackedOrders[orderIndex];
    packedOrder.status = 'Shipped';
    packedOrder.shippedAt = new Date().toISOString();

    const updatedOrder: Partial<Order> = {
        id: packedOrder.orderId,
        status: 'Shipped'
    };
    
    return { updatedPackedOrder: JSON.parse(JSON.stringify(packedOrder)), updatedOrder };
};
