
'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageOrders'>{children}</ProtectedRoute>;
}