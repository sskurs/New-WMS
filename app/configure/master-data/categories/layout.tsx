'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageConfiguration'>{children}</ProtectedRoute>;
}
