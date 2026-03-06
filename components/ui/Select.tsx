
import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  children: React.ReactNode;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, id, className, children, error, ...props }, ref) => {
  const errorClasses = error ? 'border-destructive focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2' : 'border-input';
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1.5">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={`flex h-10 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errorClasses} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;