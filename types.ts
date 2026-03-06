

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export interface Category {
  id:string;
  name: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Color", "Size"
  value: string; // e.g., "Red", "Large"
}

export interface Uom {
  id: string;
  unitId: number;
  name: string;
  abbreviation: string;
}

export interface PricingRule {
  id: string;
  name: string; // Corresponds to ruleName in API
  description?: string;
  priority?: string;
  minQuantity?: number;
  maxQuantity?: number;
  startDate?: string;
  endDate?: string;
  discountPercentage?: number;
  fixedPrice?: number;
  markupPercentage?: number;
  isActive: boolean;
}

export type MaterialUsed = string;
export type EnvironmentalFactor = string;
export type PackagingType = string;

export interface ProductPackaging {
  packagingId?: number;
  packagingType: PackagingType;
  uomId?: string;
  unitOfMeasure: string;
  materials: MaterialUsed[];
  environmentalFactors: EnvironmentalFactor;
  shelfLife: string;
}

export interface Product {
  id: string;
  sku: string;
  productCode?: string;
  name: string;
  description: string;
  categoryId: string;
  variants: ProductVariant[];
  price: number;
  reorderPoint: number;
  supplierId: string;
  supplierName?: string;
  imageUrl?: string;
  packaging?: ProductPackaging;
  pricingRuleId?: string;
  // Fields for update payload
  productGroup?: string;
  stockUom?: string;
  disabled?: number;
  allowAlternativeItem?: number;
  isStockItem?: number;
  hasVariants?: number;
  isFixedAsset?: number;
  openingStock?: number;
  valuationRate?: number;
  standardRate?: number;
  supplierType?: string;
  brandId?: string;
  labelId?: string;
  unitId?: string;
  packSize?: string;
  hsnCode?: string;
  gstPercentage?: number;
}

export type LocationType = 'Warehouse' | 'Zone' | 'Aisle' | 'Rack' | 'Shelf' | 'Bin';
export type LocationStatus = 'Occupied' | 'Reserved' | 'Available' | 'Maintenance';

export interface Location {
    id: string;
    code: string; // Unique short code, e.g., "A1-S3-B2"
    name: string; // Descriptive name, e.g., "Main Warehouse", "Heavy Items Zone"
    type: LocationType;
    status: LocationStatus;
    capacity: number; // Max units it can hold for leaf nodes (bin, shelf)
    currentCapacity: number; // Current number of units in the location
    zone?: string; // e.g. "Zone A"
    address?: string; // For warehouse type
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    description?: string;
    zoneType?: string;
    warehouseId?: string;
    isActive?: boolean;
}

export interface Stock {
  id: string;
  productId: string;
  quantity: number;
  locationId: string | null; // null if in receiving
  purchaseOrderId?: string; // Link to the source PO for items in receiving
}

export enum AdjustmentType {
  INCREASE = 'Increase',
  DECREASE = 'Decrease',
}

export interface StockAdjustment {
  id: string;
  productId: string;
  quantity: number;
  type: AdjustmentType;
  reason: string;
  createdAt: string;
  userId: string;
  // Fix: Added locationId property to match API usage and fix reporting errors
  locationId?: string | null;
}

export interface InboundItem {
  itemId: string;
  productId: string;
  quantity: number;
  recordId: string;
}

export interface InboundShipment {
  id:string;
  purchaseOrderId: string;
  items: InboundItem[];
  receivedAt: string;
  status: 'Received' | 'Partially Received';
  receivedByUserId: string;
}

export interface ReceiveShipmentData {
    purchaseOrderId: string;
    items: { productId: string; quantity: number }[];
    userId: string;
    putAwayId?: string;
    status: 'Received' | 'Partially Received';
}

export interface ReceiveShipmentPayload {
    purchaseOrderId: number;
    items: {
        productId: number;
        quantity: number;
    }[];
    receivedByUserId: number;
    receivedAt: string;
    status: 'Received' | 'Partially Received';
    putAwayId?: number;
}

