import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', loading = false, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-all duration-200 ease-in-out whitespace-nowrap min-w-fit';

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-md',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md',
    ghost: 'hover:bg-accent hover:text-accent-foreground rounded-md',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-6 text-sm',
    icon: 'h-9 w-9',
  };

  const loadingClasses = 'opacity-75 cursor-wait';

  return (
    <button
      type="button"
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${loading ? loadingClasses : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="animate-spin h-4 w-4 mr-2 -ml-1" />}
      {children}
    </button>
  );
};

export default Button;