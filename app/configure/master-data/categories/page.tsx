'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Category } from '@/types';
import Card, { CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import Table, { TableHeader } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { Eye, Plus, Tag, Search, Check, X } from 'lucide-react';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import Pagination from '@/components/ui/Pagination';
import { formatCurrency } from '@/api/utils';

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
    <Card>
        <CardContent className="flex items-center p-5">
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </CardContent>
    </Card>
);

const CategoryManagement: React.FC = () => {
    const { categories, products, loadCategories, loadProducts, dataState, addCategory, updateCategory, deleteCategory } = useAppContext();
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newCategoryData, setNewCategoryData] = useState<Omit<Category, 'id'>>({ name: '' });
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<{ name: string }>({ name: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadCategories();
        loadProducts();
    }, [loadCategories, loadProducts]);

    const filteredCategories = useMemo(() => {
        return (categories || []).filter(cat => {
            const name = cat?.name || '';
            const search = searchTerm || '';
            return name.toLowerCase().includes(search.toLowerCase());
        }).sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [categories, searchTerm]);

    const paginatedCategories = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredCategories.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    }, [filteredCategories, currentPage, itemsPerPage]);

    const categoryUsage = useMemo(() => {
        if (!products || !categories) {
            return {};
        }
    
        return (categories || []).reduce((acc, cat) => {
            // The product's categoryId field might contain an ID or a name.
            // We match against both the category's ID and its name for robustness.
            const count = products.filter(p => p.categoryId === cat.id || p.categoryId === cat.name).length;
            acc[cat.id] = count;
            return acc;
        }, {} as Record<string, number>);
    }, [categories, products]);

    const productsInViewingCategory = useMemo(() => {
        if (!viewingCategory || !products) return [];
        return products.filter(p => p.categoryId === viewingCategory.id || p.categoryId === viewingCategory.name);
    }, [viewingCategory, products]);

    const stats = useMemo(() => ({
        total: categories?.length || 0,
        unused: (categories || []).filter(c => categoryUsage[c.id] === 0).length,
    }), [categories, categoryUsage]);

    const openAddModal = () => {
        setNewCategoryData({ name: '' });
        setIsAddModalOpen(true);
    };

    const handleAddNewCategory = () => {
        if (!newCategoryData.name.trim()) return alert("Please enter a category name.");
        addCategory(newCategoryData);
        setIsAddModalOpen(false);
    };
    
    const handleStartEdit = (category: Category) => {
        setEditingRowId(category.id);
        setEditedData({ name: category.name });
    };

    const handleSaveEdit = async () => {
        if (!editingRowId || !editedData.name.trim()) return;
        await updateCategory({ id: editingRowId, name: editedData.name });
        setEditingRowId(null);
    };

    const confirmDelete = () => {
        if (deletingCategory) {
            deleteCategory(deletingCategory.id);
            setDeletingCategory(null);
        }
    };

    const headers: TableHeader[] = ['Category Name', 'Products Assigned', { content: 'Actions', className: 'text-right' }];

    const renderContent = () => {
        if (!dataState.categories.loaded) return <TableSkeleton headers={headers} rows={5} />;
        if (!categories || categories.length === 0) return <EmptyState icon={Tag} title="No Categories Found" message="Create your first category to organize products." action={{ text: 'Add Category', onClick: openAddModal }} />;
        if (filteredCategories.length === 0) return <div className="text-center py-10"><p className="text-muted-foreground">No categories match your search.</p></div>;

        return (
            <Table headers={headers}>
                {paginatedCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-accent">
                        {editingRowId === cat.id ? (
                            <>
                                <td className="px-6 py-2">
                                    <Input id="name" name="name" value={editedData.name} onChange={e => setEditedData({ name: e.target.value })} className="!h-8" />
                                </td>
                                <td className="px-6 py-2 text-sm text-muted-foreground">{categoryUsage[cat.id] || 0}</td>
                                <td className="px-6 py-2 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="text-emerald-500 hover:bg-emerald-100"><Check className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingRowId(null)} className="text-rose-500 hover:bg-rose-100"><X className="h-4 w-4" /></Button>
                                    </div>
                                </td>
                            </>
                        ) : (
                            <>
                                <td className="px-6 py-4 text-sm font-medium text-foreground">{cat.name}</td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">{categoryUsage[cat.id] || 0}</td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                        <Button size="icon" variant="ghost" onClick={() => { setViewingCategory(cat); setIsViewModalOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleStartEdit(cat)}><PencilIcon className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setDeletingCategory(cat)} className="text-rose-500 hover:text-rose-600"><TrashIcon className="h-4 w-4" /></Button>
                                    </div>
                                </td>
                            </>
                        )}
                    </tr>
                ))}
            </Table>
        );
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-foreground">Category Management</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!dataState.categories.loaded ? <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </> : <>
                        <StatCard icon={Tag} title="Total Categories" value={stats.total} color="bg-violet-500" />
                        <StatCard icon={Tag} title="Unused Categories" value={stats.unused} color="bg-amber-500" />
                    </>}
                </div>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative w-full sm:max-w-xs">
                            <Input id="cat-search" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 !py-1.5 text-sm" />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button onClick={openAddModal}><Plus className="h-4 w-4 mr-2 -ml-1" />Add Category</Button>
                    </CardHeader>
                    <CardContent>{renderContent()}</CardContent>
                    {dataState.categories.loaded && filteredCategories.length > itemsPerPage && (
                        <CardFooter><Pagination itemsPerPage={itemsPerPage} totalItems={filteredCategories.length} currentPage={currentPage} paginate={setCurrentPage} /></CardFooter>
                    )}
                </Card>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Category" footer={<Button onClick={handleAddNewCategory}>Save</Button>}>
                <Input id="name" label="Category Name" value={newCategoryData.name} onChange={e => setNewCategoryData({ name: e.target.value })} />
            </Modal>

            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`View Category: ${viewingCategory?.name || ''}`} size="lg">
                {viewingCategory && (
                    <div className="space-y-4">
                        <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{categoryUsage[viewingCategory.id] || 0}</span> products are assigned to this category.
                        </p>
                        
                        <h4 className="text-lg font-semibold text-foreground pt-4 border-t">
                            Assigned Products
                        </h4>

                        {productsInViewingCategory.length > 0 ? (
                            <div className="max-h-80 overflow-y-auto border rounded-md sidebar-scrollbar">
                                <Table headers={['Product Name', 'SKU', { content: 'Price', className: 'text-right' }]}>
                                    {productsInViewingCategory.map(product => (
                                        <tr key={product.id}>
                                            <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{product.sku}</td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(product.price)}</td>
                                        </tr>
                                    ))}
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-muted rounded-lg">
                                <p className="text-muted-foreground">No products are currently assigned to this category.</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!deletingCategory} onClose={() => setDeletingCategory(null)} title="Confirm Deletion">
                <p>Are you sure you want to delete <strong className="text-foreground">{deletingCategory?.name}</strong>? This action cannot be undone.</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingCategory(null)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>
        </>
    );
};

export default CategoryManagement;