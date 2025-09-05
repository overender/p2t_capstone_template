import { useEffect, useState } from "react";
import { useCart } from "../store/cart";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";

const pk = import.meta.env.VITE_STRIPE_PK;
const stripePromise = pk ? loadStripe(pk) : null;

export default function Checkout() {
  const { items, total, clear } = useCart();
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setError("");
      if (!items.length) return;
      if (!pk) { setError("Stripe publishable key missing."); return; }
      try {
        const { data } = await api.post("/create-payment-intent", { items });
        if (!cancelled) setClientSecret(data?.clientSecret || null);
      } catch (e) {
        if (!cancelled) {
          const status = e?.response?.status;
          if (status === 401) {
            setError("You must be logged in to checkout.");
          } else {
            setError(e?.response?.data?.message || "Failed to start payment.");
          }
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [items]);

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto my-8">
        <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8">
      <h1 className="text-2xl font-semibold mb-2">Checkout</h1>
      <div className="text-gray-700 mb-4">Total: <span className="font-semibold">${total().toFixed(2)}</span></div>
      {error && <div className="rounded bg-red-50 text-red-700 p-3 mb-3">{error}</div>}

      {!pk ? (
        <div className="rounded border bg-yellow-50 text-yellow-800 p-3">Missing VITE_STRIPE_PK</div>
      ) : !clientSecret ? (
        <div className="rounded border bg-gray-50 text-gray-700 p-3">Preparing payment…</div>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <InnerCheckout
            onPaid={async (paymentId) => {
              try { await api.post("/orders", { items, paymentId }); } catch {}
              clear();
              navigate("/", { replace: true });
            }}
            total={total()}
          />
        </Elements>
      )}
    </div>
  );
}

function InnerCheckout({ onPaid, total }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!stripe || !elements) {
      setMsg("Payment UI still loading…");
      return;
    }
    setSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {}, // no redirect
      redirect: "if_required",
    });

    setSubmitting(false);

    if (error) {
      setMsg(error.message || "Payment failed.");
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onPaid(paymentIntent.id);
    } else {
      setMsg("Payment not completed. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <PaymentElement />
      {msg && <div className="rounded bg-red-50 text-red-700 p-2 text-sm">{msg}</div>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? "Processing…" : `Pay $${total.toFixed(2)}`}
      </button>
      {!stripe && (
        <div className="text-xs text-gray-500">Loading payment UI…</div>
      )}
    </form>
  );
}
