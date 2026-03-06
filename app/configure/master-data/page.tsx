'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import { Tag, Scale, Tags, ArrowRight, Settings } from 'lucide-react';

const MasterDataCard = ({ icon: Icon, title, description, href, colorClass }: { icon: React.ElementType, title: string, description: string, href: string, colorClass: string }) => {
    const router = useRouter();
    return (
        <Card className="hover:border-primary transition-colors cursor-pointer group" onClick={() => router.push(href)}>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full bg-muted`}>
                        <Icon className={`w-6 h-6 ${colorClass}`} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{description}</p>
                 <div className="mt-4 text-sm font-semibold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Go to {title} <ArrowRight className="w-4 h-4" />
                </div>
            </CardContent>
        </Card>
    );
}

const MasterDataPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                    <Settings className="w-8 h-8 text-primary" />
                    Master Data Management
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Central hub for managing core business entities like categories, units of measure, and pricing rules.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MasterDataCard
                    icon={Tag}
                    title="Categories"
                    description="Define and organize product categories for better inventory classification."
                    href="/configure/master-data/categories"
                    colorClass="text-violet-500"
                />
                <MasterDataCard
                    icon={Scale}
                    title="Units of Measure"
                    description="Manage units for product packaging and measurement, such as 'Each', 'Case', or 'Kg'."
                    href="/configure/uom"
                    colorClass="text-sky-500"
                />
                <MasterDataCard
                    icon={Tags}
                    title="Pricing Rules"
                    description="Create and manage pricing strategies, discounts, and rules for different customer groups."
                    href="/configure/pricing"
                    colorClass="text-emerald-500"
                />
            </div>
        </div>
    );
};

export default MasterDataPage;