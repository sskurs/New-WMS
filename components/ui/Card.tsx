import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-card text-card-foreground border border-border rounded-lg shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return <div className={`p-6 border-b border-border ${className}`} {...props}>{children}</div>;
}

export const CardContent: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return <div className={`p-6 ${className}`} {...props}>{children}</div>;
}

export const CardFooter: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return <div className={`p-6 bg-muted/50 border-t border-border rounded-b-lg ${className}`} {...props}>{children}</div>;
}

export default Card;