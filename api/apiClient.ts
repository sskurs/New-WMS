import { getToken, clearToken } from '@/api/utils';

const API_BASE_URL = '/api';

async function fetchApi(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (url !== '/authentication/Auth/Login') {
        const token = getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });
    
    if (response.status === 204) {
        return null;
    }
    
    if (response.status === 401 && url !== '/authentication/Auth/Login') {
        clearToken();
        window.location.href = '/login';
        return new Promise(() => {});
    }

    if (!response.ok) {
        let errorMessage;
        try {
            const errorBody = await response.json();
            // CRITICAL FIX: Use the 'in' operator to check for property existence. 
            // Previous check 'if (errorBody.stockId)' failed when stockId was 0.
            if (errorBody && ('stockId' in errorBody || 'productId' in errorBody)) {
                errorMessage = JSON.stringify(errorBody);
            } else {
                errorMessage = errorBody.message || 
                               errorBody.title || 
                               errorBody.error || 
                               (Array.isArray(errorBody.errors) && errorBody.errors[0]) || 
                               JSON.stringify(errorBody);
            }
        } catch (e) {
            try {
                errorMessage = await response.text();
                 if (!errorMessage) {
                    errorMessage = `Request failed with status: ${response.status} ${response.statusText}`;
                }
            } catch (textError) {
                 errorMessage = `Request failed with status: ${response.status} ${response.statusText}, and the error body could not be read.`;
            }
        }
        throw new Error(errorMessage);
    }
    
    return response.json();
}

export const apiClient = {
    get: <T>(url: string, options?: RequestInit): Promise<T> => fetchApi(url, { method: 'GET', ...options }),
    post: <T>(url: string, body: any): Promise<T> => fetchApi(url, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body: any): Promise<T> => fetchApi(url, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(url: string, body?: any): Promise<T> => fetchApi(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
