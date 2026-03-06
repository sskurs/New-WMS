'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Mail, Key, ArrowLeft, ShieldCheck, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { forgotPasswordAPI, resetPasswordAPI } from '@/api/authApi';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const ForgotPasswordPage = () => {
    const router = useRouter();
    const { addToast } = useToast();
    
    const [step, setStep] = useState<1 | 2>(1); // 1: Email Request, 2: OTP & New Password
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form State
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        setError(null);
        try {
            await forgotPasswordAPI(email);
            addToast({ type: 'success', message: 'OTP sent to your email address.' });
            setStep(2);
        } catch (err) {
            setError((err as Error).message || 'Failed to request OTP. Please verify your email.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword) return;

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await resetPasswordAPI(email, otp, newPassword);
            addToast({ type: 'success', message: 'Password reset successfully! You can now sign in.' });
            router.push('/login');
        } catch (err) {
            setError((err as Error).message || 'Failed to reset password. The OTP may be invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] relative overflow-hidden p-6">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-[420px] space-y-8 relative z-10">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight no-bar">
                        {step === 1 ? 'Reset Password' : 'Verify Identity'}
                    </h1>
                    <p className="text-white/50 mt-2">
                        {step === 1 
                            ? "Enter your email to receive a verification code." 
                            : `We've sent a code to ${email}`}
                    </p>
                </div>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
                    <CardContent className="p-8">
                        {error && (
                            <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {step === 1 ? (
                            <form onSubmit={handleRequestOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/70 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@propixtech.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary transition-all rounded-xl"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" loading={isLoading} className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 group">
                                    Send Code
                                    {!isLoading && <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-6 animate-fadeIn">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70 ml-1">Verification Code</label>
                                        <div className="relative group">
                                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="otp"
                                                placeholder="Enter 6-digit code"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                required
                                                className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary transition-all rounded-xl tracking-widest font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70 ml-1">New Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary transition-all rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70 ml-1">Confirm Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary transition-all rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" loading={isLoading} className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 group">
                                    Reset Password
                                    {!isLoading && <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <div className="text-center">
                    <button 
                        onClick={() => step === 2 ? setStep(1) : router.push('/login')} 
                        className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white transition-colors gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {step === 2 ? 'Back to Email' : 'Back to Login'}
                    </button>
                </div>

                <div className="text-center text-white/30 text-xs">
                    <p>&copy; {new Date().getFullYear()} Propix Technologies Pvt. Ltd.</p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;