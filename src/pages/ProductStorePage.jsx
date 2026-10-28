import ProductCatalog from "../components/ProductCatalog";

export default function ProductStorePage({ onNavigate }) {
  return <main className="shop">
    <button className="back-link" type="button" onClick={() => onNavigate("/")}>← Pilih layanan lain</button>
    <header className="shop-header">
      <div><p className="eyebrow">PRODUCT STORE</p><h1>Temukan produk favoritmu.</h1><p className="muted">Pilih produk, checkout, lalu selesaikan pembayaran dengan Duitku.</p></div>
    </header>
    <ProductCatalog />
    <footer><p className="muted">Pembayaran diproses melalui Duitku.</p></footer>
  </main>;
}
