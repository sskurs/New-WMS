'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

interface PaginationProps {
  itemsPerPage: number;
  totalItems: number;
  currentPage: number;
  paginate: (pageNumber: number) => void;
  className?: string;
  size?: 'default' | 'compact';
}

const Pagination: React.FC<PaginationProps> = ({ itemsPerPage, totalItems, currentPage, paginate, className = '', size = 'default' }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) {
    return null;
  }

  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex items-center w-full ${size === 'default' ? 'justify-between' : 'justify-center'} ${className}`}>
      {size === 'default' && (
        <div>
            <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{indexOfFirstItem}</span> to <span className="font-medium text-foreground">{indexOfLastItem}</span> of{' '}
            <span className="font-medium text-foreground">{totalItems}</span> results
            </p>
        </div>
      )}
      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
        <Button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
          size="sm"
          className="rounded-r-none"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {size === 'compact' && (
             <div className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-input bg-background">
                {currentPage} / {totalPages}
            </div>
        )}
        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="secondary"
          size="sm"
          className="rounded-l-none"
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
};

export default Pagination;