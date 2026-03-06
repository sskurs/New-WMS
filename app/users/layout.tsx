
'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageUsers'>{children}</ProtectedRoute>;
}