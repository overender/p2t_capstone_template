import { NavLink } from 'react-router-dom';
import React from 'react';
import { useCartStore } from '../store/CartStore';

export default function Navbar() {
  const { items, total } = useCartStore();
  const count = items?.reduce((n, it) => n + (it.qty || 1), 0);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <NavLink to="/" className="text-xl font-bold text-indigo-600">
          My Shop
        </NavLink>

        <div className="flex items-center gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `hover:text-indigo-600 transition ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700'
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `relative hover:text-indigo-600 transition ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-gray-700'
              }`
            }
          >
            Cart
            <span className="ml-2 inline-flex items-center gap-1 text-sm">
              <span className="rounded-full bg-gray-200 px-2 py-0.5">{count}</span>
              <span className="text-gray-500">${total().toFixed(2)}</span>
            </span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
