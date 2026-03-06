
import { CycleCount, CycleCountItem, PickList, PackedOrder } from '../types';

let nextCycleCountId = 3;
let nextCycleCountItemId = 100;

export let mockCycleCounts: CycleCount[] = [
  {
    id: 'cc-1',
    items: [
      { id: 'cci-1', productId: 'p1', locationId: 'loc-1', systemQuantity: 100, countedQuantity: 98, countedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'cci-2', productId: 'p2', locationId: 'loc-2', systemQuantity: 50, countedQuantity: 50, countedAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'Adjusted',
  },
  {
    id: 'cc-2',
    items: [
      { id: 'cci-3', productId: 'p3', locationId: 'loc-3', systemQuantity: 25, countedQuantity: null, countedAt: null },
      { id: 'cci-4', productId: 'p4', locationId: 'loc-4', systemQuantity: 75, countedQuantity: 75, countedAt: new Date().toISOString() },
      { id: 'cci-5', productId: 'p5', locationId: 'loc-5', systemQuantity: 120, countedQuantity: null, countedAt: null },
    ],
    createdAt: new Date().toISOString(),
    status: 'In Progress',
  },
];

export let mockPickLists: PickList[] = [
    {
        id: 'pl-1',
        orderId: 'ord-101',
        items: [
            { productId: 'p1', quantity: 2, locationId: 'loc-1', picked: true },
            { productId: 'p3', quantity: 1, locationId: 'loc-3', picked: true },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'Picked',
    },
    {
        id: 'pl-2',
        orderId: 'ord-102',
        items: [
            { productId: 'p2', quantity: 5, locationId: 'loc-2', picked: false },
            { productId: 'p4', quantity: 3, locationId: 'loc-4', picked: true },
        ],
        createdAt: new Date().toISOString(),
        status: 'In Progress',
    },
    {
        id: 'pl-3',
        orderId: 'ord-103',
        items: [
            { productId: 'p5', quantity: 10, locationId: 'loc-5', picked: false },
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'Pending',
    }
];

export let mockPackedOrders: PackedOrder[] = [
    {
        id: 'po-1',
        orderId: 'ord-104',
        items: [
            { productId: 'p1', quantity: 1, locationId: 'loc-1' },
            { productId: 'p2', quantity: 1, locationId: 'loc-2' },
        ],
        packedAt: new Date(Date.now() - 7200000).toISOString(),
        status: 'Packed',
    }
];

// Helper to get next IDs
export const getNextCycleCountId = () => `cc-${nextCycleCountId++}`;
export const getNextCycleCountItemId = () => `cci-${nextCycleCountItemId++}`;
