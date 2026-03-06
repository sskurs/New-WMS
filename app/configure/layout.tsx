
'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ConfigureLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageConfiguration'>{children}</ProtectedRoute>;
}