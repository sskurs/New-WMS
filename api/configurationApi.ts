import { PricingRule, WarehouseConfiguration, Category, WarehouseOperatingHours, WarehouseOrderProcessing, WarehouseInventoryManagement, WarehouseNotifications } from '../types';
import { apiClient } from './apiClient';

// --- Default objects for robust mapping ---
const defaultOperatingHours: WarehouseOperatingHours[] = [
    { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 'Saturday', isOpen: false, openTime: '', closeTime: '' },
    { day: 'Sunday', isOpen: false, openTime: '', closeTime: '' },
];
const defaultOrderProcessing: WarehouseOrderProcessing = { autoAssignOrders: true, priorityRule: 'First In, First Out', defaultBatchSize: 50, requireQualityCheck: false };
const defaultInventoryManagement: WarehouseInventoryManagement = { lowStockThresholdPercentage: 15, autoReorder: false, cycleCountFrequency: 'Monthly', enableLotTracking: false };
const defaultNotifications: WarehouseNotifications = { email: { lowStock: true, orderCompletion: false, systemAlerts: true, dailyReports: false }, push: { urgentTasks: true, taskAssignments: true, deadlineReminders: false, statusUpdates: false }, recipients: '' };

// --- Mappers ---
const mapCategoryFromAPI = (apiCategory: any): Category => {
    return {
        id: String(apiCategory.categoryId || apiCategory.id),
        name: apiCategory.categoryName || apiCategory.name,
    };
};

const mapPriorityFromApi = (priority: number): 'Low' | 'Medium' | 'High' => {
    // This mapping is a best-effort interpretation based on common patterns.
    if (priority > 1) return 'High';
    if (priority === 1) return 'Medium';
    return 'Low';
};

const mapPricingRuleFromAPI = (apiRule: any): PricingRule => ({
    id: String(apiRule.pricingRuleId),
    name: apiRule.ruleName,
    description: apiRule.description,
    priority: mapPriorityFromApi(apiRule.priority),
    minQuantity: apiRule.minQuantity,
    maxQuantity: apiRule.maxQuantity,
    startDate: apiRule.startDate,
    endDate: apiRule.endDate,
    discountPercentage: apiRule.discountPercentage,
    fixedPrice: apiRule.fixedPrice,
    markupPercentage: apiRule.markupPercentage,
    isActive: apiRule.isActive === 1,
});

const mapWarehouseFromAPI = (apiWarehouse: any): WarehouseConfiguration => {
    // Address is now built from individual lines, city, state, pin for consistency.
    const addressParts = [
        apiWarehouse.addressLine1,
        apiWarehouse.addressLine2,
        apiWarehouse.city, // Assuming city/state are now strings from the API
        apiWarehouse.state,
        apiWarehouse.pin
    ];
    const address = addressParts.filter(Boolean).join(', ');

    return {
        id: String(apiWarehouse.pkWarehouseId),
        pkWarehouseId: String(apiWarehouse.pkWarehouseId),
        name: apiWarehouse.warehouseName,
        warehouseName: apiWarehouse.warehouseName,
        warehouseType: apiWarehouse.warehouseType,
        phone: apiWarehouse.phoneNo,
        address: address, // This is the composite address string
        addressLine1: apiWarehouse.addressLine1 || '',
        addressLine2: apiWarehouse.addressLine2 || '',
        city: apiWarehouse.city || '',
        state: apiWarehouse.state || '',
        pin: apiWarehouse.pin ? String(apiWarehouse.pin) : '',
        // Provide sensible defaults for the full configuration object
        code: `WH-${apiWarehouse.pkWarehouseId}`,
        description: apiWarehouse.description || '',
        managerName: apiWarehouse.managerName || 'N/A',
        email: apiWarehouse.email || 'N/A',
        emergencyContact: apiWarehouse.emergencyContact || 'N/A',
        timezone: apiWarehouse.timezone || 'Asia/Kolkata',
        operatingHours: defaultOperatingHours,
        dockDoors: { inbound: 2, outbound: 2 },
        defaultEnvironmentalFactor: 'Standard',
        locationNamingConvention: 'ZONE-RACK-SHELF-BIN',
        orderProcessing: defaultOrderProcessing,
        inventoryManagement: defaultInventoryManagement,
        notifications: defaultNotifications
    };
};


// --- Getters ---
export const getWarehouseConfigurations = async (): Promise<WarehouseConfiguration[]> => {
    try {
        const response = await apiClient.get<any>('/GetAllWarehouses');
        const responseData = response.data || response;
        if (responseData && Array.isArray(responseData)) {
            return responseData.map(mapWarehouseFromAPI);
        }
        console.error("Unexpected API response for getWarehouseConfigurations:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch warehouse configurations:", error);
        throw error;
    }
};
export const getCategoriesDropdown = async (): Promise<Category[]> => {
    try {
        // Per user request, fetching categories from GET /Category
        const response = await apiClient.get<any>('/Category');
        const data = response.data || response; // Handle both wrapped and unwrapped responses

        if (Array.isArray(data)) {
            // Use the existing mapper to handle potential inconsistencies in field names.
            return data.map(mapCategoryFromAPI);
        }
        
        console.error("Unexpected API response for getCategoriesDropdown. Expected an array. Received:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch categories dropdown:", error);
        throw error;
    }
};



