'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Lock, User, AlertCircle, ShieldCheck, Zap, BarChart3, ChevronRight, Globe } from 'lucide-react';
import Link from 'next/link';

const FeatureItem = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
        <div className="p-2 rounded-lg bg-primary/20 text-primary-foreground">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h3 className="font-semibold text-white text-sm">{title}</h3>
            <p className="text-white/60 text-xs mt-1 leading-relaxed">{desc}</p>
        </div>
    </div>
);

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const { t, language, setLanguage } = useLocale();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await login({ username, password });
        } catch (err) {
            let message = 'Invalid username or password.';
            if (err instanceof Error && err.message) {
                message = err.message;
            }
            setError(message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#0f172a] overflow-hidden">
            {/* Left Column: Marketing & Branding */}
            <div className="hidden lg:flex w-[40%] relative flex-col justify-between p-12 overflow-hidden border-r border-white/10">
                {/* Background Pattern/Glow */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight leading-none no-bar">WMSPro™</h1>
                            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mt-1">Propix Technologies</p>
                        </div>
                    </div>

                    <div className="mt-20 space-y-10">
                        <div className="max-w-sm">
                            <h2 className="text-4xl font-extrabold text-white leading-[1.1] no-bar">
                                Next-Gen <span className="text-primary">Warehouse</span> Intelligence.
                            </h2>
                            <p className="text-white/60 mt-4 text-lg leading-relaxed">
                                Streamline logistics, optimize inventory, and gain real-time visibility with India's most trusted WMS platform.
                            </p>
                        </div>

                        <div className="grid gap-4 max-w-sm">
                            <FeatureItem 
                                icon={Zap} 
                                title="Real-time Synchronization" 
                                desc="Instant updates across all dock operations and inventory ledgers." 
                            />
                            <FeatureItem 
                                icon={BarChart3} 
                                title="AI-Powered Analytics" 
                                desc="Automated sales forecasting and intelligent put-away suggestions." 
                            />
                            <FeatureItem 
                                icon={Globe} 
                                title="Multi-Location Support" 
                                desc="Manage multiple warehouses seamlessly from a single dashboard." 
                            />
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex justify-between items-center text-white/40 text-xs">
                    <p>&copy; {new Date().getFullYear()} Propix Technologies Pvt. Ltd.</p>
                    <div className="flex gap-4">
                        <button className="hover:text-white transition-colors">Privacy</button>
                        <button className="hover:text-white transition-colors">Terms</button>
                    </div>
                </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[#020617] relative">
                {/* Mobile Background Elements */}
                <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/10 blur-3xl rounded-full" />
                </div>

                <div className="w-full max-w-[420px] space-y-8 relative z-10">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="bg-primary p-2 rounded-lg">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight no-bar">
                            Sign In
                        </h2>
                        <p className="text-white/50 mt-2">
                            Welcome back. Please enter your account details.
                        </p>
                    </div>

                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-8 space-y-6">
                                {error && (
                                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white/70 ml-1">Username</label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                            <Input 
                                                id="username" 
                                                type="text" 
                                                placeholder="admin@propixtech.com"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                                required
                                                className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary transition-all rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-sm font-medium text-white/70">Password</label>
                                            <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold">
                                                Forgot?
                                            </Link>
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                            <Input 
                                                id="password" 
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                                className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-primary transition-all rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-1">
                                    <input 
                                        type="checkbox" 
                                        id="remember" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
                                    />
                                    <label htmlFor="remember" className="text-sm text-white/50 cursor-pointer select-none">
                                        Keep me signed in
                                    </label>
                                </div>

                                <Button type="submit" loading={isLoading} className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 mt-4 group">
                                    Continue
                                    {!isLoading && <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                            </CardContent>
                        </form>
                    </Card>

                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-4 w-full">
                            <div className="h-px bg-white/10 flex-1" />
                            <span className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Regional Access</span>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>
                        
                        <div className="flex gap-4">
                            {['en', 'hi', 'es'].map((lng) => (
                                <button
                                    key={lng}
                                    onClick={() => setLanguage(lng as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        language === lng 
                                            ? 'bg-primary/20 border-primary text-primary' 
                                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {lng.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Developer Credentials Overlay - Discretely placed */}
                    <div className="mt-12 p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-3">Testing Credentials</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <div className="flex gap-2 text-xs">
                                <span className="text-white/40 italic">User:</span>
                                <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded select-all">admin@propixtech.com</code>
                            </div>
                            <div className="flex gap-2 text-xs">
                                <span className="text-white/40 italic">Pass:</span>
                                <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded select-all">Propix@123</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;