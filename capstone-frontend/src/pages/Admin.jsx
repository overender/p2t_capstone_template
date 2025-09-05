// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import api from "../api";

export default function Admin() {
  // Form state
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categories, setCategories] = useState(""); // comma-separated
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      if (!file) return setErr("Please choose an image.");
      if (!name.trim()) return setErr("Name is required.");
      if (!price) return setErr("Price is required.");

      setBusy(true);

      // 1) Upload image to Cloudinary (admin-only endpoint)
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = up.data.secure_url || up.data.url;
      if (!imageUrl) throw new Error("Upload failed: no URL returned");

      // 2) Create product
      const payload = {
        name: name.trim(),
        price: Number(price),
        categories: categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        description: description.trim(),
        imageUrl,
      };
      const { data } = await api.post("/products", payload);

      setMsg(`Saved ✅ ${data.name}`);
      // reset form
      setFile(null);
      setName("");
      setPrice("");
      setCategories("");
      setDescription("");

      // refresh table below
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin-products-refresh"));
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="mx-auto my-8 max-w-2xl">
        <h1 className="mb-4 text-2xl font-semibold">Admin</h1>

        {msg && <div className="mb-3 rounded bg-green-50 p-3 text-green-700">{msg}</div>}
        {err && <div className="mb-3 rounded bg-red-50 p-3 text-red-700">{err}</div>}

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-1 text-sm font-medium text-gray-700">Product Image</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-white hover:file:bg-black"
            />
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-gray-700">Name</div>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">Price</div>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-gray-700">Categories (comma-separated)</div>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="Electronics, Clothing"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-gray-700">Description</div>
            <textarea
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Upload & Save Product"}
          </button>
        </form>
      </div>

      {/* Products table */}
      <AdminProductsTable />
    </div>
  );
}

/* ====== Inline admin products table (delete + refresh) ====== */
function AdminProductsTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr(""); setLoading(true);
    try {
      const { data } = await api.get("/products");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // listen for refresh event from form above
    const handler = () => refresh();
    window.addEventListener("admin-products-refresh", handler);
    return () => window.removeEventListener("admin-products-refresh", handler);
  }, []);

  async function del(id) {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      setItems((list) => list.filter((p) => p._id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  }

  return (
    <div className="mx-auto my-8 max-w-3xl">
      <h2 className="mb-3 text-xl font-semibold">Products</h2>

      {err && <div className="mb-3 rounded bg-red-50 p-3 text-red-700">{err}</div>}

      {loading ? (
        <div className="rounded border bg-gray-50 p-3 text-gray-700">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Image</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Price</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id} className="border-t align-top">
                  <td className="px-3 py-2">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-100" />
                    )}
                  </td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">${Number(p.price || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => del(p._id)}
                      className="rounded bg-gray-800 px-3 py-1 text-white hover:bg-black"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={4}>
                    No products
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
