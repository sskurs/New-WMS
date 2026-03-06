
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Order, OrderStatus, Product, PricingRule } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import { formatDate } from '@/api/utils';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { Eye, Trash2, MoreHorizontal, PlayCircle, Search, Filter, Mail, Phone } from 'lucide-react';
import { ClipboardListIcon } from '@/components/icons/ClipboardListIcon';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import Pagination from '@/components/ui/Pagination';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { MapPinIcon } from '@/components/icons/MapPinIcon';

/**
 * Helper to calculate the discounted price for a product based on a specific pricing rule and quantity.
 * Note: This is now primarily used for NEW orders or "what-if" simulations.
 */
const calculateDiscountedUnitPrice = (product: Product, quantity: number, rules: PricingRule[]): number => {
    if (!product.pricingRuleId || product.pricingRuleId === '0') return product.price;

    const rule = rules.find(r => r.id === product.pricingRuleId);
    if (!rule || !rule.isActive) return product.price;

    // Check quantity constraints
    if (rule.minQuantity && quantity < rule.minQuantity) return product.price;
    if (rule.maxQuantity && rule.maxQuantity > 0 && quantity > rule.maxQuantity) return product.price;

    let discountedPrice = product.price;

    if (rule.discountPercentage && rule.discountPercentage > 0) {
        discountedPrice = product.price * (1 - rule.discountPercentage / 100);
    } else if (rule.fixedPrice && rule.fixedPrice > 0) {
        discountedPrice = rule.fixedPrice;
    } else if (rule.markupPercentage && rule.markupPercentage > 0) {
        discountedPrice = product.price * (1 + rule.markupPercentage / 100);
    }

    return parseFloat(discountedPrice.toFixed(2));
};

