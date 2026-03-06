'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hideCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'sm', hideCloseButton = false }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      // Delay unmounting for exit animation
      setTimeout(() => setShow(false), 300);
    }
  }, [isOpen]);
  
  if (!show) return null;

  const sizeClasses = {
    sm: 'sm:max-w-lg',
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-3xl',
    xl: 'sm:max-w-5xl',
    '2xl': 'sm:max-w-7xl',
  };

  const handleBackdropClick = () => {
    if (!hideCloseButton) {
        onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="fixed inset-0 bg-black/60" aria-hidden="true"></div>
      
      <div 
        className={`relative border bg-background rounded-lg transform transition-all duration-300 mx-4 ${sizeClasses[size]} sm:w-full ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b">
            <h3 className="text-lg leading-6 font-medium text-foreground" id="modal-title">
              {title}
            </h3>
            {!hideCloseButton && (
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <span className="sr-only">Close</span>
                     <X className="h-5 w-5" />
                </button>
            )}
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
            <div className="bg-muted px-6 py-4 sm:flex sm:flex-row-reverse rounded-b-lg">
              {footer}
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;