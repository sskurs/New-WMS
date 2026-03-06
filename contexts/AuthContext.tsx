
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';
import { LoginCredentials, loginAPI } from '../api/authApi';
import { setToken, clearToken, getToken, setPersistedUser, getPersistedUser, clearPersistedUser } from '@/api/utils';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const restoreSession = () => {
            try {
                const token = getToken();
                const persistedUser = getPersistedUser();

                if (token && persistedUser) {
                    // For this fix, we'll trust the stored data.
                    // In a production app, you might re-validate the token here.
                    setUser(persistedUser);
                }
            } catch (error) {
                console.error("Failed to restore session:", error);
                // Clear any potentially corrupted data
                clearToken();
                clearPersistedUser();
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
        try {
            const { token, user: userData } = await loginAPI(credentials);
            setToken(token);
            setPersistedUser(userData);
            setUser(userData);
        } catch (error) {
            // Clear any stale persisted data on login failure
            clearToken();
            clearPersistedUser();
            throw error;
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        clearToken();
        clearPersistedUser();
        router.push('/login');
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
