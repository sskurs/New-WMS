import { User, Role } from '../types';
import { apiClient } from './apiClient';

// --- Helpers ---

const mapRoleIdToRole = (roleId: number): Role => {
    switch (roleId) {
        case 1: return 'Admin';
        case 4: return 'Warehouse Manager';
        case 2: return 'Picker';
        case 3: return 'Receiver';
        case 5: return 'Analyst';
        default: return 'Analyst'; // Fallback for unknown roles
    }
};

const mapRoleToRoleId = (role: Role): number => {
    switch (role) {
        case 'Admin': return 1;
        case 'Warehouse Manager': return 4;
        case 'Picker': return 2;
        case 'Receiver': return 3;
        case 'Analyst': return 5;
        default: return 5; // Default to least privileged
    }
};

const mapUserFromAPI = (apiUser: any): User => {
    const fullName = apiUser.fullName || apiUser.displayName || '';
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    const getGender = (genderString?: string): string => {
        if (!genderString) return 'Other';
        const lowerGender = genderString.toLowerCase();
        if (lowerGender === 'm' || lowerGender === 'male') {
            return 'Male';
        }
        if (lowerGender === 'f' || lowerGender === 'female') {
            return 'Female';
        }
        return 'Other';
    };

    return {
        id: apiUser.userId,
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        userName: apiUser.userName,
        officialEmail: apiUser.emailId,
        personalEmail: apiUser.personalEmail,
        contactNo: apiUser.contactNo,
        gender: getGender(apiUser.gender),
        role: mapRoleIdToRole(apiUser.roleId),
        isActive: apiUser.isActive === 1,
        salutation: apiUser.salutation,
        displayName: apiUser.displayName,
        doj: apiUser.doj,
        branchId: apiUser.branchId?.toString(),
        departmentId: apiUser.departmentId?.toString(),
        remarks: apiUser.remarks,
    };
};

// --- API Calls ---

export const getUsers = async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: any[] }>('/User/GetAll');
    if (response && Array.isArray(response.data)) {
        return response.data.map(mapUserFromAPI);
    }
    console.error("Unexpected API response structure for getUsers:", response);
    return [];
};

export const getUserByIdAPI = async (userId: string): Promise<User> => {

    try {
        const numericId = parseInt(userId.replace(/[^0-9]/g, ''), 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid user ID format: ${userId}`);
        }
        
        const response = await apiClient.get<any>(`/User/GetById?id=${numericId}`);
        
        let userData = response?.data || response;
        if (Array.isArray(userData) && userData.length > 0) {
            userData = userData[0];
        }

        if (!userData || !userData.userId) {
            throw new Error(`User with ID ${userId} not found or response was invalid.`);
        }

        return mapUserFromAPI(userData);
    } catch (error) {
        console.error(`Failed to fetch user with ID ${userId}:`, error);
        throw new Error('User not found or failed to load.');
    }
};

export const getMeAPI = (): Promise<User> => apiClient.get('/users/me');

export const addUserAPI = (user: any): Promise<any> => {
    debugger;
    const payload = {
        userName: user.userName,
        passwordHash: user.password,
        salutation: user.salutation,
        fullName: user.fullName,
        displayName: user.displayName,
        doj: user.doj,
        gender: user.gender,
        roleId: mapRoleToRoleId(user.role),
        branchId: Number(user.branchId),
        departmentId: Number(user.departmentId),
        emailId: user.officialEmail,
        personalEmail: user.personalEmail,
        contactNo: user.contactNo,
        remarks: user.remarks,
    };
    return apiClient.post('/User/Create', payload);
};

export const updateUserAPI = async (user: User): Promise<User> => {
    const payload = {
        userId: user.id,
        userName: user.userName,
        passwordHash: "", // Not updating password here, but required by backend
        salutation: user.salutation || "Mr.", // Default to avoid null
        fullName: user.name,
        displayName: user.displayName || user.name,
        doj: user.doj,
        gender: user.gender,
        roleId: mapRoleToRoleId(user.role),
        branchId: user.branchId ? Number(user.branchId) : 1,
        departmentId: user.departmentId ? Number(user.departmentId) : 3,
        personalEmail: user.personalEmail || "",
        contactNo: user.contactNo,
        remarks: user.remarks || "",
        // Fields from old payload that might be aliases for backend compatibility
        emailId: user.officialEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        mobileNo: user.contactNo,
    };
    const response = await apiClient.put<any>(`/User/Update`, payload);
    const updatedApiUser = response.data || response;
    return mapUserFromAPI(updatedApiUser);
};

export const toggleUserStatusAPI = (userId: string, isActive: boolean): Promise<any> => {
    // The API endpoint expects a numeric value for the user's status.
    // isActive: 1 means the user should be active.
    // isActive: 0 means the user should be inactive.
    const isActiveNumber = isActive ? 1 : 0;
    const payload = {
        userId: parseInt(userId, 10),
        isActive: isActiveNumber,
    };
    return apiClient.put(`/User/UpdateStatus`, payload);
};