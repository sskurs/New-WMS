

import { Location, LocationStatus, LocationType } from '../types';
import { apiClient } from './apiClient';

// --- Mappers ---

const mapLocationFromAPI = (apiLocation: any): Location => {
    return {
        id: String(apiLocation.pkLocationId || apiLocation.pkZoneId || apiLocation.id || apiLocation.zoneId),
        code: apiLocation.locationCode || apiLocation.code || apiLocation.zoneName,
        name: apiLocation.locationName || apiLocation.name || apiLocation.zoneName,
        type: (apiLocation.locationType || apiLocation.type || 'Zone') as LocationType,
        status: apiLocation.status as LocationStatus || 'Available',
        capacity: apiLocation.capacity || 0,
        currentCapacity: Number(apiLocation.currentCapacity) || 0,
        zone: apiLocation.zoneName || apiLocation.zone,
        address: apiLocation.address,
        latitude: apiLocation.latitude,
        longitude: apiLocation.longitude,
        imageUrl: apiLocation.imageUrl,
        description: apiLocation.description,
        zoneType: apiLocation.zoneType,
        warehouseId: apiLocation.warehouseId || apiLocation.fkWarehouseId || apiLocation.fkLocationId?.toString(),
        isActive: apiLocation.isActive !== 0,
    };
};

const mapLocationToAPIPayload = (location: Omit<Location, 'id'>, userId: string) => {
    const numericUserId = parseInt(userId, 10);
    const nowDate = new Date().toISOString().split('T')[0];
    
    return {
        pkLocationId: 0,
        fkWarehouseId: Number(location.warehouseId),
        locationName: location.name,
        description: location.description || '',
        createdOn: nowDate,
        createdBy: isNaN(numericUserId) ? 0 : numericUserId,
        modifiedOn: nowDate,
        modifiedBy: isNaN(numericUserId) ? 0 : numericUserId,
        isArchived: 0,
        isActive: 1,
        code: location.code,
        name: location.name,
        type: location.type,
        zone: location.zone || '',
        status: location.status,
        address: location.address || '',
        capacity: location.capacity,
        currentCapacity: 0, // Current capacity is 0 on creation
        zoneName: location.zone || '',
        locationCode: location.code,
        locationType: location.type,
        latitude: location.latitude,
        longitude: location.longitude,
        flagId: 1
    };
};


// --- API Calls ---

export const getLocations = async (): Promise<Location[]> => {
    try {
        const response = await apiClient.get<any>('/Location');
        const responseData = response?.data || response;

        let locationDataList: any[] = [];

        // Case 1: Nested, stringified JSON e.g., { data: [ { data: "[...]" } ] }
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0 && typeof response.data[0].data === 'string') {
            try {
                const parsedData = JSON.parse(response.data[0].data);
                if (Array.isArray(parsedData)) {
                    locationDataList = parsedData;
                }
            } catch (e) {
                console.error("Failed to parse nested location data string:", response.data[0].data, e);
                throw new Error("Received malformed location data from the server.");
            }
        }
        // Case 2: Response is { data: [ {...}, {...} ] }
        else if (response && Array.isArray(response.data)) {
            locationDataList = response.data;
        }
        // Case 3: Response is the array itself [ {...}, {...} ]
        else if (Array.isArray(responseData)) {
            locationDataList = responseData;
        }

        if (locationDataList.length > 0) {
            return locationDataList.filter(Boolean).map(mapLocationFromAPI);
        }

        console.error("Unexpected API response structure for getLocations. Response:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch locations:", error);
        throw error;
    }
};

