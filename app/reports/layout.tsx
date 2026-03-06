
'use client';

import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute requiredPermission='viewReports'>{children}</ProtectedRoute>;
}