import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCart = create(
  persist(
    (set, get) => ({
      items: [], // [{ _id, name, price, imageUrl, qty }]
      add: (item) => {
        const items = [...get().items];
        const i = items.findIndex((x) => x._id === item._id);
        if (i >= 0) items[i].qty += item.qty || 1;
        else items.push({ ...item, qty: item.qty || 1 });
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((x) => x._id !== id) }),
      setQty: (id, qty) => {
        if (qty < 1) return;
        const items = get().items.map((x) => (x._id === id ? { ...x, qty } : x));
        set({ items });
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, x) => s + x.price * x.qty, 0),
    }),
    { name: "cart" }
  )
);

// Optional alias if some pages import useCartStore:
export const useCartStore = useCart;
