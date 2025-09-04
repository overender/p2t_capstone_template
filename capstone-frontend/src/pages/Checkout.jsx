import { useEffect, useState, useMemo } from 'react';
import { useCartStore } from '../store/CartStore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ clientSecret }) {
  const { items, total, clear } = useCartStore();
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus('Processing...');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setStatus(error.message || 'Payment failed.');
      return;
    }

    try {
      await api.post('/orders', {
        items,
        paymentId: paymentIntent?.id || 'test_payment',
      });
      clear();
      navigate('/');
    } catch {
      setStatus('Payment succeeded, but saving the order failed.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      {/* Summary */}
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        <ul className="divide-y">
          {items.map(it => (
            <li key={it._id} className="py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {it.imageUrl
                  ? <img src={it.imageUrl} alt={it.name} className="w-12 h-12 object-cover rounded" />
                  : <div className="w-12 h-12 bg-gray-100 rounded" />
                }
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-500">Qty: {it.qty || 1}</div>
                </div>
              </div>
              <div className="font-medium">${(Number(it.price) * (it.qty || 1)).toFixed(2)}</div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-semibold">${total().toFixed(2)}</span>
        </div>
      </div>

      {/* Payment form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        <div className="flex justify-end gap-3">
          <Link to="/cart" className="border px-4 py-2 rounded">Back to Cart</Link>
          <button className="bg-black text-white px-4 py-2 rounded" disabled={!stripe}>
            Pay
          </button>
        </div>
        {status && <div className="text-sm text-gray-600">{status}</div>}
      </form>
    </div>
  );
}

export default function Checkout() {
  const { items } = useCartStore();
  const [clientSecret, setClientSecret] = useState('');
  const [initError, setInitError] = useState('');

  // Fetch clientSecret before mounting <Elements>
  useEffect(() => {
    const init = async () => {
      try {
  await api.post('/orders', { items, paymentId: paymentIntent?.id || 'test_payment' });
  clear();
  navigate('/');
} catch (e) {
  console.error('Save order failed:', e?.response?.data || e?.message || e);
  const msg = e?.response?.data?.message || 'Payment succeeded, but saving the order failed.';
  setStatus(msg);
}

    };
    init();
  }, [items]);

  const options = useMemo(() => (
    clientSecret ? { clientSecret, appearance: { theme: 'stripe' } } : undefined
  ), [clientSecret]);

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/" className="underline mt-4 inline-block">Back to shop</Link>
      </div>
    );
  }

  if (initError) {
    return <div className="max-w-3xl mx-auto p-6 text-red-600">{initError}</div>;
  }

  if (!clientSecret) {
    return <div className="max-w-3xl mx-auto p-6 text-gray-500">Preparing payment…</div>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
}
