'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function LocalizationLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='manageLocalization'>{children}</ProtectedRoute>;
}