// src/pages/Admin.jsx
import { useEffect, useState } from 'react';
import { createProduct, deleteProduct, fetchProducts, uploadImage } from '../services/ProductService';
import { currentUser, logout } from '../services/AuthService';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [me] = useState(currentUser());
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
    categories: '',
  });
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!me || me.role !== 'admin') {
      navigate('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, navigate]);

  const load = async () => {
    const data = await fetchProducts();
    setItems(data);
  };

  const onDelete = async (id) => {
    try {
      await deleteProduct(id);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete product';
      alert(msg);
    }
  };
  
const onFileSelect = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    setUploading(true);
    const { url } = await uploadImage(file);
    setForm(f => ({ ...f, imageUrl: url }));
  } catch (e) {
    alert(`Image upload failed: ${e.message}`);
  } finally {
    setUploading(false);
  }
};


  const onCreate = async (e) => {
    e.preventDefault();

    const priceNum = Number(form.price);
    if (!form.name?.trim()) {
      alert('Name is required');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Price must be a valid number');
      return;
    }

    const payload = {
      ...form,
      price: priceNum,
      // categories can be comma-separated; server will normalize
    };

    try {
      await createProduct(payload);
      setForm({ name: '', price: '', description: '', imageUrl: '', categories: '' });
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create product';
      alert(msg);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{me?.email}</span>
          <button onClick={handleLogout} className="border px-3 py-1 rounded">Logout</button>
        </div>
      </div>

      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          placeholder="Name"
          className="border p-2 rounded"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Price"
          className="border p-2 rounded"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
        <input
          placeholder="Image URL (auto-filled after upload)"
          className="border p-2 rounded md:col-span-2"
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
        />
        <input
          name="image"
          type="file"
          accept="image/*"
          className="border p-2 rounded md:col-span-2"
          onChange={onFileSelect}
        />
        {uploading && (
          <div className="text-sm text-gray-600 md:col-span-2">Uploading image…</div>
        )}
        <input
          placeholder="Categories (comma-separated)"
          className="border p-2 rounded md:col-span-2"
          value={form.categories}
          onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))}
        />
        <textarea
          placeholder="Description"
          className="border p-2 rounded md:col-span-2"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <button className="bg-black text-white px-4 py-2 rounded md:col-span-2">
          Create Product
        </button>
      </form>

      <div className="divide-y">
        {items.map((p, i) => (
          <div
            key={p._id || p.id || `${p.name || 'item'}-${i}`}
            className="py-3 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-600">${p.price}</div>
            </div>
            <button
              onClick={() => onDelete(p._id)}
              className="border px-3 py-1 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
