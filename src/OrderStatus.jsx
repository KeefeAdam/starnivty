import { useEffect, useState } from "react";

const rupiah = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

export default function OrderStatus() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const orderNumber = new URLSearchParams(window.location.search).get("order");

  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function loadStatus() {
      if (!orderNumber) {
        setError("Nomor pesanan tidak ditemukan.");
        setLoading(false);
        return;
      }
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/order-status?order=${encodeURIComponent(orderNumber)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat status.");
        if (active) { setOrder(result.order); setError(""); }
      } catch (err) {
        if (active) setError(err.message || "Gagal memuat status.");
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [orderNumber]);

  const label = order?.payment_status === "paid" ? "Pembayaran berhasil"
    : order?.payment_status === "failed" ? "Pembayaran gagal"
    : order?.payment_status === "expired" ? "Pembayaran kedaluwarsa"
    : "Menunggu pembayaran";

  return <main className="shop"><section className="checkout-section status-card">
    <p className="eyebrow">ORDER STATUS</p><h1>Status pesanan</h1>
    {loading && !order && <p>Memeriksa pesanan…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {order && <>
      <p className="muted">Nomor pesanan: {order.order_number}</p>
      <h2>{label}</h2>
      <p>Total: <strong>{rupiah(Number(order.total_idr))}</strong></p>
      <p className="muted">Status pembayaran: {order.payment_status}</p>
      {order.payment_status === "pending" && <p className="muted">Jika kamu sudah membayar, halaman ini akan memeriksa status secara berkala.</p>}
      {order.payment_status === "paid" && <p>Pembayaran telah dikonfirmasi. Pengiriman produk manual belum termasuk fase ini.</p>}
      <button type="button" onClick={() => window.location.assign("/")}>Kembali ke toko</button>
    </>}
  </section></main>;
}
