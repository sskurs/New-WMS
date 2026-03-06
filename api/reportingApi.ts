import { StockMovement, StockMovementType, AdjustmentType, CycleCount, InProgressPutAwayItem } from '../types';
import { getStockAdjustmentsAPI } from './inventoryApi';
import { getPutAwayRecordsAPI, getPackedOrders, getCycleCounts, getAllPutAwayRecordsAPI } from './operationsApi';
import { getSupplierReturnsAPI } from './suppliersApi';

export const getStockMovements = async (): Promise<StockMovement[]> => {
    try {
        // Fetch data from all relevant sources in parallel for a complete ledger
        const [adjustments, inboundAwaiting, packedOrders, cycleCounts, allPutAway, supplierReturns] = await Promise.all([
            getStockAdjustmentsAPI(),
            getPutAwayRecordsAPI(),
            getPackedOrders(),
            getCycleCounts(),
            getAllPutAwayRecordsAPI(),
            getSupplierReturnsAPI('all') // Fetch all returns including settled ones
        ]);

        const movements: StockMovement[] = [];

        // 1. Process Manual Stock Adjustments
        adjustments.forEach(adj => {
            movements.push({
                id: `adj-${adj.id}`,
                productId: adj.productId,
                locationId: adj.locationId || null, 
                quantityChange: adj.type === AdjustmentType.INCREASE ? adj.quantity : -adj.quantity,
                type: 'Stock Adjustment',
                referenceId: adj.id,
                timestamp: adj.createdAt,
                userId: adj.userId
            });
        });

        // 2. Process Inbound Receipts (arrival at Dock)
        const handledPoItemIds = new Set<string>();

        // 3. Process All Put-Away Records (Inbound History + Internal Movements)
        allPutAway.forEach(record => {
            // Track PO item arrivals (The "Receipt" part)
            const poKey = `rcpt-${record.purchaseOrderId}-${record.productId}`;
            if (!handledPoItemIds.has(poKey)) {
                movements.push({
                    id: poKey,
                    productId: record.productId,
                    locationId: null, // Arrived at dock
                    quantityChange: record.quantity,
                    type: 'Purchase Receipt',
                    referenceId: record.purchaseOrderId,
                    timestamp: record.receivedAt,
                    userId: record.userId
                });
                handledPoItemIds.add(poKey);
            }

            // If put-away is complete, log the internal move: Dock -> Bin
            const isCompleted = record.status === 'Completed' || (record.status as string)?.toLowerCase() === 'completed';
            if (isCompleted) {
                const timestamp = record.completedAt || record.receivedAt;
                
                // DEBIT DOCK (Leaving receiving)
                movements.push({
                    id: `pa-out-${record.id}`,
                    productId: record.productId,
                    locationId: null,
                    quantityChange: -record.quantity,
                    type: 'Put Away (Out)',
                    referenceId: record.purchaseOrderId,
                    timestamp: timestamp,
                    userId: record.userId
                });

                // CREDIT BIN (Entering storage)
                movements.push({
                    id: `pa-in-${record.id}`,
                    productId: record.productId,
                    locationId: record.locationId,
                    quantityChange: record.quantity,
                    type: 'Put Away (In)',
                    referenceId: record.purchaseOrderId,
                    timestamp: timestamp,
                    userId: record.userId
                });
            }
        });

        // 4. Process Outbound Shipments (Sale Ships)
        packedOrders.forEach(order => {
            if (order.status === 'Shipped') {
                const timestamp = order.shippedAt || order.packedAt || new Date().toISOString();
                
                order.items.forEach((item, index) => {
                    movements.push({
                        id: `ship-${order.id}-${index}`,
                        productId: item.productId,
                        locationId: item.locationId,
                        quantityChange: -item.quantity, // Inventory leaving (Debit)
                        type: 'Sale Ship',
                        referenceId: order.orderId,
                        timestamp: timestamp,
                        userId: '0' 
                    });
                });
            }
        });

        // 5. Process Cycle Count Variances
        cycleCounts.forEach(cc => {
            if (cc.status === 'Adjusted' || cc.status === 'Completed') {
                cc.items.forEach(item => {
                    const sysQty = Number(item.systemQuantity || 0);
                    const countedQty = Number(item.countedQuantity ?? sysQty);
                    const variance = countedQty - sysQty;

                    if (variance !== 0) {
                        movements.push({
                            id: `cc-var-${cc.id}-${item.id}`,
                            productId: item.productId,
                            locationId: item.locationId,
                            quantityChange: variance,
                            type: 'Cycle Count Variance',
                            referenceId: cc.id,
                            timestamp: item.countedAt || cc.createdAt,
                            userId: '0'
                        });
                    }
                });
            }
        });

        // 6. Process Return to Vendor (Debits)
        supplierReturns.forEach(rtn => {
            // Inventory is deducted when return is 'Shipped' or 'Settled'
            if (rtn.status === 'Shipped' || rtn.status === 'Settled') {
                const timestamp = rtn.shippedAt || rtn.createdAt;
                
                rtn.items.forEach((item, index) => {
                    movements.push({
                        id: `rtv-${rtn.id}-${index}`,
                        productId: item.productId,
                        locationId: item.locationId || null, // Might be returning from dock or specific bin
                        quantityChange: -item.quantity, // Inventory leaving (Debit)
                        type: 'Return to Vendor',
                        referenceId: rtn.id,
                        timestamp: timestamp,
                        userId: rtn.createdByUserId
                    });
                });
            }
        });

        // Sort by timestamp descending (newest first)
        return movements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } catch (error) {
        console.error("Failed to generate stock movement report:", error);
        return [];
    }
};