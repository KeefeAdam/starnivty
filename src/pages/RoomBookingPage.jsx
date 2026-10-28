import { useEffect, useMemo, useState } from "react";

const rooms = [
  { id: "meeting", name: "Meeting Room", shortName: "MEETING ROOM", hourlyRate: 50000 },
  { id: "event", name: "Event Room", shortName: "EVENT ROOM", hourlyRate: 100000 },
];
const hours = Array.from({ length: 13 }, (_, index) => index + 8);

function getLocalDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(value) {
  return value?.slice(0, 5) ?? "";
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(value);
}

export default function RoomBookingPage({ onNavigate }) {
  const [bookingDate, setBookingDate] = useState(getLocalDate);
  const [roomFilter, setRoomFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(rooms[0].id);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const today = useMemo(getLocalDate, []);
  const visibleRooms = roomFilter === "all" ? rooms : rooms.filter((room) => room.id === roomFilter);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSchedule() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/room-availability?date=${encodeURIComponent(bookingDate)}`, {
          signal: controller.signal, cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat jadwal booking.");
        setBookings(result.bookings ?? []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setBookings([]);
          setError(requestError.message || "Gagal memuat jadwal booking.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadSchedule();
    return () => controller.abort();
  }, [bookingDate]);

  function getBooking(roomId, hour) {
    return bookings.find((booking) => {
      const start = Number(booking.start_time.slice(0, 2));
      const end = Number(booking.end_time.slice(0, 2));
      return booking.room_id === roomId && hour >= start && hour < end;
    });
  }

  function getMaxEndHour(roomId, startHour) {
    let endHour = startHour + 1;
    while (endHour <= 20 && !getBooking(roomId, endHour)) endHour += 1;
    return endHour;
  }

  function submitBooking(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return <main className="shop booking-page">
    <button className="back-link" type="button" onClick={() => onNavigate("/")}>← Pilih layanan lain</button>
    <header className="shop-header booking-header">
      <div><p className="eyebrow">ROOM BOOKING</p><h1>Pilih jadwal ruangan yang tersedia.</h1><p className="muted">Gunakan filter di kiri untuk melihat jadwal pada tanggal tertentu.</p></div>
    </header>
    <section className="schedule-layout">
      <aside className="schedule-filters">
        <h2>Filter jadwal</h2>
        <label>Pilih tanggal<input type="date" min={today} value={bookingDate} onChange={(event) => { setBookingDate(event.target.value); setSubmitted(false); }} /></label>
        <label>Filter ruangan<select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
          <option value="all">Semua ruangan</option>
          {rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}
        </select></label>
        <div className="filter-divider" />
        <p className="muted">Klik ruangan yang masih kosong pada jadwal di kanan untuk memilihnya.</p>
      </aside>
      <div className="schedule-panel">
        <div className="schedule-title"><div><p className="eyebrow">JADWAL BOOKING AKTIF</p><h2>⏰ {formatDate(bookingDate)}</h2></div><span className="schedule-status">{loading ? "Memuat…" : `Diperbarui untuk ${bookingDate}`}</span></div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="schedule-scroll"><div className="schedule-grid" style={{ "--room-count": visibleRooms.length }}>
          <div className="schedule-cell schedule-head">WAKTU</div>
          {visibleRooms.map((room) => <div className="schedule-cell schedule-head room-head" key={room.id}>{room.shortName}<small>{room.name}</small></div>)}
          {hours.map((hour) => <div className="schedule-row" key={hour}>
            <div className="schedule-cell schedule-time">{String(hour).padStart(2, "0")}:00</div>
            {visibleRooms.map((room) => {
              const booking = getBooking(room.id, hour);
              return <button type="button" key={room.id} className={`schedule-cell schedule-slot ${booking ? "occupied" : "available"}`} disabled={Boolean(booking)} onClick={() => { setSelectedRoom(room.id); setSubmitted(false); setSelectedSlot({ room, hour, endHour: hour + 1 }); }}>
                {booking && <><strong>{booking.customer_name || "Sudah terbooking"}</strong><small>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</small></>}
                {!booking && <span>{selectedRoom === room.id ? "Pilih" : "Tersedia"}</span>}
              </button>;
            })}
          </div>)}
        </div></div>
        {!bookings.length && !loading && !error && <p className="availability-message">Belum ada booking pada tanggal ini. Semua room tersedia.</p>}
      </div>
    </section>
    {selectedSlot && <div className="booking-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setSelectedSlot(null);
    }}>
      <form className="booking-modal" onSubmit={submitBooking}>
        <button className="modal-close" type="button" aria-label="Tutup form booking" onClick={() => setSelectedSlot(null)}>×</button>
        <p className="eyebrow">BOOKING ROOM</p>
        <h2>{selectedSlot.room.name}</h2>
        <p className="muted">Atur durasi booking sesuai kebutuhanmu.</p>
        <label>Jam selesai<select value={selectedSlot.endHour} onChange={(event) => setSelectedSlot({ ...selectedSlot, endHour: Number(event.target.value) })}>
          {Array.from({ length: getMaxEndHour(selectedSlot.room.id, selectedSlot.hour) - selectedSlot.hour }, (_, index) => selectedSlot.hour + index + 1)
            .map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}
        </select></label>
        <div className="modal-booking-summary"><span>Tanggal</span><strong>{formatDate(bookingDate)}</strong><span>Ruangan</span><strong>{selectedSlot.room.name}</strong><span>Waktu</span><strong>{String(selectedSlot.hour).padStart(2, "0")}:00 - {String(selectedSlot.endHour).padStart(2, "0")}:00</strong><span>Durasi</span><strong>{selectedSlot.endHour - selectedSlot.hour} jam</strong><span>Harga per jam</span><strong>{rupiah(selectedSlot.room.hourlyRate)}</strong><span>Total</span><strong className="modal-total">{rupiah((selectedSlot.endHour - selectedSlot.hour) * selectedSlot.room.hourlyRate)}</strong></div>
        <label>Nama lengkap<input required autoFocus maxLength={100} autoComplete="name" placeholder="Nama pelanggan" /></label>
        <label>Email<input required type="email" maxLength={254} autoComplete="email" placeholder="nama@email.com" /></label>
        <button type="submit" className="checkout-button">Konfirmasi booking</button>
        {submitted && <p className="success" role="status">Permintaan booking diterima. Tim kami akan menghubungimu untuk konfirmasi.</p>}
      </form>
    </div>}
  </main>;
}
