import { GuideName } from '@/contexts/AppContext';

export interface GuideStep {
    title: string;
    content: string;
    targetElementSelector: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
    route?: string;
    action?: {
        type: 'fillInput' | 'click' | 'select';
        value?: string;
    };
    autoContinueDelay?: number;
}

export const allGuideSteps: Record<NonNullable<GuideName>, GuideStep[]> = {
    supplier: [
        {
            title: "Supplier Workflow",
            content: "Welcome! Let's walk through creating a purchase order. First, we'll open the Supplier Order section.",
            targetElementSelector: 'a[href="/suppliers"]',
            placement: 'right',
            route: '/',
            action: { type: 'click' },
        },
        {
            title: "Go to Purchase Orders",
            content: "Now let's go to the Purchase Orders page.",
            targetElementSelector: 'a[href="/suppliers/purchase-orders"]',
            placement: 'right',
            route: '/',
            action: { type: 'click' },
        },
        {
            title: "New Purchase Order",
            content: "We'll start a new PO by clicking this button.",
            targetElementSelector: '#create-po-button',
            placement: 'bottom',
            route: '/suppliers/purchase-orders',
            action: { type: 'click' },
        },
        {
            title: "Select a Supplier",
            content: "First, we select a supplier from the list.",
            targetElementSelector: '#supplier',
            placement: 'bottom',
            route: '/suppliers/purchase-orders/new',
            action: { type: 'select', value: 'sup-1' },
        },
        {
            title: "Select a Product",
            content: "Next, we'll add a product to our order.",
            targetElementSelector: '#item-prod-0',
            placement: 'bottom',
            action: { type: 'select', value: 'p1' },
        },
        {
            title: "Set Quantity",
            content: "Let's order 5 of these. The cost per unit is automatically suggested.",
            targetElementSelector: '#item-qty-0',
            placement: 'bottom',
            action: { type: 'fillInput', value: '5' },
        },
        {
            title: "Create the PO",
            content: "Now we'll create the Purchase Order.",
            targetElementSelector: 'button[type="submit"]',
            placement: 'top',
            action: { type: 'click' },
        },
        {
            title: "Receiving Goods",
            content: "The PO is created. When the items arrive, we log them in the 'Receiving' section.",
            targetElementSelector: 'a[href="/suppliers/receiving"]',
            placement: 'right',
            route: '/suppliers/purchase-orders',
            action: { type: 'click' },
        },
        {
            title: "Receive The Items",
            content: "Our newly created PO should be at the top of this list. Let's receive the items.",
            targetElementSelector: '[data-guide-id="receive-goods-button"]:first-of-type',
            placement: 'top',
            route: '/suppliers/receiving',
            action: { type: 'click' },
        },
        {
            title: "Confirm Receipt",
            content: "We confirm the quantity received. This adds the items to the 'Receiving Dock', ready for put-away.",
            targetElementSelector: '#receive-qty-p1',
            placement: 'bottom',
            action: { type: 'fillInput', value: '5' },
        },
        {
            title: "Finalize Receipt",
            content: "Finally, we confirm the receipt. This completes the supplier workflow!",
            targetElementSelector: '[data-testid="confirm-receive-button"]',
            placement: 'left',
            action: { type: 'click' },
        },
        {
            title: "Tour Complete!",
            content: "You've successfully simulated creating a PO and receiving stock. You can now explore other features.",
            targetElementSelector: 'body',
            placement: 'bottom',
            route: '/suppliers/receiving',
        }
    ],
    customerOrder: [
        {
            title: "Customer Order Workflow",
            content: "This tour will guide you through creating an order. Let's start by opening the Customer Order menu.",
            targetElementSelector: 'a[href="/orders"]',
            placement: 'right',
            route: '/',
            action: { type: 'click' },
        },
        {
            title: "Go to Order Processing",
            content: "We manage new and ongoing orders from this page.",
            targetElementSelector: 'a[href="/orders/processing"]',
            placement: 'right',
            route: '/',
            action: { type: 'click' },
        },
        {
            title: "New Order",
            content: "Here you can see all pending orders. We'll click 'New Order' to create one.",
            targetElementSelector: '#new-order-button',
            placement: 'left',
            route: '/orders/processing',
            action: { type: 'click' },
        },
        {
            title: "Customer Details",
            content: "First, let's fill in the customer's name.",
            targetElementSelector: '#customerName',
            placement: 'bottom',
            route: '/orders/processing/new',
            action: { type: 'fillInput', value: 'Automated Customer' },
        },
        {
            title: "Shipping Details",
            content: "Now for the shipping address.",
            targetElementSelector: '#address1',
            placement: 'bottom',
            action: { type: 'fillInput', value: '123 Automation Lane' },
        },
        {
            title: "Add an Item",
            content: "Every order needs at least one item. Let's add one.",
            targetElementSelector: '#add-order-item-button',
            placement: 'top',
            action: { type: 'click' },
        },
        {
            title: "Select Product",
            content: "We'll select a product for the order.",
            targetElementSelector: '#item-prod-0',
            placement: 'bottom',
            action: { type: 'select', value: 'p2' }, // ErgoMouse
        },
        {
            title: "Place Order",
            content: "Now we can place the order.",
            targetElementSelector: '#place-order-button',
            placement: 'top',
            action: { type: 'click' },
        },
        {
            title: "Go to Workflow Board",
            content: "A great way to visualize the order lifecycle is the Workflow Board. Let's go there.",
            targetElementSelector: 'a[href="/orders/workflow"]',
            placement: 'right',
            route: '/orders/processing',
            action: { type: 'click' },
        },
        {
            title: "Process the Order",
            content: "Our new order appears in 'Pending'. From here we would process it, create a pick list, and ship it.",
            targetElementSelector: '[data-testid="workflow-column-Pending"] [data-testid^="order-card-"]:first-of-type',
            placement: 'bottom',
            route: '/orders/workflow',
        },
        {
            title: "Tour Complete!",
            content: "You've now seen the automated flow of creating an order! Explore other sections to learn more!",
            targetElementSelector: 'body',
            placement: 'bottom',
        }
    ]
};