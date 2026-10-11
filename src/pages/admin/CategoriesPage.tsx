import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { Category, Listing } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getAdminCategories(), api.getAdminListings()])
      .then(([cats, allListings]) => {
        setCategories(cats);
        setListings(allListings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setCurrentId(null);
    setName('');
    setSlug('');
    setDescription('');
    setSortOrder(String(categories.length + 1));
    setError(null);
    setIsEditing(true);
  };

  const openEdit = (cat: Category) => {
    setCurrentId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description);
    setSortOrder(String(cat.sort_order));
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.saveCategory({
        id: currentId || undefined,
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        sort_order: Number(sortOrder) || 1,
        active: true,
      });
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Cannot delete category');
    }
  };

  return (
    <AdminLayout
      title="Category Management"
      subtitle="Organize marketplace communities into searchable industry domains"
      actions={
        <button
          onClick={openCreate}
          className="px-4 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Add New Category</span>
        </button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Category Edit Form */}
        {isEditing && (
          <div className="bg-[#111622] rounded-2xl border border-[#FACC15]/40 p-6 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-base text-white">
              {currentId ? 'Edit Category' : 'Create New Category'}
            </h3>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-xs text-red-300 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#9CA3AF] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl cursor-pointer transition-all shadow-md"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Table */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-[#F3F4F6]">
            <thead className="bg-[#0D111A] border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Assigned Listings</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2637]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6B7280]">
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6B7280]">
                    No categories created yet.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const assignedCount = listings.filter((l) => l.category_id === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-[#161C2C]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{cat.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[#9CA3AF]">{cat.slug}</td>
                      <td className="py-3.5 px-4 text-[#9CA3AF] max-w-xs truncate">{cat.description || '—'}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-[#FACC15]">{assignedCount}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(cat)}
                            className="p-1.5 text-[#FACC15] hover:bg-[#161C2C] rounded cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            disabled={assignedCount > 0}
                            className="p-1.5 text-red-400 hover:bg-red-950/50 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={assignedCount > 0 ? 'Cannot delete with active listings' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
