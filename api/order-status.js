import { getSupabaseAdmin } from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const orderNumber = req.query.order;
  if (typeof orderNumber !== "string" || !/^ORD-[0-9a-f-]{36}$/i.test(orderNumber)) {
    return res.status(400).json({ error: "Nomor pesanan tidak valid." });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase.from("orders")
      .select("order_number,total_idr,payment_status,fulfillment_status,created_at")
      .eq("order_number", orderNumber).maybeSingle();
    if (error) throw error;
    res.setHeader("Cache-Control", "no-store, max-age=0");
    if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    return res.status(200).json({ order });
  } catch (error) {
    console.error("Order status error:", error.message);
    return res.status(500).json({ error: "Gagal mengambil status pesanan." });
  }
}