export const getLocationByIdAPI = async (locationId: string): Promise<Location> => {
    try {
        const numericId = parseInt(locationId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid location ID format: ${locationId}`);
        }

        const response = await apiClient.get<any>(`/Location/${numericId}`);

        // This simplified logic handles flat JSON responses, potentially nested under a 'data' key,
        // or returned within an array, which are common patterns in this application's API.
        let locationData = response?.data || response;

        // API sometimes returns the object within an array.
        if (Array.isArray(locationData) && locationData.length > 0) {
            locationData = locationData[0];
        }

        // Handle cases where the data is a stringified JSON object.
        if (typeof locationData.data === 'string') {
            try {
                const parsed = JSON.parse(locationData.data);
                locationData = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch (e) {
                console.error("Failed to parse nested location data string:", locationData.data, e);
                throw new Error('Received malformed location data.');
            }
        }

        if (!locationData || !(locationData.pkLocationId || locationData.locationId || locationData.id || locationData.zoneId)) {
            throw new Error(`Location with ID ${locationId} not found or response was invalid.`);
        }

        return mapLocationFromAPI(locationData);

    } catch (error) {
        console.error(`Failed to fetch location with ID ${locationId}:`, error);
        throw new Error('Location not found or failed to load.');
    }
};

export const getZones = async (): Promise<Location[]> => {
    try {
        const response = await apiClient.get<{ data: any[] }>('/Zone');
        if (response && Array.isArray(response.data)) {
            // FIX: Per user feedback, `pkZoneId` is the correct identifier. Filter out any records
            // from the API that do not have a valid pkZoneId to prevent malformed data (which results
            // in an 'undefined' id) from entering the application state. This resolves the frontend
            // error that was preventing the delete API from being called.
            return response.data
                .filter(zone => zone.pkZoneId != null && String(zone.pkZoneId).trim() !== '' && String(zone.pkZoneId) !== '0')
                .map(mapLocationFromAPI);
        }
        console.error("Unexpected API response structure for getZones:", response);
        return [];
    } catch (error) {
        console.error("Failed to fetch zones:", error);
        throw error;
    }
};

export const addLocationAPI = async (location: Omit<Location, 'id'>, userId: string): Promise<Location> => {
    try {
        const payload = mapLocationToAPIPayload(location, userId);
        const newApiLocation = await apiClient.post<any>('/Location/Create', payload);
        const createdLocationData = newApiLocation.data || newApiLocation;
        const finalData = Array.isArray(createdLocationData) ? createdLocationData[0] : createdLocationData;
        return mapLocationFromAPI(finalData);
    } catch (error) {
        console.error("Failed to add location:", error);
        throw error;
    }
};

export const addZoneAPI = async (zoneData: {
    name: string;
    zoneType: string;
    description: string;
    warehouseId: string;
}): Promise<Location> => {
    const payload = {
        fkLocationId: Number(zoneData.warehouseId), // Convert to number
        zoneName: zoneData.name,
        zoneType: zoneData.zoneType,
        description: zoneData.description,
        isArchived: 0, // Changed from "No" to 0 (integer)
        isActive: 1,   // Changed from "1" to 1 (integer)
        flag_Id: 1     // Changed from "1" to 1 (integer)
    };
    try {
        const response = await apiClient.post<any>('/Zone/Create', payload);
        const data = response.data || response;
        return mapLocationFromAPI(data);
    } catch (error) {
        console.error("Failed to add Zone:", error);
        throw error;
    }
};

// Specialized API for Shelf
export const addShelfAPI = async (location: Omit<Location, 'id'>, userId: string): Promise<Location> => {
    try {
        const payload = mapLocationToAPIPayload(location, userId);
        const response = await apiClient.post<any>('/rack-management/shelf/create', payload);
        const data = response.data || response;
        return mapLocationFromAPI(data);
    } catch (error) {
        console.error("Failed to add Shelf:", error);
        throw error;
    }
};

// Specialized API for Bin
export const addBinAPI = async (location: Omit<Location, 'id'>, userId: string): Promise<Location> => {
    try {
        const payload = mapLocationToAPIPayload(location, userId);
        const response = await apiClient.post<any>('/stock-management/product-bin-assignment/create', payload);
        const data = response.data || response;
        return mapLocationFromAPI(data);
    } catch (error) {
        console.error("Failed to add Bin:", error);
        throw error;
    }
};

export const updateLocationAPI = async (location: Location): Promise<void> => {
    try {
        const payload = {
            pkLocationId: parseInt(location.id, 10) || 0,
            fkWarehouseId: parseInt(location.warehouseId || '0', 10) || 0,
            locationName: location.name,
            description: location.description || '',
            modifiedOn: new Date().toISOString(),
            modifiedBy: 0, // Placeholder for user ID
            isArchived: 0,
            isActive: 1, // Assume we are updating an active location
            code: location.code,
            name: location.name,
            type: location.type,
            zone: location.zone || '',
            status: location.status,
            address: location.address || '',
            capacity: location.capacity,
            currentCapacity: location.currentCapacity, // This is the important field to update
            zoneName: location.zone || '',
            locationCode: location.code,
            locationType: location.type,
            latitude: location.latitude || 0,
            longitude: location.longitude || 0,
            flagId: 1 // Assuming 1 is a valid flag
        };
        await apiClient.put<any>('/Location/update', payload);
    } catch (error) {
        console.error("Failed to update location:", error);
        throw error;
    }
};

export const updateZoneAPI = async (zone: Location): Promise<void> => {
    try {
        const payload = {
            pkZoneId: parseInt(zone.id, 10),
            fkLocationId: Number(zone.warehouseId),
            zoneName: zone.name,
            zoneType: zone.zoneType || '',
            description: zone.description || '',
            modifiedOn: new Date().toISOString(),
            modifiedBy: 0,
            isArchived: 0,
            isActive: 1,
            flagId: 1
        };
        await apiClient.put<any>('/Zone/update', payload);
    } catch (error) {
        console.error("Failed to update zone:", error);
        throw error;
    }
};

export const deleteLocationAPI = async (locationId: string): Promise<void> => {
    try {
        const numericId = parseInt(locationId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid location ID format: ${locationId}`);
        }
        // The API expects the 'id' in the payload.
        await apiClient.delete('/Location/delete', { id: numericId });
    } catch (error) {
        console.error("Failed to delete location:", error);
        throw error;
    }
};

export const deleteZoneAPI = async (zoneId: string): Promise<void> => {
    try {
        const numericId = parseInt(zoneId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid zone ID format: ${zoneId}`);
        }
        // The API expects 'id' in the payload.
        const response = await apiClient.delete<any>('/Zone/delete', { id: numericId });
        
        // Check for logical failure from backend
        if (response && response.status === false) {
            throw new Error(response.message || 'Failed to delete zone: It might be occupied.');
        }
    } catch (error) {
        console.error("Failed to delete zone:", error);
        throw error;
    }
};