export interface UpdatePutAwayPayload {
    putAwayId: number;
    purchaseOrderId: number;
    items: {
        productId: number;
        quantity: number;
    }[];
    receivedByUserId: number;
    receivedAt: string;
    status: 'Received' | 'Partially Received';
}

export interface InProgressPutAwayItem {
  id: string; // put-away ITEM ID (e.g. 163)
  putawayId: string; // parent put-away record ID (e.g. 108)
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  locationId: string;
  receivedAt: string;
  completedAt?: string;
  // FIX: Widened the type to allow for 'Completed' status, which resolves the TypeScript error in AppContext.
  status: 'Put-Away In Progress' | 'Completed';
  userId: string;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Ready for Pickup' | 'Shipped' | 'Returned' | 'Completed' | 'Cancelled';

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number; // Price at time of order
}

export interface ShippingAddress {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface Order {
    id: string;
    customerId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: ShippingAddress;
    items: OrderItem[];
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    priority: 'Low' | 'Medium' | 'High';
    notes?: string;
    totalAmount?: number;
}

export interface PickListItem {
  productId: string;
  quantity: number;
  locationId: string;
  picked: boolean;
}

// Added 'Ready for Pickup' to the status union to reflect API behavior and resolve TypeScript comparison errors in the Picking page.
export interface PickList {
  id: string;
  orderId: string;
  items: PickListItem[];
  createdAt: string;
  status: 'Pending' | 'In Progress' | 'Picked' | 'Ready for Pickup';
}

export interface PackedOrderItem {
  productId: string;
  quantity: number;
  locationId: string;
}

export interface PackedOrder {
    id: string;
    orderId: string;
    items: PackedOrderItem[];
    packedAt: string;
    shippedAt?: string;
    status: 'Packed' | 'Shipped';
}

export interface CycleCountItem {
    id: string;
    productId: string;
    locationId: string;
    systemQuantity: number;
    countedQuantity: number | null;
    countedAt: string | null;
}

export interface CycleCount {
    id: string;
    items: CycleCountItem[];
    createdAt: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Adjusted';
}

export type RMAStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'In Transit' | 'Received' | 'Completed';
export type RMAReason = 'Defective Product' | 'Wrong Item' | 'Not as Described' | 'Customer Changed Mind' | 'Size/Fit Issue' | 'Quality Issue' | 'Other';
export type RMAResolution = 'Full Refund' | 'Exchange' | 'Store Credit' | 'Repair';


export interface RMA {
    id: string;
    orderId: string;
    items: InboundItem[];
    reason: RMAReason;
    preferredResolution: RMAResolution;
    detailedDescription?: string;
    photos?: string[];
    contactPhone?: string;
    status: RMAStatus;
    createdAt: string;
    priority: 'Low' | 'Medium' | 'High';
    refundAmount: number;
}

// Vendor Returns (Supplier Returns)
// Lifecycle: Draft -> Approved -> Shipped -> Settled
export type SupplierReturnStatus = 'Draft' | 'Approved' | 'Shipped' | 'Settled' | 'Rejected';

export interface SupplierReturnItem {
    id: string;
    productId: string;
    quantity: number;
    locationId: string; // The specific stock location we are returning from
    reason: string;
    batchId?: string; // For RTV initiate
    reasonCode?: string; // For RTV initiate
}

export interface SupplierReturn {
    id: string;
    supplierId: string;
    purchaseOrderId?: string; // Required for initiate
    warehouseId?: string; // Required for initiate
    status: SupplierReturnStatus;
    items: SupplierReturnItem[];
    createdAt: string;
    notes?: string;
    createdByUserId: string;
    shippedAt?: string;
}

// User Management
export type Role = 'Admin' | 'Warehouse Manager' | 'Picker' | 'Receiver' | 'Analyst';
export type Permission = 
  | 'viewDashboard'
  | 'manageInventory'
  | 'manageProducts'
  | 'manageAdjustments'
  | 'viewStockLevels'
  | 'viewAlerts'
  | 'manageOperations'
  | 'manageReceiving'
  | 'managePutAway'
  | 'managePicking'
  | 'managePackingShipping'
  | 'manageCycleCounts'
  | 'manageLocations'
  | 'manageOrders'
  | 'manageReturns'
  | 'viewAnalytics'
  | 'manageSuppliers'
  | 'managePurchaseOrders'
  | 'viewReports'
  | 'generateForecasts'
  | 'manageUsers'
  | 'manageConfiguration'
  | 'manageUOM'
  | 'managePricing'
  | 'manageWarehouseConfiguration'
  | 'manageLocalization';

export interface User {
  id: string;
  name: string; // Full name
  firstName: string;
  lastName: string;
  userName: string;
  officialEmail: string;
  personalEmail?: string;
  contactNo: string;
  gender: string;
  role: Role;
  isActive: boolean;
  salutation?: string;
  displayName?: string;
  doj?: string;
  branchId?: string;
  departmentId?: string;
  remarks?: string;
}

// Supplier & Vendor Management
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  status: 'Active' | 'Inactive';
  rating?: number;
  notes?: string;
}

