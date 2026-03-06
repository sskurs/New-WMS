
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../contexts/AppContext';
import { Permission } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: Permission;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { hasPermission } = useAppContext();
  const router = useRouter();
  const isAuthorized = hasPermission(requiredPermission);

  React.useEffect(() => {
    if (!isAuthorized) {
      router.replace('/');
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return (
        <div className="flex h-full w-full items-center justify-center p-8">
            <p className="text-slate-500">Checking permissions...</p>
        </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
