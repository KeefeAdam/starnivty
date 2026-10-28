import { useEffect, useMemo, useState } from "react";

const rooms = [
  { id: "meeting", name: "Meeting Room", description: "Ruang nyaman untuk meeting dan diskusi tim.", capacity: "hingga 8 orang" },
  { id: "event", name: "Event Room", description: "Ruangan luas untuk workshop atau acara kecil.", capacity: "hingga 30 orang" },
];

export default function RoomBookingPage({ onNavigate }) {
  const [selectedRoom, setSelectedRoom] = useState(rooms[0].id);
  const [bookingDate, setBookingDate] = useState("");
  const [bookedRoomIds, setBookedRoomIds] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!bookingDate) {
      setBookedRoomIds([]);
      setAvailabilityError("");
      return;
    }

    const controller = new AbortController();
    async function checkAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError("");
      try {
        const response = await fetch(`/api/room-availability?date=${encodeURIComponent(bookingDate)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memeriksa ketersediaan room.");
        setBookedRoomIds(result.bookedRoomIds);
        setSelectedRoom((current) => result.bookedRoomIds.includes(current)
          ? rooms.find((room) => !result.bookedRoomIds.includes(room.id))?.id ?? current
          : current);
      } catch (error) {
        if (error.name !== "AbortError") {
          setBookedRoomIds([]);
          setAvailabilityError(error.message || "Gagal memeriksa ketersediaan room.");
        }
      } finally {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      }
    }
    checkAvailability();
    return () => controller.abort();
  }, [bookingDate]);

  function submitBooking(event) {
    event.preventDefault();
    if (bookedRoomIds.includes(selectedRoom)) return;
    setSubmitted(true);
  }

  function changeDate(event) {
    setBookingDate(event.target.value);
    setSubmitted(false);
  }

  return <main className="shop">
    <button className="back-link" type="button" onClick={() => onNavigate("/")}>← Pilih layanan lain</button>
    <header className="shop-header">
      <div><p className="eyebrow">ROOM BOOKING</p><h1>Temukan ruang yang pas untuk agendamu.</h1><p className="muted">Pilih tanggal untuk melihat room yang masih tersedia.</p></div>
    </header>
    <section className="booking-layout">
      <div><h2>Cek ketersediaan</h2>
        <label className="date-filter">Pilih tanggal<input required type="date" min={today} value={bookingDate} onChange={changeDate} /></label>
        {!bookingDate && <p className="muted availability-message">Pilih tanggal untuk melihat room yang tersedia.</p>}
        {availabilityLoading && <p className="muted availability-message">Memeriksa ketersediaan room…</p>}
        {availabilityError && <p className="error availability-message" role="alert">{availabilityError}</p>}
        {bookingDate && !availabilityLoading && !availabilityError && <p className="availability-message">
          {bookedRoomIds.length === rooms.length ? "Semua room sudah terbooking pada tanggal ini." : `${rooms.length - bookedRoomIds.length} room tersedia pada tanggal ini.`}
        </p>}
        <div className="room-list">{rooms.map((room) => {
          const isBooked = bookedRoomIds.includes(room.id);
          return <button key={room.id} type="button" disabled={isBooked || !bookingDate} className={`room-card ${selectedRoom === room.id ? "selected" : ""} ${isBooked ? "booked" : ""}`} onClick={() => setSelectedRoom(room.id)}>
            <span className="room-icon">▦</span><span><strong>{room.name} {isBooked && <em>Sudah terbooking</em>}</strong><small>{room.description}</small><small>{room.capacity}</small></span>
          </button>;
        })}</div>
      </div>
      <form className="booking-form" onSubmit={submitBooking}>
        <h2>Detail booking</h2>
        <label>Nama lengkap<input required maxLength={100} autoComplete="name" placeholder="Nama pelanggan" /></label>
        <label>Email<input required type="email" maxLength={254} autoComplete="email" placeholder="nama@email.com" /></label>
        <label>Tanggal<input required type="date" min={today} value={bookingDate} onChange={changeDate} /></label>
        <label>Waktu<input required type="time" /></label>
        <button type="submit" className="checkout-button" disabled={!bookingDate || availabilityLoading || Boolean(availabilityError) || bookedRoomIds.includes(selectedRoom)}>Ajukan booking</button>
        {submitted && <p className="success" role="status">Permintaan booking diterima. Tim kami akan menghubungimu untuk konfirmasi.</p>}
      </form>
    </section>
  </main>;
}
