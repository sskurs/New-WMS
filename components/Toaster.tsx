'use client';

import React from 'react';
import { useToast } from '../contexts/ToastContext';
import ToastComponent from './ui/Toast';

const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      aria-live="assertive"
      className="fixed top-0 right-0 z-50 flex w-full max-w-sm flex-col items-end space-y-3 p-4 pointer-events-none sm:p-6"
    >
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

export default Toaster;