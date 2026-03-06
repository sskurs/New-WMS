'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toast } from '../../types';
import { CircleCheck, CircleX, Info, X } from 'lucide-react';

interface ToastProps {
  toast: Toast;
  removeToast: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CircleCheck,
    title: 'Success',
    barClass: 'bg-emerald-500',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: CircleX,
    title: 'Error',
    barClass: 'bg-destructive',
    iconClass: 'text-destructive',
  },
  info: {
    icon: Info,
    title: 'Information',
    barClass: 'bg-sky-500',
    iconClass: 'text-sky-500',
  },
};

const ToastComponent: React.FC<ToastProps> = ({ toast, removeToast }) => {
  const [isShowing, setIsShowing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingTimeRef = useRef(toast.duration || 5000);
  const startTimeRef = useRef(Date.now());
  
  const config = toastConfig[toast.type];
  const Icon = config.icon;
  
  const handleClose = useCallback(() => {
    setIsShowing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Allow time for animation before removing the toast
    setTimeout(() => removeToast(toast.id), 300); // This duration should match the CSS transition
  }, [removeToast, toast.id]);
  
  const pauseTimer = useCallback(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsedTime = Date.now() - startTimeRef.current;
      remainingTimeRef.current -= elapsedTime;
      setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
      startTimeRef.current = Date.now();
      setIsPaused(false);
      timerRef.current = setTimeout(handleClose, remainingTimeRef.current);
  }, [handleClose]);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsShowing(true));
    
    // Start the timer to auto-close
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(handleClose, remainingTimeRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleClose]);

  return (
    <div
      className={`
        w-full max-w-sm bg-popover text-popover-foreground rounded-lg pointer-events-auto shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden
        transition-all duration-300 ease-in-out
        ${isShowing ? 'transform-gpu opacity-100 translate-x-0' : 'transform-gpu opacity-100 translate-x-full'}
      `}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${config.iconClass}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{config.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="rounded-md inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-popover"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-1 bg-black/10 dark:bg-white/10">
        <div 
          className={`h-full ${config.barClass}`}
          style={{ animation: `shrink-width ${toast.duration || 5000}ms linear`, animationPlayState: isPaused ? 'paused' : 'running' }}
        />
      </div>
    </div>
  );
};

export default ToastComponent;