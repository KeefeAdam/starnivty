export default function HomePage({ onNavigate }) {
  return <main className="shop home-page">
    <header className="home-header">
      <p className="eyebrow">WELCOME TO OUR STORE</p>
      <h1>Semua kebutuhanmu, ada di satu tempat.</h1>
      <p className="muted">Pilih layanan yang ingin kamu gunakan untuk mulai.</p>
    </header>
    <section className="service-grid" aria-label="Pilih layanan">
      <button className="service-card" type="button" onClick={() => onNavigate("/booking")}>
        <span className="service-icon">⌂</span><span className="eyebrow">SERVICE 01</span>
        <h2>Booking Room</h2><p className="muted">Pesan ruangan untuk meeting, acara, atau kebutuhanmu.</p><span className="service-link">Pesan ruangan →</span>
      </button>
      <button className="service-card" type="button" onClick={() => onNavigate("/products")}>
        <span className="service-icon">✦</span><span className="eyebrow">SERVICE 02</span>
        <h2>Beli Barang</h2><p className="muted">Temukan produk pilihan dan lakukan pembayaran dengan Duitku.</p><span className="service-link">Lihat produk →</span>
      </button>
    </section>
  </main>;
}
