import { User } from '../types';

const TOKEN_KEY = 'wms_auth_token';
const USER_KEY = 'wms_auth_user';

export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (newToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, newToken);
};

export const clearToken = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
};

export const getPersistedUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
        return JSON.parse(userJson) as User;
    } catch (error) {
        console.error("Failed to parse persisted user data", error);
        return null;
    }
};

export const setPersistedUser = (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearPersistedUser = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
};

/**
 * Formats a date string into a consistent DD/MM/YYYY format.
 */
export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTimeOnly = (date: Date): string => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strTime = `${String(hours)}:${minutes} ${ampm}`;
    return strTime;
}

/**
 * Formats a date string into a consistent HH:MM AM/PM format.
 */
export const formatTime = (date: Date | string | undefined | null): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Invalid Time';
    }
    return formatTimeOnly(d);
};

/**
 * Formats a date string into a consistent DD/MM/YYYY, HH:MM AM/PM format.
 */
export const formatDateTime = (date: Date | string | undefined | null): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    const datePart = formatDate(d);
    const timePart = formatTimeOnly(d);
    return `${datePart}, ${timePart}`;
};

/**
 * Formats a number into a compact Indian Rupee currency string using Lakh/Crore notation.
 * @param value - The numeric value to format.
 * @returns A formatted currency string (e.g., ₹1.2Cr, ₹5.5L, ₹500.00).
 */
export const formatCurrency = (value: number): string => {
    if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
    return `₹${value.toFixed(2)}`;
};