import React from 'react';
import Table, { TableHeader } from '../ui/Table';

interface TableSkeletonProps {
  headers: TableHeader[];
  rows?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ headers, rows = 5 }) => {
  const cellCount = headers.length;
  return (
    <Table headers={headers}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
                {Array.from({ length: cellCount }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4">
                        <div className="h-5 skeleton-green w-full"></div>
                    </td>
                ))}
            </tr>
        ))}
    </Table>
  );
};

export default TableSkeleton;