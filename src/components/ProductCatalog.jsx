import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const rupiah = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      if (!supabase) {
        setError("Konfigurasi Supabase belum lengkap. Isi file .env.local lalu restart server.");
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from("products")
        .select("id, name, description, price_idr, image_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (queryError) setError("Gagal memuat produk. Periksa konfigurasi Supabase dan SQL schema.");
      else setProducts(data ?? []);
      setLoading(false);
    }
    loadProducts();
    return () => { active = false; };
  }, []);

  const cartItems = useMemo(() => products
    .filter((product) => (cart[product.id] ?? 0) > 0)
    .map((product) => ({ ...product, quantity: cart[product.id] })), [products, cart]);
  const total = cartItems.reduce((sum, item) => sum + Number(item.price_idr) * item.quantity, 0);
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function changeQuantity(productId, amount) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[productId] ?? 0) + amount;
      if (quantity <= 0) delete next[productId];
      else if (quantity <= 20) next[productId] = quantity;
      return next;
    });
  }

  async function checkout(event) {
    event.preventDefault();
    setError("");
    if (!cartItems.length) return setError("Keranjang masih kosong.");
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          customerEmail: customer.email,
          items: cartItems.map(({ id, quantity }) => ({ productId: id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout gagal.");
      if (!result.paymentUrl) throw new Error("URL pembayaran tidak diterima dari Duitku.");
      window.location.assign(result.paymentUrl);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat checkout.");
      setCheckoutLoading(false);
    }
  }

  if (loading) return <p>Memuat produk…</p>;

  return <>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="catalog-heading">
      <div><h2>Katalog produk</h2><p className="muted">Produk pilihan yang bisa langsung kamu beli.</p></div>
      <div className="cart-count">Keranjang <strong>{count}</strong></div>
    </div>
    {!products.length ? <p className="muted">Belum ada produk aktif. Tambahkan produk di Supabase Table Editor.</p> :
      <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}>
        {product.image_url ? <img src={product.image_url} alt={product.name} className="product-image" /> :
          <div className="product-placeholder">PRODUCT</div>}
        <div className="product-info">
          <h3>{product.name}</h3>
          <p className="muted">{product.description}</p>
          <strong className="price">{rupiah(Number(product.price_idr))}</strong>
          <button type="button" onClick={() => changeQuantity(product.id, 1)}>+ Tambah ke keranjang</button>
          {(cart[product.id] ?? 0) > 0 && <div className="quantity">
            <button type="button" aria-label={`Kurangi ${product.name}`} onClick={() => changeQuantity(product.id, -1)}>−</button>
            <span>{cart[product.id]}</span>
            <button type="button" aria-label={`Tambah ${product.name}`} disabled={cart[product.id] >= 20} onClick={() => changeQuantity(product.id, 1)}>+</button>
          </div>}
        </div>
      </article>)}</div>}

    <section className="checkout-section">
      <h2>Keranjang dan checkout</h2>
      {!cartItems.length ? <p className="muted">Pilih produk untuk mulai berbelanja.</p> : <>
        <div className="cart-list">{cartItems.map((item) => <div className="cart-row" key={item.id}>
          <div><strong>{item.name}</strong><p className="muted">{item.quantity} × {rupiah(Number(item.price_idr))}</p></div>
          <strong>{rupiah(Number(item.price_idr) * item.quantity)}</strong>
        </div>)}</div>
        <div className="total-row"><span>Total</span><strong>{rupiah(total)}</strong></div>
        <form onSubmit={checkout}>
          <label>Nama lengkap<input required maxLength={100} autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Nama pelanggan" /></label>
          <label>Email<input required type="email" maxLength={254} autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="nama@email.com" /></label>
          <button type="submit" className="checkout-button" disabled={checkoutLoading}>{checkoutLoading ? "Membuat pembayaran…" : `Bayar ${rupiah(total)}`}</button>
        </form>
      </>}
    </section>
  </>;
}
