import { useCartStore } from '../store/CartStore';
import { Link, useNavigate } from 'react-router-dom';

export default function Cart() {
  const { items, setQty, removeItem, clear, total } = useCartStore();
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/" className="underline mt-4 inline-block">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Your Cart</h1>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item._id} className="flex items-center gap-4 border rounded-lg p-3 bg-white">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded" />
              : <div className="w-20 h-20 bg-gray-100 rounded" />
            }

            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
              <div className="text-gray-600">${Number(item.price).toFixed(2)}</div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm">Qty</label>
                <input
                  type="number"
                  min="1"
                  className="w-20 border rounded px-2 py-1"
                  value={item.qty || 1}
                  onChange={(e) => setQty(item._id, Number(e.target.value))}
                />
              </div>
            </div>

            <div className="text-right">
              <div className="font-semibold">
                ${(Number(item.price) * (item.qty || 1)).toFixed(2)}
              </div>
              <button className="text-red-600 underline text-sm mt-2" onClick={() => removeItem(item._id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button className="text-sm underline" onClick={clear}>Clear cart</button>
        <div className="text-xl font-semibold">Total: ${total().toFixed(2)}</div>
      </div>

      <div className="flex justify-end gap-3">
        <Link to="/" className="border px-4 py-2 rounded">Continue shopping</Link>
        <button className="bg-black text-white px-4 py-2 rounded" onClick={() => navigate('/checkout')}>
          Checkout
        </button>
      </div>
    </div>
  );
}