// --- Pricing Rules ---
export const getPricingRules = async (): Promise<PricingRule[]> => {
    try {
        const response = await apiClient.get<any>('/Product/GetAllPricingRules');
        
        if (response && response.status === 'success' && Array.isArray(response.data)) {
            return response.data.map(mapPricingRuleFromAPI);
        }
        
        console.error("Unexpected API response for getPricingRules:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch pricing rules:", error);
        return [];
    }
};

export const addPricingRuleAPI = async (rule: Partial<Omit<PricingRule, 'id'>>): Promise<PricingRule> => {
    // FIX: Widened the type of the 'priority' parameter to 'string | undefined' to match the 'PricingRule' type
    // and prevent a TypeScript error. This makes the function more robust.
    const mapPriorityToApi = (priority: string | undefined): number => {
        if (priority === 'High') return 2;
        if (priority === 'Medium') return 1;
        return 0; // Default to Low
    };

    const now = new Date();
    const future = new Date();
    future.setFullYear(now.getFullYear() + 1);

    const payload = {
        applicableId: 0,
        createdBy: 0,
        description: rule.description || "",
        discountPercentage: rule.discountPercentage || 0,
        endDate: rule.endDate ? new Date(rule.endDate).toISOString() : future.toISOString(),
        fixedPrice: rule.fixedPrice || 0,
        isActive: rule.isActive ? 1 : 0,
        markupPercentage: rule.markupPercentage || 0,
        maxQuantity: rule.maxQuantity || 0,
        minQuantity: rule.minQuantity || 0,
        modifiedBy: 0,
        priority: mapPriorityToApi(rule.priority),
        ruleName: rule.name,
        startDate: rule.startDate ? new Date(rule.startDate).toISOString() : now.toISOString(),
    };
    const response = await apiClient.post<any>('/Product/CreatePricingRule', payload);
    return mapPricingRuleFromAPI(response.data || response);
};

export const updatePricingRuleAPI = async (updatedRule: PricingRule): Promise<PricingRule> => {
    const mapPriorityToApi = (priority: string | undefined): number => {
        if (priority === 'High') return 2;
        if (priority === 'Medium') return 1;
        return 0; // Default to Low
    };

    const payload = {
        pricingRuleId: Number(updatedRule.id),
        applicableId: 0,
        createdBy: 0, // Not available on frontend, sending default
        description: updatedRule.description || "",
        discountPercentage: updatedRule.discountPercentage || 0,
        endDate: updatedRule.endDate ? new Date(updatedRule.endDate).toISOString() : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        fixedPrice: updatedRule.fixedPrice || 0,
        isActive: updatedRule.isActive ? 1 : 0,
        markupPercentage: updatedRule.markupPercentage || 0,
        maxQuantity: updatedRule.maxQuantity || 0,
        minQuantity: updatedRule.minQuantity || 0,
        modifiedBy: 0, // Will be set by backend, sending default
        priority: mapPriorityToApi(updatedRule.priority),
        ruleName: updatedRule.name,
        startDate: updatedRule.startDate ? new Date(updatedRule.startDate).toISOString() : new Date().toISOString(),
    };
    const response = await apiClient.put<any>('/Product/UpdatePricingRule', payload);
    return mapPricingRuleFromAPI(response.data || response);
};

export const deletePricingRuleAPI = (ruleId: string): Promise<null> => {
    const numericId = parseInt(ruleId.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numericId)) {
        return Promise.reject(new Error(`Invalid pricing rule ID format: ${ruleId}`));
    }
    return apiClient.delete(`/Product/DeletePricingRule/${numericId}`);
};

