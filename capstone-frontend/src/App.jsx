import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Products from './components/Products';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import Cart from './pages/Cart.jsx';
import Navbar from './components/Navbar.jsx';
import Checkout from './pages/Checkout.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
  <Route path="/" element={<Products />} />
  <Route path="/login" element={<Login />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="/cart" element={<Cart />} />
  <Route path="/checkout" element={<Checkout />} />
</Routes>
      </main>
    </BrowserRouter>
  );
}



