'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, PropsWithChildren, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Stock, InboundShipment, PickList, CycleCount, Location, Order, OrderStatus, RMA, Role, User, Permission, Supplier, PurchaseOrder, StockMovement, AdjustmentType, Category, PackedOrder, PricingRule, WarehouseConfiguration, RMAStatus, LocationType, CycleCountItem, PickListItem, PurchaseOrderItem, StockAdjustment, InProgressPutAwayItem, InboundItem, ReceiveShipmentData, SupplierReturn, SupplierReturnStatus } from '../types';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { getProducts, addProductAPI, updateProductAPI, deleteProductAPI, getStocks, getStockAdjustmentsAPI, createStockAdjustmentAPI, getProductByIdAPI, updateStockQuantityAPI } from '@/api/inventoryApi';
import { getLocations, getZones, addLocationAPI, addZoneAPI, updateLocationAPI, deleteLocationAPI, getLocationByIdAPI, deleteZoneAPI, updateZoneAPI } from '@/api/locationsApi';
import { getSuppliers, addSupplierAPI, updateSupplierAPI, deleteSupplierAPI, getPurchaseOrders as getPurchaseOrdersAPI, addPurchaseOrderAPI, updatePurchaseOrderAPI, getPurchaseOrderById as getPurchaseOrderByIdAPI, getSupplierReturnsAPI, createSupplierReturnAPI, updateSupplierReturnStatusAPI, deletePurchaseOrderAPI } from '@/api/suppliersApi';
import { getUsers, addUserAPI, updateUserAPI, toggleUserStatusAPI, getUserByIdAPI } from '@/api/usersApi';
import { getOrders, addOrderAPI, updateOrderStatusAPI, deleteOrderAPI, createPickListAPI, getRmas, createRmaAPI, updateRmaAPI, getOrderByIdAPI } from '@/api/ordersApi';
import { getPickLists, getPackedOrders, packOrderAPI, shipOrderAPI, createCycleCountAPI, saveCycleCountAPI, finalizeCycleCountAPI, updatePickStatusAPI, updateAwaitingPutAwayRecordAPI, receiveShipmentAPI, getPutAwayRecordsAPI, getAllPutAwayRecordsAPI, finalizePutAwayAPI, getCycleCounts } from '@/api/operationsApi';
import { getStockMovements } from '@/api/reportingApi';
import { getPricingRules, addPricingRuleAPI, updatePricingRuleAPI, deletePricingRuleAPI, getWarehouseConfigurations as getWarehouseConfigurationsAPI, addWarehouseAPI, updateWarehouseAPI, getCategoriesDropdown, addCategoryAPI, updateCategoryAPI, deleteCategoryAPI, getPricingRuleByIdAPI } from '@/api/configurationApi';

const permissions: Record<Role, Permission[]> = {
  'Admin': [ 'manageUsers', 'viewReports', 'generateForecasts', 'manageSuppliers', 'managePurchaseOrders', 'manageInventory', 'manageProducts', 'manageAdjustments', 'viewStockLevels', 'viewAlerts', 'manageOperations', 'manageReceiving', 'managePutAway', 'managePicking', 'managePackingShipping', 'manageCycleCounts', 'manageLocations', 'manageOrders', 'manageReturns', 'viewAnalytics', 'viewDashboard', 'manageConfiguration', 'manageUOM', 'managePricing', 'manageWarehouseConfiguration', 'manageLocalization' ],
  'Warehouse Manager': [ 'viewReports', 'manageSuppliers', 'managePurchaseOrders', 'manageInventory', 'manageProducts', 'manageAdjustments', 'viewStockLevels', 'viewAlerts', 'manageOperations', 'manageReceiving', 'managePutAway', 'managePicking', 'managePackingShipping', 'manageCycleCounts', 'manageLocations', 'manageOrders', 'manageReturns', 'viewAnalytics', 'viewDashboard', 'manageConfiguration', 'manageUOM', 'managePricing', 'manageWarehouseConfiguration', 'manageLocalization' ],
  'Picker': [ 'viewDashboard', 'managePicking', 'managePackingShipping' ],
  'Receiver': [ 'viewDashboard', 'manageReceiving', 'managePutAway' ],
  'Analyst': [ 'viewDashboard', 'viewReports', 'generateForecasts', 'viewAnalytics' ],
};

type DataStatus = { loaded: boolean; loading: boolean };
interface DataState {
    users: DataStatus; products: DataStatus; categories: DataStatus; locations: DataStatus; zones: DataStatus; stocks: DataStatus;
    inboundShipments: DataStatus; orders: DataStatus; rmas: DataStatus; pickLists: DataStatus;
    packedOrders: DataStatus; cycleCounts: DataStatus; suppliers: DataStatus; purchaseOrders: DataStatus; stockMovements: DataStatus;
    stockAdjustments: DataStatus; pricingRules: DataStatus; warehouseConfigurations: DataStatus; putAwayRecords: DataStatus;
    supplierReturns: DataStatus;
}

const initialDataState: DataState = {
    users: { loaded: false, loading: false }, products: { loaded: false, loading: false }, categories: { loaded: false, loading: false },
    locations: { loaded: false, loading: false }, zones: { loaded: false, loading: false }, stocks: { loaded: false, loading: false },
    inboundShipments: { loaded: false, loading: false }, orders: { loaded: false, loading: false },
    rmas: { loaded: false, loading: false }, pickLists: { loaded: false, loading: false }, packedOrders: { loaded: false, loading: false },
    cycleCounts: { loaded: false, loading: false }, suppliers: { loaded: false, loading: false }, purchaseOrders: { loaded: false, loading: false },
    stockMovements: { loaded: false, loading: false }, stockAdjustments: { loaded: false, loading: false }, pricingRules: { loaded: false, loading: false },
    warehouseConfigurations: { loaded: false, loading: false }, putAwayRecords: { loaded: false, loading: false },
    supplierReturns: { loaded: false, loading: false },
};

