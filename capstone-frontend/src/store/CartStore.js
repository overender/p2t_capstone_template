import { create } from 'zustand';

const persisted = JSON.parse(localStorage.getItem('cart') || '[]');

export const useCartStore = create((set, get) => ({
  items: persisted,
  addItem: (item) => {
    const items = [...get().items];
    const i = items.findIndex(p => p._id === item._id);
    if (i >= 0) items[i].qty += 1;
    else items.push({ ...item, qty: 1 });
    set({ items });
    localStorage.setItem('cart', JSON.stringify(items));
  },
  removeItem: (id) => {
    const items = get().items.filter(p => p._id !== id);
    set({ items });
    localStorage.setItem('cart', JSON.stringify(items));
  },
  setQty: (id, qty) => {
    const items = get().items.map(p => p._id === id ? { ...p, qty: Math.max(1, qty|0) } : p);
    set({ items });
    localStorage.setItem('cart', JSON.stringify(items));
  },
  clear: () => { set({ items: [] }); localStorage.removeItem('cart'); },
  total: () => get().items.reduce((sum, p) => sum + Number(p.price) * (p.qty||1), 0),
}));
