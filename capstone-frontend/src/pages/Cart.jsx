import { useCart } from "../store/cart";
import { Link, useNavigate } from "react-router-dom";

export default function Cart() {
  const { items, remove, setQty, total } = useCart();
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <div style={{ maxWidth: 800, margin: "2rem auto" }}>
        <h1>Your Cart</h1>
        <p>Cart is empty. <Link to="/">Shop</Link></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto" }}>
      <h1>Your Cart</h1>
      {items.map((it) => (
        <div key={it._id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
          {it.imageUrl && <img src={it.imageUrl} alt={it.name} width={60} height={60} />}
          <div style={{ flex: 1 }}>
            <div>{it.name}</div>
            <div>${Number(it.price).toFixed(2)}</div>
          </div>
          <input
            type="number"
            min={1}
            value={it.qty}
            onChange={(e) => setQty(it._id, Number(e.target.value))}
            style={{ width: 64 }}
          />
          <button onClick={() => remove(it._id)}>Remove</button>
        </div>
      ))}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
        <strong>Total: ${total().toFixed(2)}</strong>
        <button onClick={() => navigate("/checkout")}>Go to Checkout</button>
      </div>
    </div>
  );
}
