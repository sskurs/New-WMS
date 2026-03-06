
'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Location, LocationStatus, LocationType } from '@/types';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

const LocationMapping: React.FC = () => {
  const { locations, addLocation } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState<Omit<Location, 'id'>>({
    code: '',
    name: '',
    type: 'Bin',
    status: 'Available',
    capacity: 0,
    // FIX: Added missing 'currentCapacity' property to satisfy the Location type.
    currentCapacity: 0,
    zone: '',
  });

  const handleSave = () => {
    if (!newLocation.name || !newLocation.code || newLocation.capacity <= 0) {
      alert("Please fill all fields (Code, Name, Capacity) with valid values.");
      return;
    }
    addLocation(newLocation);
    setIsModalOpen(false);
    setNewLocation({
      code: '',
      name: '',
      type: 'Bin',
      status: 'Available',
      capacity: 0,
      // FIX: Added missing 'currentCapacity' property to satisfy the Location type.
      currentCapacity: 0,
      zone: '',
    });
  };

  const locationTypes: LocationType[] = ['Warehouse', 'Zone', 'Rack', 'Shelf', 'Bin'];
  const locationStatuses: LocationStatus[] = ['Available', 'Occupied', 'Reserved', 'Maintenance'];

  return (
    <>
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">Location Mapping</h2>
          <Button onClick={() => setIsModalOpen(true)}>Add Location</Button>
        </CardHeader>
        <CardContent>
          <Table headers={['Code', 'Name', 'Zone', 'Type', 'Status', 'Capacity']}>
            {locations.map((location) => (
              <tr key={location.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{location.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">{location.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{location.zone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{location.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{location.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{location.capacity}</td>
              </tr>
            ))}
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Location"
        footer={<Button onClick={handleSave}>Save Location</Button>}
      >
        <div className="space-y-4">
          <Input id="code" label="Location Code (e.g., A1-S1-B1)" value={newLocation.code} onChange={e => setNewLocation({ ...newLocation, code: e.target.value })} />
          <Input id="name" label="Location Name (e.g., Aisle 1, Shelf 1)" value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })} />
          <Input id="zone" label="Zone" value={newLocation.zone || ''} onChange={e => setNewLocation({ ...newLocation, zone: e.target.value })} />
          <Select id="type" label="Location Type" value={newLocation.type} onChange={e => setNewLocation({ ...newLocation, type: e.target.value as Location['type'] })}>
            {locationTypes.map(type => <option key={type}>{type}</option>)}
          </Select>
          <Select id="status" label="Status" value={newLocation.status} onChange={e => setNewLocation({ ...newLocation, status: e.target.value as Location['status'] })}>
            {locationStatuses.map(status => <option key={status}>{status}</option>)}
          </Select>
          <Input id="capacity" label="Capacity (units)" type="number" value={newLocation.capacity || ''} onChange={e => setNewLocation({ ...newLocation, capacity: Number(e.target.value) })} />
        </div>
      </Modal>
    </>
  );
};

export default LocationMapping;
