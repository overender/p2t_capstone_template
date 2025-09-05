import { useEffect, useState } from "react";
import api from "../api";

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let off = false;
    (async () => {
      setErr(""); setLoading(true);
      try {
        const { data } = await api.get("/orders");
        if (!off) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!off) setErr(e?.response?.data?.message || "Failed to load orders");
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return () => { off = true; };
  }, []);

  return (
    <div className="container">
      <div className="mx-auto my-8 max-w-5xl">
        <h1 className="mb-4 text-2xl font-semibold">Orders (Admin)</h1>
        {err && <div className="mb-3 rounded bg-red-50 p-3 text-red-700">{err}</div>}
        {loading ? (
          <div className="rounded border bg-gray-50 p-3 text-gray-700">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Order #</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Total</th>
                  <th className="px-3 py-2 text-left">Items</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o._id} className="border-t align-top">
                    <td className="px-3 py-2">{o._id}</td>
                    <td className="px-3 py-2">{o.user?.email}</td>
                    <td className="px-3 py-2">${Number(o.total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <ul className="list-disc pl-5">
                        {o.items?.map((it, i) => (
                          <li key={i}>{it.name} × {it.qty} — ${Number(it.price).toFixed(2)}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td className="px-3 py-4 text-gray-500" colSpan={4}>No orders</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
