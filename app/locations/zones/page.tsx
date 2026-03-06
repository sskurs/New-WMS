
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, LayoutGrid, Search, Filter, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Location, WarehouseConfiguration } from '@/types';
import Pagination from '@/components/ui/Pagination';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { useToast } from '@/contexts/ToastContext';
import { deleteZoneAPI } from '@/api/locationsApi';

const ZoneManagementPage: React.FC = () => {
    const { zones, loadZones, addZone, dataState, warehouseConfigurations, loadWarehouseConfigurations, updateLocation } = useAppContext();
    const { addToast } = useToast();
    
    // State for UI controls
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingZone, setEditingZone] = useState<Location | null>(null);
    const [zoneData, setZoneData] = useState({ name: '', zoneType: 'Putaway Zone', description: '', warehouseId: '' });
    const [errors, setErrors] = useState<{ name?: string, warehouseId?: string }>({});

    // State for filtering, sorting, and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Location | 'warehouseName'; direction: 'ascending' | 'descending' } | null>({ key: 'code', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [deletingZone, setDeletingZone] = useState<Location | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        loadZones(true);
        loadWarehouseConfigurations(true);
    }, [loadZones, loadWarehouseConfigurations]);

    useEffect(() => {
        if (warehouseConfigurations.length > 0 && !zoneData.warehouseId) {
            setZoneData(prev => ({ ...prev, warehouseId: warehouseConfigurations[0].pkWarehouseId }));
        }
    }, [warehouseConfigurations, zoneData.warehouseId]);

    const filteredAndSortedZones = useMemo(() => {
        if (!Array.isArray(zones)) return [];

        const zonesWithWarehouse = zones.map(zone => {
            const warehouse = warehouseConfigurations.find(wh => wh.pkWarehouseId === zone.warehouseId);
            return { ...zone, warehouseName: warehouse?.warehouseName || 'N/A' };
        });

        let filtered = zonesWithWarehouse.filter(zone => {
            const searchMatch = (zone.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (zone.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (zone.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const typeMatch = typeFilter === 'all' || zone.zoneType === typeFilter;
            const warehouseMatch = warehouseFilter === 'all' || zone.warehouseId === warehouseFilter;
            return searchMatch && typeMatch && warehouseMatch;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof typeof a];
                const bValue = b[sortConfig.key as keyof typeof b];

                if (aValue == null || bValue == null) return 0;

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [zones, warehouseConfigurations, searchTerm, typeFilter, warehouseFilter, sortConfig]);

    const paginatedZones = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedZones.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedZones, currentPage]);
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setZoneData(prev => ({ ...prev, [name]: value }));
        // Clear validation error for the field being changed
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: { name?: string, warehouseId?: string } = {};
        if (!zoneData.name.trim()) {
            newErrors.name = "Zone name is required.";
        } else if (zoneData.name.trim().length > 50) {
            newErrors.name = "Zone name cannot exceed 50 characters.";
        }
    
        if (!zoneData.warehouseId) {
            newErrors.warehouseId = "Please select a warehouse.";
        }
    
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const closeFormModal = () => {
        setIsFormOpen(false);
        setEditingZone(null);
        setZoneData({ name: '', zoneType: 'Putaway Zone', description: '', warehouseId: warehouseConfigurations[0]?.pkWarehouseId || '' });
        setErrors({});
    };

    const openAddModal = () => {
        setEditingZone(null);
        setZoneData({ name: '', zoneType: 'Putaway Zone', description: '', warehouseId: warehouseConfigurations[0]?.pkWarehouseId || '' });
        setIsFormOpen(true);
    };

    const openEditModal = (zone: Location) => {
        setEditingZone(zone);
        setZoneData({
            name: zone.name,
            zoneType: zone.zoneType || 'Putaway Zone',
            description: zone.description || '',
            warehouseId: zone.warehouseId || ''
        });
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }
        setIsSaving(true);
        try {
            if (editingZone) {
                const updatedZoneData: Location = {
                    ...editingZone,
                    name: zoneData.name,
                    zoneType: zoneData.zoneType,
                    description: zoneData.description,
                    warehouseId: zoneData.warehouseId,
                };
                await updateLocation(updatedZoneData);
            } else {
                await addZone(zoneData);
            }
            closeFormModal();
        } catch (error) {
            // Error toast is handled in context
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestSort = (key: keyof Location | 'warehouseName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const confirmDelete = async () => {
        if(deletingZone) {
            setIsDeleting(true);
            try {
                await deleteZoneAPI(deletingZone.id);
                addToast({ type: 'success', message: 'Zone deleted successfully' });
                // Manually refresh list since we bypassed context
                loadZones(true);
            } catch (error) {
                // Show user-friendly message for occupied zones or specific errors
                const msg = (error as Error).message;
                addToast({ 
                    type: 'error', 
                    message: msg || "Cannot delete zone: It contains active products or locations."
                });
            } finally {
                setIsDeleting(false);
                setDeletingZone(null);
            }
        }
    }
    
    const zoneTypes = ['Putaway Zone', 'Picking Zone', 'Staging Zone', 'Damage Zone'];
    
    const tableHeaders: TableHeader[] = [
        { content: <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRequestSort('code')}>Code / Name {sortConfig?.key === 'code' && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>)}</div> },
        { content: <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRequestSort('zoneType')}>Location Type {sortConfig?.key === 'zoneType' && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>)}</div> },
        { content: 'Description' },
        { content: <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleRequestSort('warehouseName')}>Warehouse Name {sortConfig?.key === 'warehouseName' && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>)}</div> },
        { content: 'Status' },
        { content: <span className="sr-only">Actions</span>, className: 'text-right' },
    ];

    const renderContent = () => {
        if (!dataState.zones.loaded || !dataState.warehouseConfigurations.loaded) {
            return <TableSkeleton headers={tableHeaders} rows={5} />;
        }
        if (zones.length === 0) {
            return (
                <EmptyState
                    icon={LayoutGrid}
                    title="No Zones Found"
                    message="Get started by creating your first zone."
                    action={{ text: 'New Zone', onClick: openAddModal }}
                />
            );
        }
        return (
            <Table headers={tableHeaders}>
                {paginatedZones.map(zone => (
                    <tr key={zone.id} className="hover:bg-accent">
                        <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{zone.code}</div>
                            <div className="text-sm text-muted-foreground truncate" title={zone.name}>{zone.name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{zone.type}{zone.zoneType ? ` (${zone.zoneType})` : ''}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={zone.description}>{zone.description}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{zone.warehouseName}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{zone.status}</td>
                        <td className="px-6 py-4 text-right">
                            <Dropdown
                                align="right"
                                trigger={
                                    <button className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </button>
                                }
                            >
                                <DropdownItem onClick={() => openEditModal(zone)}><div className="flex items-center"><Edit className="h-4 w-4 mr-2" />Edit</div></DropdownItem>
                                <DropdownItem onClick={() => setDeletingZone(zone)} className="text-rose-600 hover:!text-rose-700">
                                    <div className="flex items-center"><Trash2 className="h-4 w-4 mr-2" />Delete</div>
                                </DropdownItem>
                            </Dropdown>
                        </td>
                    </tr>
                ))}
            </Table>
        );
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-4">
                     <div className="flex justify-between items-center">
                        <h2 className="text-xl font-medium text-foreground">Zone Management</h2>
                        <Button onClick={openAddModal}>
                            <Plus className="h-4 w-4 mr-2 -ml-1" />
                            New Zone
                        </Button>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t">
                        <div className="relative w-full flex-grow">
                            <Input id="zone-search" placeholder="Search by name or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 !py-1.5 text-sm" />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Select id="type-filter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="pl-9 !py-1.5 text-sm">
                                <option value="all">All Types</option>
                                {zoneTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="relative w-full sm:w-56">
                            <Select id="warehouse-filter" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="pl-9 !py-1.5 text-sm" disabled={!dataState.warehouseConfigurations.loaded}>
                                <option value="all">All Warehouses</option>
                                {warehouseConfigurations.map(w => <option key={w.pkWarehouseId} value={w.pkWarehouseId}>{w.warehouseName}</option>)}
                            </Select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
                {dataState.zones.loaded && filteredAndSortedZones.length > itemsPerPage && (
                    <CardFooter>
                        <Pagination 
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredAndSortedZones.length}
                            currentPage={currentPage}
                            paginate={setCurrentPage}
                        />
                    </CardFooter>
                )}
            </Card>

            <Modal isOpen={isFormOpen} onClose={closeFormModal} title={editingZone ? 'Edit Zone' : 'Create New Zone'}
                footer={<Button onClick={handleSave} loading={isSaving}>{editingZone ? 'Save Changes' : 'Save Zone'}</Button>}
            >
                <div className="space-y-4">
                    <Select id="warehouseId" name="warehouseId" label="Warehouse" value={zoneData.warehouseId} onChange={handleFormChange} error={errors.warehouseId}>
                        <option value="" disabled>Select a warehouse</option>
                        {warehouseConfigurations.map(wh => <option key={wh.pkWarehouseId} value={wh.pkWarehouseId}>{wh.warehouseName}</option>)}
                    </Select>
                    <Input id="zone-name" name="name" label="Zone Name" value={zoneData.name} onChange={handleFormChange} error={errors.name} />
                    <Select id="zone-type" name="zoneType" label="Zone Type" value={zoneData.zoneType} onChange={handleFormChange}>
                        {zoneTypes.map(t => <option key={t}>{t}</option>)}
                    </Select>
                    <div>
                        <label htmlFor="zone-desc" className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
                        <textarea
                            id="zone-desc"
                            name="description"
                            rows={3}
                            className="block w-full px-3 py-2 border border-input rounded-md bg-background placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                            value={zoneData.description}
                            onChange={handleFormChange}
                        />
                    </div>
                </div>
            </Modal>
             <Modal isOpen={!!deletingZone} onClose={() => setDeletingZone(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete the zone <strong className="text-foreground">{deletingZone?.name}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingZone(null)} disabled={isDeleting}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete} loading={isDeleting}>Delete</Button>
                </div>
            </Modal>
        </>
    );
};

export default ZoneManagementPage;
