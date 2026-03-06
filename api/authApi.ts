import { User, Role } from '../types';
import { apiClient } from './apiClient';

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

// Map role IDs from the new API to the existing Role type in the application.
// This is now consistent with the new login response where Admin roleId is 1.
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

/**
 * Handles the login request to the specified external API endpoint.
 * This function correctly uses the "/authentication/Auth/Login" endpoint.
 * @param credentials The user's username and password.
 * @returns A promise that resolves to a LoginResponse containing the JWT token and user data.
 */
export const loginAPI = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // apiClient will prepend `/api`. The URL will be `/api/authentication/Auth/Login`
    const loginEndpoint = '/authentication/Auth/Login';

    const data = await apiClient.post<any>(loginEndpoint, {
        // The API endpoint expects a 'username' field.
        username: credentials.username,
        password: credentials.password,
    });

    // apiClient throws for non-2xx, but we also check for logical errors in a 2xx response.
    if (data.status !== "success") {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
    }

    // Add robust check for the expected payload structure to prevent runtime errors.
    if (!data.userdata || !Array.isArray(data.userdata) || data.userdata.length === 0 || !data.token || typeof data.token !== 'string') {
        // Log this for debugging, as it indicates a server-side issue.
        console.error("Invalid response structure from login API:", data);
        throw new Error('Invalid response from login server. Please contact support.');
    }

    const apiUser = data.userdata[0];
    const name = apiUser.displayName || apiUser.userName; // Use displayName, fallback to userName
    const nameParts = name.split(' ');

    // Map the API response `userdata` to the application's internal `User` type.
    const user: User = {
        id: apiUser.userId.toString(),
        name: name,
        firstName: nameParts[0] || 'User', // Derive from name
        lastName: nameParts.slice(1).join(' '), // Derive from name
        userName: apiUser.userName,
        officialEmail: apiUser.emailId || apiUser.userName, // Use emailId, fallback to userName
        contactNo: apiUser.contactNo || '',
        gender: 'Other', // Default as not provided in API response
        role: mapRoleIdToRole(apiUser.roleId),
        isActive: apiUser.isActive === 1,
        // Optional fields not present in the new login response
        salutation: undefined,
        displayName: apiUser.displayName,
        doj: undefined,
        branchId: undefined,
        departmentId: undefined,
        personalEmail: undefined,
        remarks: undefined,
    };

    // Prevent inactive users from logging in.
    if (!user.isActive) {
        throw new Error("Your account has been deactivated. Please contact an administrator.");
    }

    const token = data.token;

    return { token, user };
};

export const changePasswordAPI = async (userId: string, userName: string, oldPassword: string, newPassword: string): Promise<void> => {
    // Endpoint: /User/changePassword
    const payload = {
        userId: parseInt(userId, 10),
        userName: userName,
        oldPassword: oldPassword,
        newPassword: newPassword
    };
    
    // Using PUT as requested
    const response = await apiClient.put<any>('/User/changePassword', payload);
    
    const data = response?.data || response;

    // Check for logical failure in 200 response
    if (data && (data.status === 'failed' || data.status === 'failure' || data.success === false)) {
        throw new Error(data.message || 'Invalid Old Password.');
    }
};

export const forgotPasswordAPI = async (email: string): Promise<void> => {
    // Endpoint: /User/ForgotPassword
    // Triggers OTP generation
    await apiClient.post('/User/ForgotPassword', { emailId: email });
};

export const resetPasswordAPI = async (email: string, otp: string, newPassword: string): Promise<void> => {
    // Endpoint: /User/ResetPassword
    await apiClient.post('/User/ResetPassword', { 
        emailId: email,
        otp: otp,
        newPassword: newPassword 
    });
};