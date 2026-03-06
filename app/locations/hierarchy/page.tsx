'use client';

import React, { useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Location } from '@/types';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import { Building2, Server, Archive, Inbox, ChevronRight, LayoutGrid, MapPin } from 'lucide-react';
import { GitBranchIcon } from '@/components/icons/GitBranchIcon';
import EmptyState from '@/components/ui/EmptyState';
import CardSkeleton from '@/components/skeletons/CardSkeleton';

interface TreeNode {
  location: Location;
  children: TreeNode[];
}

const locationTypeIcons: Record<Location['type'], React.ElementType> = {
    Warehouse: Building2,
    Zone: LayoutGrid,
    Aisle: GitBranchIcon,
    Rack: Server,
    Shelf: Archive,
    Bin: Inbox,
};

const LocationNode: React.FC<{ node: TreeNode, level: number }> = ({ node, level }) => {
  const [isOpen, setIsOpen] = React.useState(level < 2); // Auto-expand first two levels
  const Icon = locationTypeIcons[node.location.type];

  return (
    <div style={{ paddingLeft: level > 0 ? `24px` : '0px' }} className="relative">
        {level > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-3"></div>}
        <div 
            className="flex items-center p-2 rounded-md hover:bg-accent cursor-pointer group relative"
            onClick={() => setIsOpen(!isOpen)}
        >
             {level > 0 && <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-px w-3 bg-border"></div>}
            {node.children.length > 0 && (
            <ChevronRight className={`h-4 w-4 mr-2 transition-transform shrink-0 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
            )}
             {node.children.length === 0 && <div className="w-4 h-4 mr-2 shrink-0"></div>}
            <Icon className="h-5 w-5 mr-3 text-muted-foreground shrink-0" />
            <div className="flex-grow">
            <p className="font-medium text-foreground">{node.location.name}</p>
            <p className="text-sm text-muted-foreground">{node.location.code} ({node.location.type})</p>
            </div>
      </div>
      {isOpen && node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map(childNode => (
            <LocationNode key={childNode.location.id} node={childNode} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};


const HierarchyView = () => {
    const { locations, loadLocations, dataState } = useAppContext();
    
    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    const hierarchyTree = useMemo(() => {
        if (!dataState.locations.loaded || !Array.isArray(locations)) return [];

        const nodes = new Map<string, TreeNode>();
        locations.forEach(l => nodes.set(l.id, { location: l, children: [] }));
        
        const roots: TreeNode[] = [];

        locations.forEach(l => {
            const node = nodes.get(l.id)!;
            const parentCode = l.code.substring(0, l.code.lastIndexOf('-'));
            const parent = locations.find(p => p.code === parentCode);
            
            if (parent && nodes.has(parent.id)) {
                nodes.get(parent.id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        // Sort children recursively for consistent order
        const sortChildren = (node: TreeNode) => {
            node.children.sort((a,b) => a.location.name.localeCompare(b.location.name));
            node.children.forEach(sortChildren);
        };
        
        roots.forEach(sortChildren);

        return roots.sort((a, b) => a.location.name.localeCompare(b.location.name));
    }, [locations, dataState.locations.loaded]);

    return (
        <Card>
            <CardHeader>
                <h2 className="text-xl font-medium text-foreground">Warehouse Hierarchy</h2>
                <p className="text-sm text-muted-foreground">Expand and collapse to explore your warehouse structure.</p>
            </CardHeader>
            <CardContent>
                {!dataState.locations.loaded ? (
                    <CardSkeleton hasHeader={false} lineCount={5} />
                ) : hierarchyTree.length > 0 ? (
                    <div className="space-y-1">
                        {hierarchyTree.map(rootNode => (
                            <LocationNode key={rootNode.location.id} node={rootNode} level={0} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={MapPin}
                        title="No Hierarchy to Display"
                        message="Add locations with types like 'Warehouse' and 'Zone' to build a hierarchy."
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default HierarchyView;
