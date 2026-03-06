
'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageSuppliers'>{children}</ProtectedRoute>;
}