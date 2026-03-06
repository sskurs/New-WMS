
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { User, Role } from '@/types';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { Edit, MoreHorizontal, Power, UserPlus, Search, Filter } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { UsersIcon } from '@/components/icons/UsersIcon';
import Modal from '@/components/ui/Modal';

const UserManagement: React.FC = () => {
  // FIX: Destructured 'currentUser' directly from the context, as the property is named 'currentUser', not 'user'.
  const { users, currentUser, toggleUserStatus, loadUsers, dataState } = useAppContext();
  const { addToast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [confirmingUserStatus, setConfirmingUserStatus] = useState<User | null>(null);
  const availableRoles: Role[] = ['Admin', 'Warehouse Manager', 'Picker', 'Receiver', 'Analyst'];

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = (user: User) => {
      if (user.id === currentUser?.id) {
        addToast({ type: 'error', message: 'You cannot change your own status.' });
        return;
      }
      setConfirmingUserStatus(user);
  };

  const executeToggleStatus = async () => {
    if (!confirmingUserStatus) return;
    await toggleUserStatus(confirmingUserStatus.id, !confirmingUserStatus.isActive);
    setConfirmingUserStatus(null);
  };
  
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const searchMatch = (
            user.name.toLowerCase().includes(searchLower) ||
            user.userName.toLowerCase().includes(searchLower) ||
            user.officialEmail.toLowerCase().includes(searchLower)
        );

        const roleMatch = roleFilter === 'all' || user.role === roleFilter;

        const statusMatch = statusFilter === 'all' ||
            (statusFilter === 'active' && user.isActive) ||
            (statusFilter === 'inactive' && !user.isActive);

        return searchMatch && roleMatch && statusMatch;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);
  
  const headers = ['User', 'Username', 'Role', 'Status', { content: 'Actions', className: 'text-right' }];

  const renderContent = () => {
    if (!dataState.users.loaded) {
        return <TableSkeleton headers={headers} rows={5} />;
    }
    if (users.length === 0) {
        return (
            <EmptyState
                icon={UsersIcon}
                title="No users found"
                message="Get started by adding a new user to the system."
                action={{
                    text: <><UserPlus className="h-4 w-4 mr-2 -ml-1"/>Add User</>,
                    onClick: () => router.push('/users/new')
                }}
            />
        );
    }
    if (filteredUsers.length === 0) {
        return <div className="text-center py-10"><p className="text-muted-foreground">No users match your current search and filter criteria.</p></div>;
    }
    return (
        <Table headers={headers}>
            {filteredUsers.map((user) => (
            <tr key={user.id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4">
                <div className="text-sm font-medium text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.officialEmail}</div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.userName}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.role}</td>
                <td className="px-6 py-4 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                <Dropdown
                    align="right"
                    trigger={
                        <button className="p-1 rounded-full text-muted-foreground hover:bg-accent">
                            <MoreHorizontal className="h-5 w-5" />
                        </button>
                    }
                >
                    <DropdownItem onClick={() => router.push(`/users/${user.id}/edit`)}>
                        <div className="flex items-center"><Edit className="h-4 w-4 mr-2"/>Edit</div>
                    </DropdownItem>
                    <DropdownItem
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.id === currentUser?.id}
                        className={user.isActive ? 'text-rose-600 dark:text-rose-500 hover:!text-rose-700 dark:hover:!text-rose-400' : 'text-emerald-600 dark:text-emerald-500 hover:!text-emerald-700 dark:hover:!text-emerald-400'}
                    >
                        <div className="flex items-center"><Power className="h-4 w-4 mr-2"/>{user.isActive ? 'Deactivate' : 'Activate'}</div>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h2 className="text-xl font-medium text-foreground">User Management</h2>
                    <p className="text-sm text-muted-foreground mt-1">Add, edit, and manage user accounts and roles.</p>
                </div>
                <Button onClick={() => router.push('/users/new')} className="mt-2 sm:mt-0 flex-shrink-0">
                    <UserPlus className="h-4 w-4 mr-2 -ml-1"/>
                    Add User
                </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full flex-grow">
                    <Input
                        id="user-search"
                        placeholder="Search by name, username, email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 !py-1.5 text-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                <div className="relative w-full sm:w-48">
                    <Select id="role-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="pl-9 !py-1.5 text-sm">
                        <option value="all">All Roles</option>
                        {availableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                    </Select>
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                <div className="relative w-full sm:w-48">
                    <Select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="pl-9 !py-1.5 text-sm">
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </Select>
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      <Modal 
        isOpen={!!confirmingUserStatus} 
        onClose={() => setConfirmingUserStatus(null)} 
        title="Confirm Status Change"
        footer={
            <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setConfirmingUserStatus(null)}>
                    Cancel
                </Button>
                <Button 
                    variant={confirmingUserStatus?.isActive ? 'danger' : 'primary'}
                    onClick={executeToggleStatus}
                >
                    {confirmingUserStatus?.isActive ? 'Deactivate' : 'Activate'}
                </Button>
            </div>
        }
    >
        {confirmingUserStatus && (
            <div>
                <p>
                    Are you sure you want to 
                    <strong className={confirmingUserStatus.isActive ? 'text-rose-500' : 'text-emerald-500'}>
                        {confirmingUserStatus.isActive ? ' deactivate ' : ' activate '}
                    </strong> 
                    the user{' '}
                    <strong className="text-foreground">
                        {confirmingUserStatus.name}
                    </strong>?
                </p>
                {confirmingUserStatus.isActive && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        Deactivating a user will prevent them from logging into the system.
                    </p>
                )}
            </div>
        )}
    </Modal>
    </>
  );
};

export default UserManagement;
