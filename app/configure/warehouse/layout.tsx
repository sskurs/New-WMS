
'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function WarehouseConfigLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageWarehouseConfiguration'>{children}</ProtectedRoute>;
}