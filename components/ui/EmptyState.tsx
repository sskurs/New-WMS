'use client';

import React from 'react';
import Button from './Button';
import { RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  message: string;
  action?: {
    text: React.ReactNode;
    onClick: () => void;
  };
  retry?: {
    text?: React.ReactNode;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message, action, retry }) => {
  return (
    <div className="text-center py-16 px-6 bg-muted/20 rounded-lg">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick}>
            {action.text}
          </Button>
        </div>
      )}
      {retry && (
        <div className="mt-6">
            <Button onClick={retry.onClick} variant="secondary">
                <RefreshCw className="h-4 w-4 mr-2 -ml-1"/>
                {retry.text || 'Retry'}
            </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;