import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useCart } from "../store/cart";

export default function Navbar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const count = useCart((s) => s.items.reduce((n, it) => n + it.qty, 0));

  return (
    <nav style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Link to="/">Xoluv</Link>
        <Link to="/cart">Cart ({count})</Link>
      </div>

      {!user ? (
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span>{user.name} ({user.role})</span>
          <button onClick={logout}>Logout</button>
        </div>
      )}
      {user?.role === "admin" && (
  <>
    <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">Admin</Link>
    <Link to="/admin/orders" className="text-sm text-gray-600 hover:text-gray-900">Orders</Link>
  </>
)}

    </nav>
  );
}
