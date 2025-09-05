import { useEffect, useState } from "react";
import api from "../api";
import { useCart } from "../store/cart";

export default function Products() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [category, setCategory] = useState("");
  const add = useCart((s) => s.add);

  async function loadProducts(cat = "") {
    setLoading(true); setErr("");
    try {
      const url = cat ? `/products?category=${encodeURIComponent(cat)}` : "/products";
      const { data } = await api.get(url);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(category); }, [category]);

  function handleAdd(p) {
    add({
      _id: p._id,
      name: p.name,
      price: Number(p.price) || 0,
      imageUrl: p.imageUrl || "",
      qty: 1,
    });
  }

  return (
    <div className="container">
      <div className="mx-auto my-8 max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Store</h1>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Books">Books</option>
              {/* add your own categories */}
            </select>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white p-6 text-gray-600">
            No products yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <article
                key={p._id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-48 w-full rounded-t-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-48 w-full rounded-t-xl bg-gray-100" />
                )}

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-2 text-base font-semibold">{p.name}</h3>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-gray-600">{p.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-lg font-bold">
                      ${Number(p.price || 0).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAdd(p)}
                      className="inline-flex items-center justify-center rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-900"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  const arr = Array.from({ length: 8 });
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {arr.map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-48 w-full rounded-t-xl bg-gray-200" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
            <div className="h-8 w-24 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