const OrderDetailsModal: React.FC<{ order: Order | null; onClose: () => void }> = ({ order, onClose }) => {
    const { getProductById } = useAppContext();

    if (!order) return null;

    let actualTotalValue = 0;
    let discountedTotalValue = 0;

    return (
        <Modal isOpen={!!order} onClose={onClose} title={`Order Details: ${order.id}`} size="2xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <h3 className="font-semibold text-foreground">Order Items</h3>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table headers={[
                                'Product', 
                                'Qty', 
                                'Catalog Price (Unit)', 
                                'Order Price (Unit)', 
                                'Total Catalog', 
                                {content: 'Total Order', className: 'text-right'}
                            ]}>
                                {order.items.map((item, index) => {
                                    const product = getProductById(item.productId);
                                    if (!product) return <tr key={index}><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Product Details Missing</td></tr>;
                                    
                                    const catalogUnitPrice = product.price;
                                    const savedUnitPrice = item.price; // Use price from payload
                                    
                                    const catalogLineTotal = catalogUnitPrice * item.quantity;
                                    const savedLineTotal = savedUnitPrice * item.quantity;
                                    
                                    actualTotalValue += catalogLineTotal;
                                    discountedTotalValue += savedLineTotal;

                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-3 font-medium text-foreground">
                                                <div className="truncate w-32" title={product.name}>
                                                    {product.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase">{product.sku || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{item.quantity}</td>
                                            <td className="px-4 py-3 text-muted-foreground">₹{catalogUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 font-medium text-emerald-600">
                                                {savedUnitPrice < catalogUnitPrice ? `₹${savedUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${savedUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">₹{catalogLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-bold text-foreground">₹{savedLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        </CardContent>
                        <CardFooter className="flex justify-end bg-muted/30">
                            <div className="text-right flex flex-col gap-1">
                                <div className="flex justify-end items-baseline gap-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-tight font-bold">Total Catalog Value:</p>
                                    <p className="text-sm font-medium text-muted-foreground line-through">₹{actualTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="flex justify-end items-baseline gap-2">
                                    <p className="text-sm font-semibold text-foreground uppercase tracking-tighter">Grand Total (Net):</p>
                                    <p className="text-2xl font-bold text-primary">₹{discountedTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <h3 className="font-semibold text-foreground">Customer & Shipping</h3>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-lg font-bold text-foreground">{order.customerName}</p>
                                <div className="mt-2 space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4 shrink-0"/>
                                        <span className="truncate" title={order.customerEmail}>{order.customerEmail || 'No email'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4 shrink-0"/>
                                        <span>{order.customerPhone || 'No phone'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <MapPinIcon className="h-4 w-4 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-foreground">Shipping Address</p>
                                        {order.shippingAddress ? (
                                            <address className="not-italic mt-1 text-xs">
                                                {order.shippingAddress.address1}<br/>
                                                {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br/></>}
                                                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br/>
                                                {order.shippingAddress.country}
                                            </address>
                                        ) : 'No address provided.'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {order.notes && (
                        <Card>
                            <CardHeader><h3 className="font-semibold text-foreground">Order Notes</h3></CardHeader>
                            <CardContent><p className="text-sm text-muted-foreground italic">"{order.notes}"</p></CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </Modal>
    );
};


const OrderProcessing: React.FC = () => {
    const { orders, createPickList, deleteOrder, loadOrders, dataState, updateOrderStatus, getProductById, loadProducts, pricingRules, loadPricingRules } = useAppContext();
    const router = useRouter();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Processing'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadOrders(true);
        loadProducts();
        loadPricingRules();
    }, [loadOrders, loadProducts, loadPricingRules]);
    
    const isDataReady = useMemo(() => dataState.orders.loaded && dataState.products.loaded && dataState.pricingRules.loaded, [dataState.orders, dataState.products, dataState.pricingRules]);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => {
                const isPendingOrProcessing = o.status === 'Pending' || o.status === 'Processing';
                if (!isPendingOrProcessing) return false;

                const statusMatch = statusFilter === 'all' || o.status === statusFilter;
                if (!statusMatch) return false;

                const priorityMatch = priorityFilter === 'all' || o.priority === priorityFilter;
                if (!priorityMatch) return false;

                const searchLower = searchTerm.toLowerCase();
                return (
                    o.id.toLowerCase().includes(searchLower) ||
                    o.customerName.toLowerCase().includes(searchLower) ||
                    o.items.some(item => {
                        const product = getProductById(item.productId);
                        return product?.name.toLowerCase().includes(searchLower) ?? false;
                    })
                );
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, statusFilter, priorityFilter, searchTerm, getProductById]);

    const paginatedOrders = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredOrders.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [filteredOrders, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, priorityFilter]);
    
    const getStatusColor = (status: OrderStatus) => {
        const colors: Record<OrderStatus, string> = {
            Pending: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
            Processing: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400',
            'Ready for Pickup': 'bg-cyan-100 text-cyan-800',
            Shipped: 'bg-emerald-100 text-emerald-800',
            Completed: 'bg-emerald-100 text-emerald-800',
            Returned: 'bg-amber-100 text-amber-800',
            Cancelled: 'bg-rose-100 text-rose-800',
        };
        return colors[status] || 'bg-slate-200';
    }

    const getPriorityColor = (priority: Order['priority']) => {
        const colors: Record<Order['priority'], string> = {
            High: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
            Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
            Low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        };
        return colors[priority];
    };

    const headers: TableHeader[] = [
        { content: 'Order ID', className: 'w-24' },
        'Customer',
        'Item Details',
        { content: 'Date', className: 'w-28' },
        { content: 'Catalog Value', className: 'w-32' },
        { content: 'Order Total', className: 'w-36' },
        { content: 'Priority', className: 'w-24' },
        { content: 'Status', className: 'w-32' },
        { content: 'Actions', className: 'text-right w-20' }
    ];

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex justify-between items-center w-full">
                        <h2 className="text-xl font-medium">Pending Orders</h2>
                        <Button id="new-order-button" onClick={() => router.push('/orders/processing/new')}>New Order</Button>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                        <div className="relative w-full flex-grow">
                            <Input
                                id="order-search"
                                placeholder="Search by Order ID, Customer, Product..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 !py-1.5 text-sm"
                            />
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Select
                                id="status-filter"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="pl-9 !py-1.5 text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Processing">Processing</option>
                            </Select>
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Select
                                id="priority-filter"
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value as any)}
                                className="pl-9 !py-1.5 text-sm"
                            >
                                <option value="all">All Priority</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </Select>
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                     </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                {!isDataReady ? (
                    <TableSkeleton headers={headers} rows={5} />
                ) : filteredOrders.length === 0 ? (
                     <EmptyState
                        icon={ClipboardListIcon}
                        title="No Pending Orders Found"
                        message={searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? "No orders match your current filters." : "All orders are on their way!"}
                    />
                ) : (
                    <Table headers={headers}>
                        {paginatedOrders.map((order) => {
                            let catalogTotal = 0;
                            let savedTotal = 0;

                            const orderItemsRows = order.items.map((item, index) => {
                                const product = getProductById(item.productId);
                                if (!product) return null;

                                const catalogUnitPrice = product.price;
                                const savedUnitPrice = item.price; // Use price from payload
                                
                                const catalogLineTotal = catalogUnitPrice * item.quantity;
                                const savedLineTotal = savedUnitPrice * item.quantity;
                                
                                catalogTotal += catalogLineTotal;
                                savedTotal += savedLineTotal;

                                return (
                                    <div key={index} className={`py-2 ${index < order.items.length - 1 ? 'border-b border-border' : ''}`}>
                                        <div className="truncate font-medium text-foreground" title={product.name}>
                                            {product.name}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {item.quantity} x ₹{savedUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })} = <span className="font-semibold text-foreground">₹{savedLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                );
                            });

                            return (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-200 align-top whitespace-nowrap">{order.id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 align-top">{order.customerName}</td>
                                    <td className="px-6 py-4 text-sm align-top">
                                        <div className="min-w-[180px]">
                                            {orderItemsRows}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 align-top whitespace-nowrap">{formatDate(order.createdAt)}</td>
                                    <td className="px-6 py-4 text-sm align-top whitespace-nowrap">
                                        <div className="text-xs text-muted-foreground line-through">
                                            ₹{catalogTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm align-top whitespace-nowrap">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">
                                            ₹{savedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        {catalogTotal > savedTotal && (
                                            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tighter mt-0.5">Historical Discount</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm align-top whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                                            {order.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm align-top whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium align-top">
                                    <Dropdown
                                        align="right"
                                        trigger={
                                            <button className="p-1 rounded-full text-muted-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        }
                                        >
                                            {order.status === 'Pending' && (
                                                <DropdownItem onClick={() => updateOrderStatus(order.id, 'Processing')}>
                                                    <div className="flex items-center"><PlayCircle className="h-4 w-4 mr-2" />Start Processing</div>
                                                </DropdownItem>
                                            )}
                                            {order.status === 'Processing' && (
                                                <DropdownItem onClick={() => createPickList(order)}>
                                                    <div className="flex items-center"><ClipboardListIcon className="h-4 w-4 mr-2" />Create Pick List</div>
                                                </DropdownItem>
                                            )}
                                            <DropdownItem onClick={() => setViewingOrder(order)}>
                                                <div className="flex items-center"><Eye className="h-4 w-4 mr-2" />View Details</div>
                                            </DropdownItem>
                                            <DropdownItem
                                                onClick={() => setDeletingOrder(order)}
                                                className="text-red-600 dark:text-red-500 hover:!text-red-700 dark:hover:!text-red-400"
                                                disabled={order.status !== 'Pending'}
                                            >
                                                <div className="flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</div>
                                            </DropdownItem>
                                        </Dropdown>
                                    </td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
                </CardContent>
                {filteredOrders.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredOrders.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>

            <Modal isOpen={!!deletingOrder} onClose={() => setDeletingOrder(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete order <strong className="text-foreground">{deletingOrder?.id}</strong> for <strong className="text-foreground">{deletingOrder?.customerName}</strong>? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingOrder(null)}>Cancel</Button>
                    <Button variant="danger" onClick={() => { if(deletingOrder) deleteOrder(deletingOrder.id); setDeletingOrder(null); }}>Delete</Button>
                </div>
            </Modal>
            
            <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
        </>
    );
};

export default OrderProcessing;
