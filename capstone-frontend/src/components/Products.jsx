import { useEffect, useMemo, useState } from 'react';
import { fetchProducts } from '../services/ProductService';
import { useCartStore } from '../store/CartStore';

export default function Products({ products: productsProp }) {
  const [items, setItems] = useState(productsProp ?? []);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const { addItem } = useCartStore();

  useEffect(() => {
    if (productsProp) { setLoading(false); return; }
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchProducts(category || undefined);
        setItems(data);
        setErr('');
      } catch (e) {
        setErr('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category, productsProp]);

  const displayItems = useMemo(() => items ?? [], [items]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">Category</label>
        <select
          className="border rounded px-3 py-2 bg-white"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Clothing">Clothing</option>
          <option value="Footwear">Footwear</option>
          <option value="Accessories">Accessories</option>
        </select>
      </div>

      {/* States */}
      {loading && <div className="text-gray-500">Loading products…</div>}
      {err && !loading && <div className="text-red-600">{err}</div>}
      {!loading && !displayItems.length && <div>No products yet.</div>}

      {/* Grid */}
      {!loading && !!displayItems.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {displayItems.map((p) => (
            <div key={p._id} className="bg-white rounded-xl shadow-sm border p-4 flex flex-col">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-44 object-cover rounded-lg mb-3"
                />
              ) : (
                <div className="w-full h-44 bg-gray-100 rounded-lg mb-3" />
              )}

              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-gray-600">${Number(p.price).toFixed(2)}</div>
                {p.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.description}</p>
                )}
              </div>

              <button
                className="mt-4 w-full inline-flex items-center justify-center gap-2 border rounded-lg px-3 py-2 hover:bg-gray-50 active:bg-gray-100 transition"
                onClick={() =>
                  addItem({
                    _id: p._id,
                    name: p.name,
                    price: Number(p.price),
                    imageUrl: p.imageUrl,
                  })
                }
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
