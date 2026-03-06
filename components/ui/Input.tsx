

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string;
  // FIX: Add labelClassName to allow custom styling of the label element, resolving a TypeScript error.
  labelClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, className, error, labelClassName, ...props }, ref) => {
  const errorClasses = error ? 'border-destructive focus-visible:ring-destructive' : 'border-input';
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className={`block text-sm font-medium text-muted-foreground mb-1.5 ${labelClassName || ''}`}>
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errorClasses} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;