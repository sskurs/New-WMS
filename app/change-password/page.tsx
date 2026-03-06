
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext'; // Import AuthContext to access logout
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Lock, Check, ShieldCheck } from 'lucide-react';
import { changePasswordAPI } from '@/api/authApi';
import { useToast } from '@/contexts/ToastContext';

const ChangePasswordPage = () => {
    const { currentUser } = useAppContext();
    const { logout } = useAuth(); // Use logout from AuthContext
    const { addToast } = useToast();
    const router = useRouter();

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            addToast({ type: 'error', message: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            addToast({ type: 'error', message: 'Password must be at least 6 characters long.' });
            return;
        }

        if (!currentUser) return;

        setIsSaving(true);
        try {
            await changePasswordAPI(currentUser.id, currentUser.userName, oldPassword, newPassword);
            addToast({ type: 'success', message: 'Password changed successfully. Please login again.' });
            
            // Logout user to force re-authentication with new credentials
            logout();
        } catch (error) {
            addToast({ type: 'error', message: (error as Error).message || 'Failed to change password.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
                Security Settings
            </h1>
            
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-medium text-foreground">Change Password</h2>
                    <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div>
                            <Input
                                id="oldPassword"
                                label="Current Password"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="pt-2 border-t border-border"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="newPassword"
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <Input
                                id="confirmPassword"
                                label="Confirm New Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3 bg-muted/30">
                        <Button type="button" variant="secondary" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={isSaving}>
                            <Check className="h-4 w-4 mr-2" />
                            Update Password
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ChangePasswordPage;