export interface PurchaseOrderItem {
  id?: string;
  productId: string;
  quantity: number;
  cost: number; // Cost per unit
  receivedQuantity?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  status: 'Draft' | 'Issued' | 'Partially Received' | 'Received' | 'Cancelled';
  totalAmount?: number;
  totalQuantity?: number;
  receivedQuantity?: number;
  putAwayId?: string;
}

// Reporting & Analytics
export type StockMovementType = 'Purchase Receipt' | 'Put Away (Out)' | 'Put Away (In)' | 'Sale Ship' | 'Stock Adjustment' | 'Cycle Count Variance' | 'Return to Vendor';

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string | null;
  quantityChange: number; // positive for in, negative for out
  type: StockMovementType;
  referenceId: string; // PO id, order id, adjustment id etc.
  timestamp: string;
  userId: string;
}

export interface SupplierProduct {
    id: string;
    name: string;
    sku: string;
    cost: number;
}

// Warehouse Configuration
export interface WarehouseOperatingHours {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isOpen: boolean;
  openTime?: string; // "HH:MM"
  closeTime?: string; // "HH:MM"
}

export type OrderPriorityRule = 'First In, First Out' | 'By Priority Level' | 'By Order Value' | 'By Deadline';

export interface WarehouseOrderProcessing {
    autoAssignOrders: boolean;
    priorityRule: OrderPriorityRule;
    defaultBatchSize: number;
    requireQualityCheck: boolean;
}

export interface WarehouseInventoryManagement {
    lowStockThresholdPercentage: number;
    autoReorder: boolean;
    cycleCountFrequency: string; // Frequency string
    enableLotTracking: boolean;
}

export interface WarehouseNotifications {
  email: {
    lowStock: boolean;
    orderCompletion: boolean;
    systemAlerts: boolean;
    dailyReports: boolean;
  };
  push: {
    urgentTasks: boolean;
    taskAssignments: boolean;
    deadlineReminders: boolean;
    statusUpdates: boolean;
  };
  recipients: string; // Comma-separated list of emails
}


export interface WarehouseConfiguration {
  id: string; // Corresponds to pkWarehouseId
  pkWarehouseId: string; // Added for explicit mapping
  name: string;
  address: string;
  operatingHours?: WarehouseOperatingHours[];
  dockDoors?: {
    inbound: number;
    outbound: number;
  };
  defaultEnvironmentalFactor?: EnvironmentalFactor;
  locationNamingConvention?: string;
  code?: string;
  description?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  timezone?: string;
  orderProcessing?: WarehouseOrderProcessing;
  inventoryManagement?: WarehouseInventoryManagement;
  notifications?: WarehouseNotifications;
  warehouseName?: string; // From API list view
  warehouseType?: string; // From API list view
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pin?: string;
}