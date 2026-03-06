
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Order, OrderStatus, Product, PricingRule } from '@/types';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { MoreHorizontal, XCircle, ArrowRight, CheckCircle2, Search, Filter, Mail, Phone, MapPin as MapPinIcon } from 'lucide-react';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { formatDateTime } from '@/api/utils';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';

// Define the order of columns
const workflowColumns: OrderStatus[] = ['Pending', 'Processing', 'Ready for Pickup', 'Shipped', 'Completed'];

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

// Order Card Component
const OrderCard: React.FC<{ order: Order; onClick: (order: Order) => void; onCancel: (order: Order) => void }> = ({ order, onClick, onCancel }) => {
    const { createPickList, updateOrderStatus, packedOrders, shipOrder, getProductById, pricingRules } = useAppContext();

    // Use price from payload instead of re-calculating
    const totalValue = useMemo(() => {
        return order.items.reduce((acc: number, item) => {
            return acc + (item.price * item.quantity);
        }, 0);
    }, [order.items]);

    const totalItems = order.items.reduce((acc: number, item) => acc + item.quantity, 0);

    const handleAction = async (action: 'pick' | 'ship' | 'complete' | 'process') => {
        switch (action) {
            case 'process':
                await updateOrderStatus(order.id, 'Processing');
                break;
            case 'pick':
                await createPickList(order);
                break;
            case 'ship':
                const packedOrder = packedOrders.find(po => po.orderId === order.id);
                if (packedOrder) {
                    await shipOrder(packedOrder.id);
                } else {
                    console.error(`Could not find packed order for order ID ${order.id} to ship.`);
                }
                break;
            case 'complete':
                await updateOrderStatus(order.id, 'Completed');
                break;
        }
    };
    
    const getPriorityPill = (priority: Order['priority']) => {
        const classes = {
            High: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400',
            Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
            Low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        };
        return `px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[priority]}`;
    }

    const isShipActionDisabled = order.status === 'Ready for Pickup' && !packedOrders.find(po => po.orderId === order.id);

    return (
        <Card data-testid={`order-card-${order.id}`} className="mb-4 bg-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClick(order)}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-sm text-foreground">{order.id}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                    </div>
                     {order.status !== 'Completed' && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Dropdown
                                align="right"
                                trigger={
                                    <button className="p-1 rounded-full text-muted-foreground hover:bg-accent -mr-2 -mt-2">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                }
                            >
                                {order.status === 'Pending' && (
                                <DropdownItem onClick={() => handleAction('process')}><ArrowRight className="h-4 w-4 mr-2"/>Start Processing</DropdownItem>
                                )}
                                {order.status === 'Processing' && (
                                <DropdownItem onClick={() => handleAction('pick')}><ArrowRight className="h-4 w-4 mr-2"/>Create Pick List</DropdownItem>
                                )}
                                {order.status === 'Ready for Pickup' && <DropdownItem onClick={() => handleAction('ship')} disabled={isShipActionDisabled}><ArrowRight className="h-4 w-4 mr-2"/>Mark as Shipped</DropdownItem>}
                                {order.status === 'Shipped' && <DropdownItem onClick={() => handleAction('complete')}><CheckCircle2 className="h-4 w-4 mr-2"/>Mark as Completed</DropdownItem>}
                                {(order.status === 'Pending' || order.status === 'Processing') && <DropdownItem onClick={() => onCancel(order)} className="text-rose-500"><XCircle className="h-4 w-4 mr-2"/>Cancel Order</DropdownItem>}
                            </Dropdown>
                        </div>
                    )}
                </div>
                <div className="mt-3">
                    <p className="text-xs text-muted-foreground">{totalItems} items</p>
                    <p className="text-lg font-bold text-foreground">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="mt-2">
                    <span className={getPriorityPill(order.priority)}>{order.priority} Priority</span>
                </div>
            </CardContent>
        </Card>
    );
};

// Column Component
const WorkflowColumn: React.FC<{ status: OrderStatus; orders: Order[]; onCardClick: (order: Order) => void, onCancelClick: (order: Order) => void }> = ({ status, orders, onCardClick, onCancelClick }) => {
    const itemsPerPage = 8;
    const [currentPage, setCurrentPage] = useState(1);

    const paginatedOrders = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return orders.slice(indexOfFirstItem, indexOfLastItem);
    }, [orders, currentPage]);

    // Reset to page 1 if orders change and current page is out of bounds
    useEffect(() => {
        const totalPages = Math.ceil(orders.length / itemsPerPage);
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(1);
        } else if (orders.length > 0 && currentPage === 0) {
            setCurrentPage(1);
        }
    }, [orders, currentPage]);

    return (
        <div data-testid={`workflow-column-${status}`} className="w-80 flex-shrink-0 flex flex-col bg-muted p-3 rounded-lg">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-semibold text-foreground">{status}</h3>
                <span className="text-sm font-medium bg-background text-muted-foreground rounded-full px-2 py-0.5">{orders.length}</span>
            </div>
            
            <div className="flex-grow min-h-[1px] space-y-2 overflow-y-auto sidebar-scrollbar pr-1">
                {paginatedOrders.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">No orders in this stage</p>
                    </div>
                ) : (
                    paginatedOrders.map(order => (
                        <OrderCard key={order.id} order={order} onClick={onCardClick} onCancel={onCancelClick} />
                    ))
                )}
            </div>
            {orders.length > itemsPerPage && (
                <div className="pt-2 mt-auto flex-shrink-0">
                    <Pagination
                        itemsPerPage={itemsPerPage}
                        totalItems={orders.length}
                        currentPage={currentPage}
                        paginate={setCurrentPage}
                        size="compact"
                    />
                </div>
            )}
        </div>
    );
};

