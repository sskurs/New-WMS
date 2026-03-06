'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: string;
  menuClassName?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children, align = 'right', width = 'w-48', menuClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!isOpen || dropdownRef.current.contains(target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [isOpen]);

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!isOpen || keyCode !== 27) return;
      setIsOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [isOpen]);

  const alignmentClasses = align === 'right' ? 'origin-top-right right-0' : 'origin-top-left left-0';

  // Toggle function for the trigger
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Function to close menu - passed to children via context or cloned props if complex, 
  // but for this implementation we simply rely on the menu container handler.
  const handleMenuClick = (e: React.MouseEvent) => {
    // Only close if the click originated from an interactive element (like a DropdownItem button)
    if ((e.target as HTMLElement).closest('button')) {
       // We use a small timeout to allow any triggered handlers to start before unmounting the menu
       setTimeout(() => setIsOpen(false), 50);
    }
  };

  return (
    <div className={`relative inline-block text-left ${isOpen ? 'z-20' : ''}`} ref={dropdownRef}>
      <div onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 rounded-md bg-popover text-popover-foreground border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${alignmentClasses} ${width} ${menuClassName}`}
          role="menu"
          aria-orientation="vertical"
          onClick={handleMenuClick}
        >
          <div className="py-1" role="none">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, className, onClick, ...props }) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent click from bubbling up to parents that might have their own handlers (e.g. table rows)
        e.stopPropagation();
        if (onClick) {
            onClick(e);
        }
    };

    return (
        <button
          {...props}
          onClick={handleClick}
          className={`w-full text-left block px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ${className}`}
          role="menuitem"
        >
          {children}
        </button>
    );
};

export default Dropdown;