export const getPricingRuleByIdAPI = async (ruleId: string): Promise<PricingRule> => {
    try {
        const numericId = parseInt(ruleId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid pricing rule ID format: ${ruleId}`);
        }
        const response = await apiClient.get<any>(`/Product/GetPricingRuleById/${numericId}`);
        
        // This logic is designed to handle multiple inconsistent response formats from the backend.
        let ruleData = response;

        // Case 1: Response is { data: [ {...} ] } or { data: {...} } or { success: '...', data: [...] }
        if (ruleData && ruleData.data) {
            ruleData = ruleData.data;
        }

        // Case 2: Data is a stringified JSON array
        if (typeof ruleData === 'string' && ruleData.startsWith('[') && ruleData.endsWith(']')) {
            try {
                ruleData = JSON.parse(ruleData);
            } catch (e) { /* ignore parse error, proceed as is */ }
        } else if (ruleData && typeof ruleData.data === 'string' && ruleData.data.startsWith('[') && ruleData.data.endsWith(']')) {
             try {
                ruleData = JSON.parse(ruleData.data);
            } catch (e) { /* ignore parse error */ }
        }

        // Case 3: Data is wrapped in an array, take the first element
        if (Array.isArray(ruleData) && ruleData.length > 0) {
            ruleData = ruleData[0];
        }

        // Final check: Does the resulting object look like a pricing rule?
        if (ruleData && ruleData.pricingRuleId) {
            return mapPricingRuleFromAPI(ruleData);
        }
        
        // If we reach here, none of the parsing strategies worked.
        console.error(`Failed to parse pricing rule response for ID ${ruleId}. Raw response:`, response);
        throw new Error('Pricing rule not found or response was invalid.');
    } catch (error) {
        console.error(`Failed to fetch pricing rule with ID ${ruleId}:`, error);
        throw error;
    }
};


const mapWarehouseToApiCreatePayload = (config: Partial<Omit<WarehouseConfiguration, 'id'>>) => {
    const now = new Date().toISOString();
    return {
        fkCompanyId: 0,
        warehouseName: config.name || '',
        warehouseType: config.warehouseType || 'General',
        phoneNo: config.phone || '',
        addressLine1: config.addressLine1 || '',
        addressLine2: config.addressLine2 || '',
        city: 0, // Per payload spec, city is numeric. Form collects string.
        state: 0, // Per payload spec, state is numeric. Form collects string.
        pin: config.pin ? parseInt(config.pin, 10) : 0,
        createdOn: now,
        createdBy: 0, // Placeholder
        modifiedOn: now,
        modifiedBy: 0, // Placeholder
        isArchived: false,
        isActive: true,
        flagId: 0
    };
};

const mapWarehouseToApiUpdatePayload = (config: WarehouseConfiguration) => {
    const now = new Date().toISOString();
    return {
        pkWarehouseId: config.pkWarehouseId ? parseInt(config.pkWarehouseId, 10) : 0,
        fkCompanyId: 0,
        warehouseName: config.name || '',
        warehouseType: config.warehouseType || 'General',
        phoneNo: config.phone || '',
        addressLine1: config.addressLine1 || '',
        addressLine2: config.addressLine2 || '',
        city: 0,
        state: 0,
        pin: config.pin ? parseInt(config.pin, 10) : 0,
        createdOn: now, // Should be ignored by backend on update
        createdBy: 0,
        modifiedOn: now,
        modifiedBy: 0, // Backend should set this from token
        isArchived: false,
        isActive: true,
        flagId: 0
    };
};

// --- Warehouse Configuration ---
export const addWarehouseAPI = async (config: Omit<WarehouseConfiguration, 'id'>): Promise<WarehouseConfiguration> => {
    const payload = mapWarehouseToApiCreatePayload(config);
    const response = await apiClient.post<any>('/CreateWarehouse', payload);
    const newApiWarehouse = response.data || response;
    
    // Assuming the response is the newly created object
    if (newApiWarehouse && newApiWarehouse.pkWarehouseId) {
         return mapWarehouseFromAPI(newApiWarehouse);
    }
    
    // Fallback if response is not as expected
    return {
        ...config,
        id: `temp-${Date.now()}`,
        pkWarehouseId: `temp-${Date.now()}`,
        address: `${config.addressLine1}, ${config.city}`
    };
};

export const updateWarehouseAPI = async (config: WarehouseConfiguration): Promise<WarehouseConfiguration> => {
    const payload = mapWarehouseToApiUpdatePayload(config);
    await apiClient.put<any>('/UpdateWarehouse', payload);
    // On success, return the config object that was sent, as the API may not return the full updated object.
    return config;
};

// --- Category APIs ---
export const addCategoryAPI = async (category: Omit<Category, 'id'>): Promise<Category> => {
    const now = new Date().toISOString();
    const payload = {
      categoryId: 0,
      categoryName: category.name,
      createdOn: now,
      createdBy: 0,
      modifiedOn: now,
      modifiedBy: 0,
      isArchived: 0,
      isActive: 1
    };
    const response = await apiClient.post<any>('/Category/Create', payload);
    const newApiCategory = response.data || response;
    return mapCategoryFromAPI(newApiCategory);
};

export const updateCategoryAPI = async (category: Category): Promise<Category> => {
    const now = new Date().toISOString();
    const payload = {
        categoryId: parseInt(category.id, 10),
        categoryName: category.name,
        modifiedOn: now,
        modifiedBy: 0, // Assuming system/default user as per example
        isActive: 1,   // Per user payload example
        isArchived: 0  // Per user payload example
    };
    const response = await apiClient.put<any>('/Category/update', payload);
    const updatedApiCategory = response.data || response;
    return mapCategoryFromAPI(updatedApiCategory);
};

export const deleteCategoryAPI = async (categoryId: string): Promise<void> => {
    const numericId = parseInt(categoryId, 10);
    if (isNaN(numericId)) {
        throw new Error(`Invalid category ID format: ${categoryId}`);
    }
    const payload = {
        id: numericId
    };
    await apiClient.delete('/Category/delete', payload);
};