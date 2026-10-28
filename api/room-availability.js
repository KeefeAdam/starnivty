import { getSupabaseAdmin } from "../lib/server.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const date = req.query.date;
  if (typeof date !== "string" || !datePattern.test(date)) {
    return res.status(400).json({ error: "Tanggal tidak valid." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("room_bookings")
      .select("room_id")
      .eq("booking_date", date)
      .neq("status", "cancelled");
    if (error) throw error;

    const bookedRoomIds = [...new Set((data ?? []).map((booking) => booking.room_id))];
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ date, bookedRoomIds });
  } catch (error) {
    console.error("Room availability error:", error.message);
    return res.status(500).json({ error: "Gagal memeriksa ketersediaan room. Pastikan tabel room_bookings sudah tersedia." });
  }
}
