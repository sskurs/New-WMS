'use client';

import React from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import { Role } from '@/types';

const roleDescriptions: Record<Role, string> = {
  'Admin': 'Full system access. Can manage users, configurations, and all warehouse operations.',
  'Warehouse Manager': 'High-level operational control. Can manage inventory, operations, and reporting, but not system-level user management.',
  'Picker': 'Focused on outbound operations. Responsible for picking items from locations for customer orders.',
  'Receiver': 'Focused on inbound operations. Responsible for receiving new stock and preparing it for put-away.',
  'Analyst': 'Read-only access to data and reports. Can view dashboards, analytics, and generate forecasts.',
};

const roles: Role[] = ['Admin', 'Warehouse Manager', 'Picker', 'Receiver', 'Analyst'];

const RolesPage: React.FC = () => {
  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-semibold text-foreground">Role Descriptions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role}>
            <CardHeader>
              <h2 className="text-xl font-medium text-slate-800 dark:text-slate-200">{role}</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {roleDescriptions[role]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RolesPage;