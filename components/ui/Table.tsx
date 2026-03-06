import React from 'react';

// Allow header to be a string or an object with content and optional className
export type TableHeader = string | { content: React.ReactNode; className?: string; title?: string };

interface TableProps {
  headers: TableHeader[];
  children: React.ReactNode;
  tableClassName?: string;
}

const Table: React.FC<TableProps> = ({ headers, children, tableClassName }) => {
  return (
    <div className="flex flex-col">
      <div className="-my-2">
        <div className="py-2 align-middle inline-block min-w-full">
          {/* Note: We use overflow-x-visible here specifically to prevent absolute-positioned elements 
              like searchable dropdowns from being clipped by the table's container. */}
          <div className="border border-border sm:rounded-lg overflow-x-visible">
            <table className={`min-w-full divide-y divide-border ${tableClassName || ''}`}>
              <thead className="bg-muted/50">
                <tr>
                  {headers.map((header, index) => {
                    const baseClasses = "px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider";
                    
                    if (typeof header === 'string') {
                        return (
                            <th
                            key={header}
                            scope="col"
                            className={baseClasses}
                            >
                            {header}
                            </th>
                        );
                    }
                    
                    // Here, header is guaranteed to be an object due to the type guard above.
                    const { content, className, title } = header;
                    return (
                        <th
                        key={`col-obj-${index}`}
                        scope="col"
                        className={`${baseClasses} ${className || ''}`}
                        title={title}
                        >
                        {content}
                        </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {children}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Table;