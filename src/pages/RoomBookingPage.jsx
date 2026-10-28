import { useState } from "react";

const rooms = [
  { id: "meeting", name: "Meeting Room", description: "Ruang nyaman untuk meeting dan diskusi tim.", capacity: "hingga 8 orang" },
  { id: "event", name: "Event Room", description: "Ruangan luas untuk workshop atau acara kecil.", capacity: "hingga 30 orang" },
];

export default function RoomBookingPage({ onNavigate }) {
  const [selectedRoom, setSelectedRoom] = useState(rooms[0].id);
  const [submitted, setSubmitted] = useState(false);

  function submitBooking(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return <main className="shop">
    <button className="back-link" type="button" onClick={() => onNavigate("/")}>← Pilih layanan lain</button>
    <header className="shop-header">
      <div><p className="eyebrow">ROOM BOOKING</p><h1>Temukan ruang yang pas untuk agendamu.</h1><p className="muted">Pilih ruangan, tanggal, dan waktu yang kamu butuhkan.</p></div>
    </header>
    <section className="booking-layout">
      <div><h2>Pilih ruangan</h2><div className="room-list">{rooms.map((room) => <button key={room.id} type="button" className={`room-card ${selectedRoom === room.id ? "selected" : ""}`} onClick={() => setSelectedRoom(room.id)}>
        <span className="room-icon">▦</span><span><strong>{room.name}</strong><small>{room.description}</small><small>{room.capacity}</small></span>
      </button>)}</div></div>
      <form className="booking-form" onSubmit={submitBooking}>
        <h2>Detail booking</h2>
        <label>Nama lengkap<input required maxLength={100} autoComplete="name" placeholder="Nama pelanggan" /></label>
        <label>Email<input required type="email" maxLength={254} autoComplete="email" placeholder="nama@email.com" /></label>
        <label>Tanggal<input required type="date" /></label>
        <label>Waktu<input required type="time" /></label>
        <button type="submit" className="checkout-button">Ajukan booking</button>
        {submitted && <p className="success" role="status">Permintaan booking diterima. Tim kami akan menghubungimu untuk konfirmasi.</p>}
      </form>
    </section>
  </main>;
}