const OrderDetailsContent: React.FC<{ order: Order }> = ({ order }) => {
    const { getProductById } = useAppContext();
    
    let catalogTotalValue = 0;
    let orderTotalValue = 0;

    return (
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
                                'Catalog Unit Price', 
                                'Order Unit Price', 
                                'Line Catalog', 
                                {content: 'Line Order', className: 'text-right'}
                            ]}>
                                {order.items.map((item, index) => {
                                    const product = getProductById(item.productId);
                                    if (!product) return null;
                                    
                                    const catalogUnitPrice = product.price;
                                    const savedUnitPrice = item.price; // Use price from payload
                                    
                                    const catalogLineTotal = catalogUnitPrice * item.quantity;
                                    const savedLineTotal = savedUnitPrice * item.quantity;
                                    
                                    catalogTotalValue += catalogLineTotal;
                                    orderTotalValue += savedLineTotal;

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
                                                ₹{savedUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                <p className="text-xs text-muted-foreground uppercase tracking-tight font-bold">Total Catalog:</p>
                                <p className="text-sm font-medium text-muted-foreground line-through">₹{catalogTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex justify-end items-baseline gap-2">
                                <p className="text-sm font-semibold text-foreground uppercase tracking-tighter">Net Grand Total:</p>
                                <p className="text-2xl font-bold text-primary">₹{orderTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
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
    );
};


// Main Board Component
const OrderWorkflowPage: React.FC = () => {
    const { orders, loadOrders, dataState, loadPackedOrders, getProductById, loadProducts, loadPutAwayRecords, updateOrderStatus, loadPricingRules } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<'all' | Order['priority']>('all');
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadOrders();
        loadPackedOrders();
        loadProducts();
        loadPutAwayRecords();
        loadPricingRules();
    }, [loadOrders, loadPackedOrders, loadProducts, loadPutAwayRecords, loadPricingRules]);

    const filteredOrders = useMemo(() => {
        const searchTermLower = searchTerm.toLowerCase();
        
        return orders.filter(order => {
            const priorityMatch = priorityFilter === 'all' || order.priority === priorityFilter;
            if (!priorityMatch) return false;

            const searchMatch = searchTermLower === '' ||
                order.id.toLowerCase().includes(searchTermLower) ||
                order.customerName.toLowerCase().includes(searchTermLower) ||
                order.items.some(item => {
                    const product = getProductById(item.productId);
                    return product?.name.toLowerCase().includes(searchTermLower) || false;
                });
            if (!searchMatch) return false;

            return true;
        });
    }, [orders, searchTerm, priorityFilter, getProductById]);

    const groupedOrders = useMemo(() => {
        const grouped: { [key in OrderStatus]: Order[] } = {
            'Pending': [],
            'Processing': [],
            'Ready for Pickup': [],
            'Shipped': [],
            'Completed': [],
            'Returned': [],
            'Cancelled': []
        };
        
        filteredOrders.forEach(order => {
            if (grouped[order.status]) {
                grouped[order.status].push(order);
            }
        });
        
        // Sort each group by priority then date
        for (const status in grouped) {
            grouped[status as OrderStatus]!.sort((a, b) => {
                const priorityMap = { High: 0, Medium: 1, Low: 2 };
                if (priorityMap[a.priority] !== priorityMap[b.priority]) {
                    return priorityMap[a.priority] - priorityMap[b.priority];
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        }
        
        return grouped;
    }, [filteredOrders]);

    const confirmCancel = async () => {
        if (cancellingOrder) {
            await updateOrderStatus(cancellingOrder.id, 'Cancelled');
            setCancellingOrder(null);
        }
    };

    if (!dataState.orders.loaded) {
        return <DashboardSkeleton />;
    }

    return (
        <>
            <div className="min-h-full flex flex-col">
                {/* Header and Filters */}
                <div className="flex-shrink-0 mb-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-semibold text-foreground">Order Workflow</h1>
                    </div>
                    <div className="mt-4 p-4 bg-card border rounded-lg flex items-center gap-4">
                        <div className="relative flex-grow max-w-sm">
                            <Input
                                id="workflow-search"
                                placeholder="Search by Order ID, Customer, or Product..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 !py-1.5 text-sm h-9"
                            />
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="relative w-48">
                            <Select
                                id="workflow-priority-filter"
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value as any)}
                                className="pl-9 !py-1.5 text-sm h-9"
                            >
                                <option value="all">All Priorities</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </Select>
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>
                
                <div className="flex-grow flex gap-6 overflow-x-auto pb-4 sidebar-scrollbar">
                    {workflowColumns.map(status => (
                        <WorkflowColumn
                            key={status}
                            status={status}
                            orders={groupedOrders[status] || []}
                            onCardClick={setViewingOrder}
                            onCancelClick={setCancellingOrder}
                        />
                    ))}
                </div>
            </div>
            {viewingOrder && (
                <Modal isOpen={!!viewingOrder} onClose={() => setViewingOrder(null)} title={`Order Details: ${viewingOrder.id}`} size="2xl">
                    <OrderDetailsContent order={viewingOrder} />
                </Modal>
            )}
             <Modal isOpen={!!cancellingOrder} onClose={() => setViewingOrder(null)} title="Confirm Order Cancellation">
                <p>Are you sure you want to cancel Order <strong className="text-foreground">{cancellingOrder?.id}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setViewingOrder(null)}>Back</Button>
                    <Button variant="danger" onClick={confirmCancel}>Cancel Order</Button>
                </div>
            </Modal>
        </>
    );
};

export default OrderWorkflowPage;
