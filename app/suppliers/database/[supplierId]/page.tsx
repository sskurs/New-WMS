'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { PurchaseOrder } from '@/types';
import Link from 'next/link';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table, { TableHeader } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { formatCurrency, formatDate } from '@/api/utils';
import { useToast } from '@/contexts/ToastContext';
// FIX: Import the 'User' icon from 'lucide-react' to resolve the 'Cannot find name' error.
import { ArrowLeft, Edit, Mail, Phone, Globe, MapPin, DollarSign, PackageOpen, Package, ShoppingCart, User } from 'lucide-react';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color.replace('text-', 'bg-')}/20 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="ml-4 overflow-hidden">
                <p className="text-2xl font-bold text-foreground truncate">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);


const SupplierDetailPage: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const supplierId = params.supplierId as string;
    const { addToast } = useToast();

    const { 
        getSupplierById, 
        purchaseOrders,
        loadSuppliers, 
        loadPurchaseOrders, 
        dataState 
    } = useAppContext();

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        if (!dataState.suppliers.loaded) {
            loadSuppliers();
        }
        if (!dataState.purchaseOrders.loaded) {
            loadPurchaseOrders();
        }
    }, [dataState, loadSuppliers, loadPurchaseOrders]);

    const supplier = useMemo(() => {
        if (!dataState.suppliers.loaded) return undefined;
        return getSupplierById(supplierId);
    }, [supplierId, getSupplierById, dataState.suppliers.loaded]);

    useEffect(() => {
        if (dataState.suppliers.loaded && !supplier) {
            addToast({type: 'error', message: 'Supplier not found.'});
            router.replace('/suppliers/database');
        }
    }, [supplier, dataState.suppliers.loaded, router, addToast]);
    
    const supplierPOs = useMemo(() => {
        return (purchaseOrders || [])
            .filter(po => po.supplierId === supplierId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseOrders, supplierId]);
    
    const stats = useMemo(() => {
        const totalPoValue = supplierPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
        const openPoCount = supplierPOs.filter(po => ['Issued', 'Partially Received'].includes(po.status)).length;
        const uniqueProducts = new Set(supplierPOs.flatMap(po => po.items.map(item => item.productId))).size;

        return { totalPoValue, openPoCount, uniqueProducts };
    }, [supplierPOs]);

    const paginatedPOs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return supplierPOs.slice(startIndex, startIndex + itemsPerPage);
    }, [supplierPOs, currentPage]);

    const getStatusPillClasses = (status: PurchaseOrder['status']) => {
        const colors = {
            Draft: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
            Issued: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Partially Received': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
            Received: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
            Cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
        };
        return colors[status];
    };
    
    const poTableHeaders: TableHeader[] = ['PO Number', 'Status', 'Date', 'Items', 'Amount'];


    if (!dataState.suppliers.loaded || !dataState.purchaseOrders.loaded || !supplier) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <div className="flex items-center gap-3">
                    <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-lg text-muted-foreground">Loading Supplier Details...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Supplier: {supplier.name}</h1>
                    <p className="text-sm text-muted-foreground">Detailed information and order history.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" onClick={() => router.push('/suppliers/database')}>
                        <ArrowLeft className="h-4 w-4 mr-2 -ml-1" />
                        Back to List
                    </Button>
                    <Button onClick={() => router.push(`/suppliers/database/${supplier.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2 -ml-1" />
                        Edit Supplier
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <h2 className="text-xl font-semibold text-foreground">Contact Information</h2>
                             <span className={`px-2 py-1 text-xs font-semibold rounded-full ${supplier.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                {supplier.status}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem icon={User} label="Contact Person" value={supplier.contactPerson} />
                            <InfoItem icon={Mail} label="Email" value={supplier.email} href={`mailto:${supplier.email}`} />
                            <InfoItem icon={Phone} label="Phone" value={supplier.phone} href={`tel:${supplier.phone}`} />
                            <InfoItem icon={Globe} label="Website" value={supplier.website || 'N/A'} href={supplier.website} target="_blank" />
                        </div>
                        <div className="pt-4 border-t">
                            <InfoItem icon={MapPin} label="Address" value={`${supplier.address}, ${supplier.city}, ${supplier.state} ${supplier.zipCode}, ${supplier.country}`} />
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <StatCard icon={DollarSign} title="Total PO Value" value={formatCurrency(stats.totalPoValue)} color="text-emerald-500" />
                    <StatCard icon={PackageOpen} title="Open POs" value={stats.openPoCount} color="text-amber-500" />
                    <StatCard icon={Package} title="Unique Products" value={stats.uniqueProducts} color="text-sky-500" />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold text-foreground">Purchase Order History</h2>
                </CardHeader>
                <CardContent>
                    <Table headers={poTableHeaders}>
                        {paginatedPOs.map(po => (
                            <tr key={po.id} className="hover:bg-accent">
                                <td className="px-6 py-4">
                                    <Link href={`/suppliers/purchase-orders/${po.id}/edit`} className="font-medium text-primary hover:underline">
                                        {po.poNumber}
                                    </Link>
                                </td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusPillClasses(po.status)}`}>{po.status}</span></td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(po.createdAt)}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{po.items.length}</td>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{formatCurrency(po.totalAmount || 0)}</td>
                            </tr>
                        ))}
                    </Table>
                </CardContent>
                {supplierPOs.length > itemsPerPage && (
                    <CardFooter>
                         <Pagination itemsPerPage={itemsPerPage} totalItems={supplierPOs.length} currentPage={currentPage} paginate={setCurrentPage} />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

const InfoItem: React.FC<{icon: React.ElementType, label: string, value: string, href?: string, target?: string}> = ({ icon: Icon, label, value, href, target}) => (
    <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {href ? (
                <a href={href} target={target} rel="noopener noreferrer" className="font-semibold text-primary hover:underline truncate" title={value}>
                    {value}
                </a>
            ) : (
                <p className="font-semibold text-foreground truncate" title={value}>{value}</p>
            )}
        </div>
    </div>
);


export default SupplierDetailPage;