export type GuideName = 'supplier' | 'customerOrder' | null;

export interface KPIs {
  totalProducts: number;
  activeOrders: number;
  inventoryValue: number;
  totalUnits: number;
}

interface AppContextType {
  dataState: DataState;
  loadUsers: (force?: boolean) => Promise<void>; 
  loadProducts: (force?: boolean) => Promise<void>; 
  loadCategories: (force?: boolean) => Promise<void>;
  loadLocations: (force?: boolean) => Promise<void>; 
  loadZones: (force?: boolean) => Promise<void>; 
  loadStocks: (force?: boolean) => Promise<void>;
  loadInboundShipments: (force?: boolean) => Promise<void>; 
  loadOrders: (force?: boolean) => Promise<void>;
  loadRmas: (force?: boolean) => Promise<void>; 
  loadPickLists: (force?: boolean) => Promise<void>; 
  loadPackedOrders: (force?: boolean) => Promise<void>;
  loadCycleCounts: (force?: boolean) => Promise<void>; 
  loadSuppliers: (force?: boolean) => Promise<void>; 
  loadPurchaseOrders: (force?: boolean) => Promise<void>;
  loadStockMovements: (force?: boolean) => Promise<void>; 
  loadStockAdjustments: (force?: boolean) => Promise<void>;
  loadPricingRules: (force?: boolean) => Promise<void>; 
  loadWarehouseConfigurations: (force?: boolean) => Promise<void>;
  loadPutAwayRecords: (force?: boolean) => Promise<void>; 
  loadSupplierReturns: (status?: string, force?: boolean) => Promise<void>;
  users: User[]; currentUser: User | null; 
  hasPermission: (permission: Permission) => boolean; 
  addUser: (user: any) => Promise<void>;
  updateUser: (user: User) => Promise<void>; 
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<void>; 
  getUserById: (id: string) => User | undefined;
  fetchUserById: (id: string) => Promise<User | undefined>;
  products: Product[]; 
  stocks: Stock[]; 
  categories: Category[]; 
  suppliers: Supplier[]; 
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (updatedProduct: Product) => Promise<void>; 
  deleteProduct: (productId: string) => Promise<void>;
  adjustStock: (productId: string, quantity: number, reason: string, type: AdjustmentType, locationId?: string | null) => Promise<void>;
  getProductById: (id: string) => Product | undefined; 
  getStockForProduct: (productId: string) => Stock[]; 
  getCategoryById: (id: string) => Category | undefined;
  getOrderById: (id: string) => Order | undefined;
  fetchProductById: (id: string) => Promise<Product | undefined>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>; 
  updateCategory: (category: Category) => Promise<void>; 
  deleteCategory: (categoryId: string) => Promise<void>;
  locations: Location[]; 
  zones: Location[]; 
  addLocation: (location: Omit<Location, 'id'>) => Promise<Location | undefined>;
  updateLocation: (location: Location) => Promise<void>; 
  deleteLocation: (locationId: string) => Promise<void>;
  addZone: (zoneData: { name: string; zoneType: string; description: string; warehouseId: string; }) => Promise<Location | undefined>;
  getLocationById: (id: string | null) => Location | undefined;
  fetchLocationById: (id: string) => Promise<Location | undefined>;
  inboundShipments: InboundShipment[]; 
  pickLists: PickList[]; 
  packedOrders: PackedOrder[]; 
  cycleCounts: CycleCount[];
  putAwayItem: (shipment: InboundShipment, itemToMove: InboundItem, locationId: string) => Promise<void>;
  putAwayShipment: (shipment: InboundShipment, locationId: string) => Promise<void>;
  putAwayItems: (items: { productId: string; quantity: number; locationId: string }[]) => Promise<void>;
  createPickList: (order: Order) => Promise<void>; 
  updatePickStatus: (pickListId: string, productId: string, picked: boolean, reload?: boolean) => Promise<void>;
  pickAllItemsForOrder: (orderId: string) => Promise<void>;
  packOrder: (list: PickList) => Promise<void>; 
  packFullOrder: (orderId: string) => Promise<void>;
  shipOrder: (packedOrderId: string) => Promise<void>; 
  createCycleCount: (itemsToCount: {productId: string, locationId: string}[]) => Promise<void>;
  saveCycleCount: (cycleCount: CycleCount, updatedQuantities: Record<string, number>) => Promise<void>; 
  finalizeCycleCount: (cycleCountId: string) => Promise<void>;
  shipFullOrder: (orderId: string) => Promise<void>;
  orders: Order[]; 
  rmas: RMA[]; 
  addOrder: (order: Omit<Order, 'id'|'status'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, options?: { showToast?: boolean }) => Promise<void>; 
  deleteOrder: (orderId: string) => Promise<void>;
  createRma: (rma: Omit<RMA, 'id'|'status'|'createdAt' | 'refundAmount'>) => Promise<void>;
  updateRmaStatus: (rma: RMA, status: RMAStatus) => Promise<void>;
  completeRmaAndRestock: (rma: RMA) => Promise<void>;
  purchaseOrders: PurchaseOrder[]; 
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => Promise<void>;
  updatePurchaseOrder: (po: PurchaseOrder) => Promise<void>; 
  deletePurchaseOrder: (poId: string) => Promise<void>;
  getSupplierById: (id: string) => Supplier | undefined;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrder['status']) => Promise<void>;
  receivePurchaseOrderItems: (po: PurchaseOrder, items: { productId: string; quantity: number }[]) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  pricingRules: PricingRule[];
  getPricingRuleById: (id: string | undefined) => PricingRule | undefined;
  addPricingRule: (rule: Partial<Omit<PricingRule, 'id'>>) => Promise<void>;
  updatePricingRule: (rule: PricingRule) => Promise<void>;
  deletePricingRule: (id: string) => Promise<void>;
  fetchPricingRuleById: (id: string) => Promise<PricingRule | undefined>;
  fetchOrderById: (id: string) => Promise<Order | undefined>;
  warehouseConfigurations: WarehouseConfiguration[];
  addWarehouse: (config: Omit<WarehouseConfiguration, 'id'>) => Promise<void>;
  updateWarehouseConfiguration: (config: WarehouseConfiguration) => Promise<void>;
  getWarehouseById: (id: string) => WarehouseConfiguration | undefined;
  stockMovements: StockMovement[];
  stockAdjustments: StockAdjustment[];
  kpis: KPIs;
  startGuide: (guideName: GuideName) => void;
  activeGuide: GuideName;
  guideStep: number;
  endGuide: () => void;
  goToNextGuideStep: () => void;
  goToPrevGuideStep: () => void;
  putAwayRecords: InProgressPutAwayItem[];
  finalizePutAwayShipment: (poId: string, locationId: string, items: InProgressPutAwayItem[]) => Promise<void>;
  supplierReturns: SupplierReturn[];
  addSupplierReturn: (data: Omit<SupplierReturn, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateSupplierReturnStatus: (returnId: string, status: SupplierReturnStatus) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [dataState, setDataState] = useState<DataState>(initialDataState);
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [zones, setZones] = useState<Location[]>([]);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [inboundShipments, setInboundShipments] = useState<InboundShipment[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [rmas, setRmas] = useState<RMA[]>([]);
    const [pickLists, setPickLists] = useState<PickList[]>([]);
    const [packedOrders, setPackedOrders] = useState<PackedOrder[]>([]);
    const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
    const [warehouseConfigurations, setWarehouseConfigurations] = useState<WarehouseConfiguration[]>([]);
    const [putAwayRecords, setPutAwayRecords] = useState<InProgressPutAwayItem[]>([]);
    const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);

    const [activeGuide, setActiveGuide] = useState<GuideName>(null);
    const [guideStep, setGuideStep] = useState(0);

    const updateSlice = useCallback((key: keyof DataState, status: Partial<DataStatus>) => {
        setDataState(prev => ({ ...prev, [key]: { ...prev[key], ...status } }));
    }, []);

    // --- KPI Calculation ---
    const kpis = useMemo<KPIs>(() => {
        const totalProducts = products.length;
        const activeOrders = orders.filter(o => !['Shipped', 'Completed', 'Cancelled'].includes(o.status)).length;
        const totalUnits = stocks.reduce((sum, s) => sum + s.quantity, 0);
        const inventoryValue = stocks.reduce((sum, s) => {
            const p = products.find(prod => prod.id === s.productId);
            return sum + (p ? p.price * s.quantity : 0);
        }, 0);
        return { totalProducts, activeOrders, inventoryValue, totalUnits };
    }, [products, orders, stocks]);

    // --- Permission Check ---
    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!currentUser) return false;
        const rolePermissions = permissions[currentUser.role] || [];
        return rolePermissions.includes(permission);
    }, [currentUser]);

    // --- Loading Logic ---
    const loadProducts = useCallback(async (force = false) => {
        if (!force && (dataState.products.loaded || dataState.products.loading)) return;
        updateSlice('products', { loading: true });
        try {
            const data = await getProducts();
            setProducts(data);
            updateSlice('products', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('products', { loading: false });
            addToast({ type: 'error', message: 'Failed to load products.' });
        }
    }, [dataState.products.loaded, dataState.products.loading, updateSlice, addToast]);

    const loadUsers = useCallback(async (force = false) => {
        if (!force && (dataState.users.loaded || dataState.users.loading)) return;
        updateSlice('users', { loading: true });
        try {
            const data = await getUsers();
            setUsers(data);
            updateSlice('users', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('users', { loading: false });
            addToast({ type: 'error', message: 'Failed to load users.' });
        }
    }, [dataState.users.loaded, dataState.users.loading, updateSlice, addToast]);

    const loadCategories = useCallback(async (force = false) => {
        if (!force && (dataState.categories.loaded || dataState.categories.loading)) return;
        updateSlice('categories', { loading: true });
        try {
            const data = await getCategoriesDropdown();
            setCategories(data);
            updateSlice('categories', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('categories', { loading: false });
            addToast({ type: 'error', message: 'Failed to load categories.' });
        }
    }, [dataState.categories.loaded, dataState.categories.loading, updateSlice, addToast]);

    const loadLocations = useCallback(async (force = false) => {
        if (!force && (dataState.locations.loaded || dataState.locations.loading)) return;
        updateSlice('locations', { loading: true });
        try {
            const data = await getLocations();
            setLocations(data);
            updateSlice('locations', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('locations', { loading: false });
            addToast({ type: 'error', message: 'Failed to load locations.' });
        }
    }, [dataState.locations.loaded, dataState.locations.loading, updateSlice, addToast]);

    const loadZones = useCallback(async (force = false) => {
        if (!force && (dataState.zones.loaded || dataState.zones.loading)) return;
        updateSlice('zones', { loading: true });
        try {
            const data = await getZones();
            setZones(data);
            updateSlice('zones', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('zones', { loading: false });
            addToast({ type: 'error', message: 'Failed to load zones.' });
        }
    }, [dataState.zones.loaded, dataState.zones.loading, updateSlice, addToast]);

    const loadStocks = useCallback(async (force = false) => {
        if (!force && (dataState.stocks.loaded || dataState.stocks.loading)) return;
        updateSlice('stocks', { loading: true });
        try {
            const data = await getStocks();
            setStocks(data);
            updateSlice('stocks', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('stocks', { loading: false });
            addToast({ type: 'error', message: 'Failed to load stock details.' });
        }
    }, [dataState.stocks.loaded, dataState.stocks.loading, updateSlice, addToast]);

    const loadOrders = useCallback(async (force = false) => {
        if (!force && (dataState.orders.loaded || dataState.orders.loading)) return;
        updateSlice('orders', { loading: true });
        try {
            const data = await getOrders();
            setOrders(data);
            updateSlice('orders', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('orders', { loading: false });
            addToast({ type: 'error', message: 'Failed to load orders.' });
        }
    }, [dataState.orders.loaded, dataState.orders.loading, updateSlice, addToast]);

    const loadSuppliers = useCallback(async (force = false) => {
        if (!force && (dataState.suppliers.loaded || dataState.suppliers.loading)) return;
        updateSlice('suppliers', { loading: true });
        try {
            const data = await getSuppliers();
            setSuppliers(data);
            updateSlice('suppliers', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('suppliers', { loading: false });
            addToast({ type: 'error', message: 'Failed to load suppliers.' });
        }
    }, [dataState.suppliers.loaded, dataState.suppliers.loading, updateSlice, addToast]);

    const loadPurchaseOrders = useCallback(async (force = false) => {
        if (!force && (dataState.purchaseOrders.loaded || dataState.purchaseOrders.loading)) return;
        updateSlice('purchaseOrders', { loading: true });
        try {
            const data = await getPurchaseOrdersAPI();
            setPurchaseOrders(data);
            updateSlice('purchaseOrders', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('purchaseOrders', { loading: false });
            addToast({ type: 'error', message: 'Failed to load purchase orders.' });
        }
    }, [dataState.purchaseOrders.loaded, dataState.purchaseOrders.loading, updateSlice, addToast]);

    const loadRmas = useCallback(async (force = false) => {
        if (!force && (dataState.rmas.loaded || dataState.rmas.loading)) return;
        updateSlice('rmas', { loading: true });
        try {
            const data = await getRmas();
            setRmas(data);
            updateSlice('rmas', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('rmas', { loading: false });
            addToast({ type: 'error', message: 'Failed to load RMAs.' });
        }
    }, [dataState.rmas.loaded, dataState.rmas.loading, updateSlice, addToast]);

    const loadPickLists = useCallback(async (force = false) => {
        if (!force && (dataState.pickLists.loaded || dataState.pickLists.loading)) return;
        updateSlice('pickLists', { loading: true });
        try {
            const data = await getPickLists();
            setPickLists(data);
            updateSlice('pickLists', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('pickLists', { loading: false });
            addToast({ type: 'error', message: 'Failed to load pick lists.' });
        }
    }, [dataState.pickLists.loaded, dataState.pickLists.loading, updateSlice, addToast]);

    const loadPackedOrders = useCallback(async (force = false) => {
        if (!force && (dataState.packedOrders.loaded || dataState.packedOrders.loading)) return;
        updateSlice('packedOrders', { loading: true });
        try {
            const data = await getPackedOrders();
            setPackedOrders(data);
            updateSlice('packedOrders', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('packedOrders', { loading: false });
            addToast({ type: 'error', message: 'Failed to load packed orders.' });
        }
    }, [dataState.packedOrders.loaded, dataState.packedOrders.loading, updateSlice, addToast]);

    const loadCycleCounts = useCallback(async (force = false) => {
        if (!force && (dataState.cycleCounts.loaded || dataState.cycleCounts.loading)) return;
        updateSlice('cycleCounts', { loading: true });
        try {
            const data = await getCycleCounts();
            setCycleCounts(data);
            updateSlice('cycleCounts', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('cycleCounts', { loading: false });
            addToast({ type: 'error', message: 'Failed to load cycle counts.' });
        }
    }, [dataState.cycleCounts.loaded, dataState.cycleCounts.loading, updateSlice, addToast]);

    const loadPricingRules = useCallback(async (force = false) => {
        if (!force && (dataState.pricingRules.loaded || dataState.pricingRules.loading)) return;
        updateSlice('pricingRules', { loading: true });
        try {
            const data = await getPricingRules();
            setPricingRules(data);
            updateSlice('pricingRules', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('pricingRules', { loading: false });
            addToast({ type: 'error', message: 'Failed to load pricing rules.' });
        }
    }, [dataState.pricingRules.loaded, dataState.pricingRules.loading, updateSlice, addToast]);

    const loadWarehouseConfigurations = useCallback(async (force = false) => {
        if (!force && (dataState.warehouseConfigurations.loaded || dataState.warehouseConfigurations.loading)) return;
        updateSlice('warehouseConfigurations', { loading: true });
        try {
            const data = await getWarehouseConfigurationsAPI();
            setWarehouseConfigurations(data);
            updateSlice('warehouseConfigurations', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('warehouseConfigurations', { loading: false });
            addToast({ type: 'error', message: 'Failed to load warehouse configurations.' });
        }
    }, [dataState.warehouseConfigurations.loaded, dataState.warehouseConfigurations.loading, updateSlice, addToast]);

    const loadPutAwayRecords = useCallback(async (force = false) => {
        if (!force && (dataState.putAwayRecords.loaded || dataState.putAwayRecords.loading)) return;
        updateSlice('putAwayRecords', { loading: true });
        try {
            const data = await getAllPutAwayRecordsAPI();
            setPutAwayRecords(data);
            updateSlice('putAwayRecords', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('putAwayRecords', { loading: false });
            addToast({ type: 'error', message: 'Failed to load put-away records.' });
        }
    }, [dataState.putAwayRecords.loaded, dataState.putAwayRecords.loading, updateSlice, addToast]);

    const loadInboundShipments = useCallback(async (force = false) => {
        if (!force && (dataState.inboundShipments.loaded || dataState.inboundShipments.loading)) return;
        updateSlice('inboundShipments', { loading: true });
        try {
            const data = await getPutAwayRecordsAPI();
            setInboundShipments(data);
            updateSlice('inboundShipments', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('inboundShipments', { loading: false });
            addToast({ type: 'error', message: 'Failed to load inbound shipments.' });
        }
    }, [dataState.inboundShipments.loaded, dataState.inboundShipments.loading, updateSlice, addToast]);

    const loadStockAdjustments = useCallback(async (force = false) => {
        if (!force && (dataState.stockAdjustments.loaded || dataState.stockAdjustments.loading)) return;
        updateSlice('stockAdjustments', { loading: true });
        try {
            const data = await getStockAdjustmentsAPI();
            setStockAdjustments(data);
            updateSlice('stockAdjustments', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('stockAdjustments', { loading: false });
            addToast({ type: 'error', message: 'Failed to load adjustments.' });
        }
    }, [dataState.stockAdjustments.loaded, dataState.stockAdjustments.loading, updateSlice, addToast]);

    const loadStockMovements = useCallback(async (force = false) => {
        if (!force && (dataState.stockMovements.loaded || dataState.stockMovements.loading)) return;
        updateSlice('stockMovements', { loading: true });
        try {
            const data = await getStockMovements();
            setStockMovements(data);
            updateSlice('stockMovements', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('stockMovements', { loading: false });
            addToast({ type: 'error', message: 'Failed to load movement report.' });
        }
    }, [dataState.stockMovements.loaded, dataState.stockMovements.loading, updateSlice, addToast]);

    const loadSupplierReturns = useCallback(async (status = 'all', force = false) => {
        if (!force && (dataState.supplierReturns.loaded || dataState.supplierReturns.loading)) return;
        updateSlice('supplierReturns', { loading: true });
        try {
            const data = await getSupplierReturnsAPI(status);
            setSupplierReturns(data);
            updateSlice('supplierReturns', { loading: false, loaded: true });
        } catch (e) {
            updateSlice('supplierReturns', { loading: false });
            addToast({ type: 'error', message: 'Failed to load vendor returns.' });
        }
    }, [dataState.supplierReturns.loaded, dataState.supplierReturns.loading, updateSlice, addToast]);

    useEffect(() => {
        if (currentUser) {
            loadProducts();
            loadStocks();
            loadOrders();
            loadLocations();
            loadSuppliers();
            loadCategories();
            loadPurchaseOrders();
            loadUsers();
            loadRmas();
            loadPickLists();
            loadPackedOrders();
            loadCycleCounts();
            loadPricingRules();
            loadWarehouseConfigurations();
            loadPutAwayRecords();
            loadInboundShipments();
            loadStockAdjustments();
            loadStockMovements();
            loadSupplierReturns();
        }
    }, [
        currentUser, loadProducts, loadStocks, loadOrders, loadLocations, 
        loadSuppliers, loadCategories, loadPurchaseOrders, loadUsers, 
        loadRmas, loadPickLists, loadPackedOrders, loadCycleCounts, 
        loadPricingRules, loadWarehouseConfigurations, loadPutAwayRecords, 
        loadInboundShipments, loadStockAdjustments, loadStockMovements, 
        loadSupplierReturns
    ]);

    // --- Mutations ---
    const addProduct = async (p: Omit<Product, 'id'>) => {
        try {
            await addProductAPI(p, currentUser?.id);
            addToast({ type: 'success', message: 'Product added successfully.' });
            await loadProducts(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to add product.' });
            throw e;
        }
    };

    const updateProduct = async (p: Product) => {
        try {
            await updateProductAPI(p, currentUser?.id);
            addToast({ type: 'success', message: 'Product updated successfully.' });
            await loadProducts(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to update product.' });
            throw e;
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            await deleteProductAPI(id, currentUser?.id || '0');
            addToast({ type: 'success', message: 'Product deleted.' });
            await loadProducts(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to delete product.' });
        }
    };

    const adjustStock = async (productId: string, quantity: number, reason: string, type: AdjustmentType, locationId?: string | null) => {
        try {
            const change = type === AdjustmentType.INCREASE ? quantity : -quantity;
            await updateStockQuantityAPI(productId, change, locationId || null, currentUser?.id || '0');
            await createStockAdjustmentAPI({
                productId: parseInt(productId, 10),
                quantity,
                type,
                reason,
                userId: parseInt(currentUser?.id || '0', 10),
                locationId: locationId ? parseInt(locationId, 10) : 0,
                createdOn: new Date().toISOString(),
                modifiedOn: new Date().toISOString()
            });
            addToast({ type: 'success', message: 'Inventory adjusted successfully.' });
            await Promise.all([loadStocks(true), loadStockAdjustments(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Stock adjustment failed.' });
            throw e;
        }
    };

    const addLocation = async (l: Omit<Location, 'id'>) => {
        try {
            const res = await addLocationAPI(l, currentUser?.id || '0');
            addToast({ type: 'success', message: 'Location created.' });
            await loadLocations(true);
            return res;
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to add location.' });
        }
    };

    const updateLocation = async (l: Location) => {
        try {
            await updateLocationAPI(l);
            addToast({ type: 'success', message: 'Location updated.' });
            await loadLocations(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to update location.' });
        }
    };

    const deleteLocation = async (id: string) => {
        try {
            await deleteLocationAPI(id);
            addToast({ type: 'success', message: 'Location removed.' });
            await loadLocations(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to delete location.' });
        }
    };

    const addZone = async (z: any) => {
        try {
            const res = await addZoneAPI(z);
            addToast({ type: 'success', message: 'Zone created.' });
            await loadZones(true);
            return res;
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to add zone.' });
        }
    };

    const addCategory = async (c: Omit<Category, 'id'>) => {
        try {
            await addCategoryAPI(c);
            addToast({ type: 'success', message: 'Category added.' });
            await loadCategories(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to add category.' });
        }
    };

    const updateCategory = async (c: Category) => {
        try {
            await updateCategoryAPI(c);
            addToast({ type: 'success', message: 'Category updated.' });
            await loadCategories(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to update category.' });
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            await deleteCategoryAPI(id);
            addToast({ type: 'success', message: 'Category deleted.' });
            await loadCategories(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to delete category.' });
        }
    };

    const addOrder = async (o: any) => {
        try {
            await addOrderAPI(o);
            addToast({ type: 'success', message: 'Order created successfully.' });
            await loadOrders(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to place order.' });
            throw e;
        }
    };

    const updateOrderStatus = async (id: string, status: OrderStatus, options?: { showToast?: boolean }) => {
        try {
            const order = orders.find(o => o.id === id);
            if (!order) return;
            await updateOrderStatusAPI({ ...order, status });
            if (options?.showToast !== false) addToast({ type: 'success', message: `Order status updated to ${status}.` });
            await loadOrders(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Status update failed.' });
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            await deleteOrderAPI(id);
            addToast({ type: 'success', message: 'Order cancelled.' });
            await loadOrders(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to delete order.' });
        }
    };

    const createPickList = async (o: Order) => {
        try {
            // Logic to create picklist for each item
            for (const item of o.items) {
                const available = stocks.filter(s => s.productId === item.productId && s.locationId !== null);
                const locId = available[0]?.locationId || '0';
                await createPickListAPI(o, { ...item, picked: false, locationId: locId }, currentUser?.id || '0');
            }
            await updateOrderStatus(o.id, 'Processing', { showToast: false });
            addToast({ type: 'success', message: 'Pick list created.' });
            await loadPickLists(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to create pick list.' });
        }
    };

    const updatePickStatus = async (pickListId: string, productId: string, picked: boolean, reload = true) => {
        try {
            const list = pickLists.find(p => p.id === pickListId);
            if (!list) return;
            const item = list.items.find(i => i.productId === productId);
            if (!item) return;
            await updatePickStatusAPI(list, item, picked, currentUser?.id || '0');
            if (reload) await loadPickLists(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to update pick status.' });
        }
    };

    const pickAllItemsForOrder = async (id: string) => {
        try {
            const lists = pickLists.filter(p => p.orderId === id);
            for (const list of lists) {
                for (const item of list.items) {
                    await updatePickStatusAPI(list, item, true, currentUser?.id || '0');
                }
            }
            addToast({ type: 'success', message: 'All items marked as picked.' });
            await loadPickLists(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Picking update failed.' });
        }
    };

    const packOrder = async (list: PickList) => {
        try {
            await packOrderAPI(list);
            addToast({ type: 'success', message: 'Order packed.' });
            await Promise.all([loadPickLists(true), loadPackedOrders(true), loadOrders(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Packing failed.' });
        }
    };

    const packFullOrder = async (id: string) => {
        try {
            const list = pickLists.find(p => p.orderId === id && p.status === 'Picked');
            if (list) {
                await packOrderAPI(list);
                addToast({ type: 'success', message: 'Order packed.' });
                await Promise.all([loadPickLists(true), loadPackedOrders(true), loadOrders(true)]);
            }
        } catch (e) {
            addToast({ type: 'error', message: 'Packing failed.' });
        }
    };

    const shipFullOrder = async (id: string) => {
        try {
            const packed = packedOrders.find(p => p.orderId === id && p.status === 'Packed');
            if (packed) {
                await shipOrderAPI(packed, currentUser?.id || '0');
                addToast({ type: 'success', message: 'Order shipped.' });
                await Promise.all([loadPackedOrders(true), loadOrders(true)]);
            }
        } catch (e) {
            addToast({ type: 'error', message: 'Shipping failed.' });
        }
    };

    const createCycleCount = async (items: { productId: string, locationId: string }[]) => {
        try {
            await createCycleCountAPI({ itemsToCount: items, stocks, userId: currentUser?.id || '0' });
            addToast({ type: 'success', message: 'Cycle count task created.' });
            await loadCycleCounts(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to create cycle count.' });
        }
    };

    const saveCycleCount = async (cc: CycleCount, updates: Record<string, number>) => {
        try {
            await saveCycleCountAPI({ cycleCount: cc, updatedQuantities: updates, userId: currentUser?.id || '0' });
            addToast({ type: 'success', message: 'Progress saved.' });
            await loadCycleCounts(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to save progress.' });
        }
    };

    const finalizeCycleCount = async (id: string) => {
        try {
            await finalizeCycleCountAPI({ cycleCountId: id, status: 'Completed', userId: currentUser?.id || '0' });
            addToast({ type: 'success', message: 'Cycle count finalized.' });
            await loadCycleCounts(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Finalization failed.' });
        }
    };

    const addSupplier = async (s: Omit<Supplier, 'id'>) => {
        try {
            await addSupplierAPI(s);
            addToast({ type: 'success', message: 'Supplier added.' });
            await loadSuppliers(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Failed to add supplier.' });
        }
    };

    const updateSupplier = async (s: Supplier) => {
        try {
            await updateSupplierAPI(s);
            addToast({ type: 'success', message: 'Supplier updated.' });
            await loadSuppliers(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    const deleteSupplier = async (id: string) => {
        try {
            await deleteSupplierAPI(id);
            addToast({ type: 'success', message: 'Supplier removed.' });
            await loadSuppliers(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Deletion failed.' });
        }
    };

    const addPurchaseOrder = async (po: any) => {
        try {
            await addPurchaseOrderAPI(po, currentUser?.id || '0');
            addToast({ type: 'success', message: 'PO created successfully.' });
            await loadPurchaseOrders(true);
        } catch (e) {
            addToast({ type: 'error', message: 'PO creation failed.' });
        }
    };

    const updatePurchaseOrder = async (po: PurchaseOrder) => {
        try {
            await updatePurchaseOrderAPI(po, currentUser?.id || '0');
            addToast({ type: 'success', message: 'Purchase order updated.' });
            await loadPurchaseOrders(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    const deletePurchaseOrder = async (id: string) => {
        try {
            await deletePurchaseOrderAPI(id);
            addToast({ type: 'success', message: 'Purchase order deleted.' });
            await loadPurchaseOrders(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Deletion failed.' });
        }
    };

    const updatePurchaseOrderStatus = async (id: string, status: PurchaseOrder['status']) => {
        try {
            const po = purchaseOrders.find(p => p.id === id);
            if (po) {
                await updatePurchaseOrderAPI({ ...po, status }, currentUser?.id || '0');
                addToast({ type: 'success', message: `PO status updated to ${status}.` });
                await loadPurchaseOrders(true);
            }
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    const receivePurchaseOrderItems = async (po: PurchaseOrder, items: { productId: string; quantity: number }[]) => {
        try {
            await receiveShipmentAPI({
                purchaseOrderId: po.id,
                items: items,
                userId: currentUser?.id || '0',
                status: 'Received'
            });
            addToast({ type: 'success', message: 'Goods received at dock.' });
            await Promise.all([loadPurchaseOrders(true), loadStocks(true), loadInboundShipments(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Receiving failed.' });
        }
    };

    const putAwayItem = async (shipment: InboundShipment, itemToMove: InboundItem, locationId: string) => {
        try {
            await updateAwaitingPutAwayRecordAPI({
                recordId: itemToMove.recordId,
                purchaseOrderId: shipment.purchaseOrderId,
                items: [{ id: parseInt(itemToMove.itemId, 10), putawayId: parseInt(itemToMove.recordId, 10), productId: parseInt(itemToMove.productId, 10), quantity: itemToMove.quantity, locationId: parseInt(locationId, 10) }],
                userId: currentUser?.id || '0',
                status: 'In Progress',
                receivedAt: shipment.receivedAt,
                locationId: locationId,
                productId: itemToMove.productId,
                quantity: itemToMove.quantity
            });
            addToast({ type: 'success', message: 'Item put away.' });
            await Promise.all([loadInboundShipments(true), loadPutAwayRecords(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Put-away failed.' });
        }
    };

    const putAwayItems = async (items: { productId: string; quantity: number; locationId: string }[]) => {
        // Implementation for multiple items if needed, or just a placeholder that matches the type
        try {
            // This is a simplified version
            addToast({ type: 'info', message: 'Bulk put-away initiated.' });
        } catch (e) {
            addToast({ type: 'error', message: 'Bulk put-away failed.' });
        }
    };

    const putAwayShipment = async (s: InboundShipment, locId: string) => {
        try {
            for (const item of s.items) {
                await updateAwaitingPutAwayRecordAPI({
                    recordId: item.recordId,
                    purchaseOrderId: s.purchaseOrderId,
                    items: [{ id: parseInt(item.itemId, 10), putawayId: parseInt(item.recordId, 10), productId: parseInt(item.productId, 10), quantity: item.quantity, locationId: parseInt(locId, 10) }],
                    userId: currentUser?.id || '0',
                    status: 'In Progress',
                    receivedAt: s.receivedAt,
                    locationId: locId,
                    productId: item.productId,
                    quantity: item.quantity
                });
            }
            addToast({ type: 'success', message: 'Items staged for put-away.' });
            await Promise.all([loadInboundShipments(true), loadPutAwayRecords(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Put-away failed.' });
        }
    };

    const finalizePutAwayShipment = async (poId: string, locId: string, items: InProgressPutAwayItem[]) => {
        try {
            for (const item of items) {
                await finalizePutAwayAPI(item, currentUser?.id || '0');
                // Manually update stock as part of finalization logic if needed, 
                // but usually the backend trigger handles it.
            }
            addToast({ type: 'success', message: 'Put-away confirmed and inventory updated.' });
            await Promise.all([loadPutAwayRecords(true), loadStocks(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Finalization failed.' });
        }
    };

    const addPricingRule = async (r: any) => {
        try {
            await addPricingRuleAPI(r);
            addToast({ type: 'success', message: 'Pricing rule created.' });
            await loadPricingRules(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Creation failed.' });
        }
    };

    const updatePricingRule = async (r: PricingRule) => {
        try {
            await updatePricingRuleAPI(r);
            addToast({ type: 'success', message: 'Pricing rule updated.' });
            await loadPricingRules(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
            throw e;
        }
    };

    const deletePricingRule = async (id: string) => {
        try {
            await deletePricingRuleAPI(id);
            addToast({ type: 'success', message: 'Rule removed.' });
            await loadPricingRules(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Deletion failed.' });
        }
    };

    const addWarehouse = async (c: any) => {
        try {
            await addWarehouseAPI(c);
            addToast({ type: 'success', message: 'Warehouse added.' });
            await loadWarehouseConfigurations(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Creation failed.' });
        }
    };

    const updateWarehouseConfiguration = async (c: WarehouseConfiguration) => {
        try {
            await updateWarehouseAPI(c);
            addToast({ type: 'success', message: 'Configuration saved.' });
            await loadWarehouseConfigurations(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    const addUser = async (u: any) => {
        try {
            await addUserAPI(u);
            addToast({ type: 'success', message: 'User created.' });
            await loadUsers(true);
        } catch (e) {
            addToast({ type: 'error', message: 'User creation failed.' });
        }
    };

    const updateUser = async (u: User) => {
        try {
            await updateUserAPI(u);
            addToast({ type: 'success', message: 'User profile updated.' });
            await loadUsers(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    const toggleUserStatus = async (id: string, active: boolean) => {
        try {
            await toggleUserStatusAPI(id, active);
            addToast({ type: 'success', message: `User ${active ? 'activated' : 'deactivated'}.` });
            await loadUsers(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Status update failed.' });
        }
    };

    const createRma = async (data: any) => {
        try {
            await createRmaAPI(data);
            addToast({ type: 'success', message: 'RMA request logged.' });
            await loadRmas(true);
        } catch (e) {
            addToast({ type: 'error', message: 'RMA creation failed.' });
        }
    };

    const updateRmaStatus = async (rma: RMA, status: RMAStatus) => {
        try {
            await updateRmaAPI({ ...rma, status });
            addToast({ type: 'success', message: `RMA updated to ${status}.` });
            await loadRmas(true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    const completeRmaAndRestock = async (rma: RMA) => {
        try {
            // Restocking logic: increment inventory for each item
            for (const item of rma.items) {
                await updateStockQuantityAPI(item.productId, item.quantity, null, currentUser?.id || '0');
            }
            await updateRmaAPI({ ...rma, status: 'Completed' });
            addToast({ type: 'success', message: 'RMA completed and items restocked.' });
            await Promise.all([loadRmas(true), loadStocks(true)]);
        } catch (e) {
            addToast({ type: 'error', message: 'Finalization failed.' });
        }
    };

    const addSupplierReturn = async (data: any) => {
        try {
            await createSupplierReturnAPI(data);
            addToast({ type: 'success', message: 'Return to vendor request initiated.' });
            await loadSupplierReturns('all', true);
        } catch (e) {
            addToast({ type: 'error', message: 'Initiation failed.' });
        }
    };

    const updateSupplierReturnStatus = async (id: string, status: SupplierReturnStatus) => {
        try {
            await updateSupplierReturnStatusAPI(id, status);
            addToast({ type: 'success', message: `Return status updated to ${status}.` });
            await loadSupplierReturns('all', true);
        } catch (e) {
            addToast({ type: 'error', message: 'Update failed.' });
        }
    };

    // --- Selectors & Getters ---
    const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);
    const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);
    const getStockForProduct = useCallback((id: string) => stocks.filter(s => s.productId === id), [stocks]);
    const getCategoryById = useCallback((id: string) => categories.find(c => c.id === id), [categories]);
    const getOrderById = useCallback((id: string) => orders.find(o => o.id === id), [orders]);
    const getLocationById = useCallback((id: string | null) => locations.find(l => l.id === id), [locations]);
    const getSupplierById = useCallback((id: string) => suppliers.find(s => s.id === id), [suppliers]);
    const getPricingRuleById = useCallback((id: string | undefined) => pricingRules.find(r => r.id === id), [pricingRules]);
    const getWarehouseById = useCallback((id: string) => warehouseConfigurations.find(w => w.id === id), [warehouseConfigurations]);

    const fetchProductById = useCallback(async (id: string) => {
        try { return await getProductByIdAPI(id); } catch { return undefined; }
    }, []);

    const fetchUserById = useCallback(async (id: string) => {
        try { return await getUserByIdAPI(id); } catch { return undefined; }
    }, []);

    const fetchLocationById = useCallback(async (id: string) => {
        try { return await getLocationByIdAPI(id); } catch { return undefined; }
    }, []);

    const fetchPricingRuleById = useCallback(async (id: string) => {
        try { return await getPricingRuleByIdAPI(id); } catch { return undefined; }
    }, []);

    const fetchOrderById = useCallback(async (id: string) => {
        try { return await getOrderByIdAPI(id); } catch { return undefined; }
    }, []);

    // --- Interactive Guides ---
    const startGuide = (name: GuideName) => {
        setActiveGuide(name);
        setGuideStep(0);
    };

    const endGuide = useCallback(() => {
        setActiveGuide(null);
        setGuideStep(0);
    }, []);

    const goToNextGuideStep = () => setGuideStep(s => s + 1);
    const goToPrevGuideStep = () => setGuideStep(s => Math.max(0, s - 1));

    // --- Context Value ---
    const value: AppContextType = {
        dataState, loadUsers, loadProducts, loadCategories, loadLocations, loadZones, loadStocks,
        loadInboundShipments, loadOrders, loadRmas, loadPickLists, loadPackedOrders,
        loadCycleCounts, loadSuppliers, loadPurchaseOrders, loadStockMovements, loadStockAdjustments,
        loadPricingRules, loadWarehouseConfigurations, loadPutAwayRecords, loadSupplierReturns,
        users, currentUser, hasPermission, addUser, updateUser, toggleUserStatus, getUserById, fetchUserById,
        products, stocks, categories, suppliers, addProduct, updateProduct, deleteProduct, adjustStock,
        getProductById, getStockForProduct, getCategoryById, getOrderById, fetchProductById,
        addCategory, updateCategory, deleteCategory,
        locations, zones, addLocation, updateLocation, deleteLocation, addZone, getLocationById, fetchLocationById,
        inboundShipments, pickLists, packedOrders, cycleCounts, 
        putAwayItem, putAwayShipment, putAwayItems,
        createPickList, updatePickStatus, pickAllItemsForOrder, packOrder, packFullOrder, shipOrder: shipFullOrder,
        createCycleCount, saveCycleCount, finalizeCycleCount, shipFullOrder,
        orders, rmas, addOrder, updateOrderStatus, deleteOrder, createRma, updateRmaStatus, completeRmaAndRestock,
        purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, getSupplierById,
        updatePurchaseOrderStatus, receivePurchaseOrderItems, addSupplier, updateSupplier, deleteSupplier,
        pricingRules, getPricingRuleById, addPricingRule, updatePricingRule, deletePricingRule, fetchPricingRuleById,
        fetchOrderById, warehouseConfigurations, addWarehouse, updateWarehouseConfiguration, getWarehouseById,
        stockMovements, stockAdjustments, kpis,
        startGuide, activeGuide, guideStep, endGuide, goToNextGuideStep, goToPrevGuideStep,
        putAwayRecords, finalizePutAwayShipment,
        supplierReturns, addSupplierReturn, updateSupplierReturnStatus
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within AppProvider');
    return context;
};
