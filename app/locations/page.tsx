
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { Location, LocationStatus, LocationType } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pencil, Trash2, Search, Filter } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { MapPinIcon } from '@/components/icons/MapPinIcon';
import Pagination from '@/components/ui/Pagination';

const LocationsPage: React.FC = () => {
    const { locations, loadLocations, dataState, deleteLocation } = useAppContext();
    const router = useRouter();
    
    // State for UI controls
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<LocationType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<LocationStatus | 'all'>('all');

    // State for modals and pagination
    const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    const filteredLocations = useMemo(() => {
        if (!Array.isArray(locations)) return [];
        return locations.filter(loc => {
            const searchMatch = (loc.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                (loc.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const typeMatch = typeFilter === 'all' || loc.type === typeFilter;
            const statusMatch = statusFilter === 'all' || loc.status === statusFilter;
            return searchMatch && typeMatch && statusMatch;
        }).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }, [locations, searchTerm, typeFilter, statusFilter]);

    const paginatedLocations = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredLocations.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [filteredLocations, currentPage, itemsPerPage]);

    const confirmDelete = () => {
        if (deletingLocation) {
            deleteLocation(deletingLocation.id);
            setDeletingLocation(null);
        }
    };

    const locationTypes: LocationType[] = ['Warehouse', 'Zone', 'Aisle', 'Rack', 'Shelf', 'Bin'];
    const locationStatuses: LocationStatus[] = ['Available', 'Occupied', 'Reserved', 'Maintenance'];
    
    const headers: TableHeader[] = [
        { content: 'Location', className: 'w-[25%]' },
        { content: 'Zone', className: 'w-[10%]' },
        { content: 'Type', className: 'w-[10%]' },
        { content: 'Description', className: 'w-[25%]' },
        { content: 'Status', className: 'w-[10%]' },
        { content: 'Capacity', className: 'w-[10%]' },
        { content: 'Actions', className: 'w-[10%] text-right' }
    ];
    
    const renderContent = () => {
        if (!dataState.locations.loaded) {
            return <TableSkeleton headers={headers} rows={itemsPerPage} />;
        }
        if (locations.length === 0) {
            return <EmptyState icon={MapPinIcon} title="No Locations Found" message="Add a location to get started." />;
        }
        if (filteredLocations.length === 0) {
            return <div className="text-center py-10"><p className="text-muted-foreground">No locations match your current filters.</p></div>;
        }
        return (
            <Table headers={headers} tableClassName="table-fixed w-full">
                {paginatedLocations.map(location => (
                    <tr key={location.id} className="hover:bg-accent">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="font-medium text-foreground">{location.code}</div>
                            <div className="text-muted-foreground truncate" title={location.name}>{location.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{location.zone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{location.type}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground truncate" title={location.description}>{location.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{location.status}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{location.capacity}</td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                                <Button size="icon" variant="ghost" onClick={() => router.push(`/locations/${location.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => setDeletingLocation(location)} className="text-rose-500 hover:text-rose-600"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </Table>
        );
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div className="relative w-full flex-grow">
                            <Input id="location-search" placeholder="Search by name or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 !py-1.5 text-sm" />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-48">
                                <Select id="type-filter" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="pl-9 !py-1.5 text-sm">
                                    <option value="all">All Types</option>
                                    {locationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="relative w-full sm:w-48">
                                <Select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-9 !py-1.5 text-sm">
                                    <option value="all">All Status</option>
                                    {locationStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </Select>
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
                {dataState.locations.loaded && filteredLocations.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination itemsPerPage={itemsPerPage} totalItems={filteredLocations.length} currentPage={currentPage} paginate={setCurrentPage} />
                    </CardFooter>
                )}
            </Card>
            <Modal isOpen={!!deletingLocation} onClose={() => setDeletingLocation(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete the location <strong className="text-foreground">{deletingLocation?.name}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingLocation(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
        </>
    );
};

export default LocationsPage;
