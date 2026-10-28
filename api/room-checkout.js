import { createHmac, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "../lib/server.js";

const rooms = { meeting: 50000, event: 100000 };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function createSignature(merchantCode, timestamp, apiKey) {
  return createHmac("sha256", apiKey).update(`${merchantCode}${timestamp}`).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = req.body ?? {};
    const { customerName, customerEmail, roomId, bookingDate, startHour, endHour } = body;
    if (typeof customerName !== "string" || !customerName.trim() || customerName.trim().length > 100 ||
        typeof customerEmail !== "string" || customerEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
        typeof roomId !== "string" || !rooms[roomId] || typeof bookingDate !== "string" || !datePattern.test(bookingDate) ||
        !Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 8 || endHour > 21 || endHour <= startHour) {
      return res.status(400).json({ error: "Data booking tidak valid." });
    }

    const duration = endHour - startHour;
    const total = rooms[roomId] * duration;
    const supabase = getSupabaseAdmin();
    const { data: conflicts, error: conflictError } = await supabase.from("room_bookings")
      .select("id").eq("room_id", roomId).eq("booking_date", bookingDate).neq("status", "cancelled")
      .lt("start_time", `${String(endHour).padStart(2, "0")}:00:00`)
      .gt("end_time", `${String(startHour).padStart(2, "0")}:00:00`);
    if (conflictError) throw conflictError;
    if (conflicts?.length) return res.status(409).json({ error: "Jadwal tersebut baru saja terbooking. Silakan pilih waktu lain." });

    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const baseUrl = process.env.DUITKU_BASE_URL || "https://api-sandbox.duitku.com";
    const appUrl = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
    if (!merchantCode || !apiKey || !appUrl) throw new Error("Konfigurasi Duitku belum lengkap.");
    if (!/^https?:\/\//i.test(appUrl)) throw new Error("APP_BASE_URL harus berupa URL lengkap.");

    const orderNumber = `ORD-${randomUUID()}`;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      order_number: orderNumber, customer_name: customerName.trim(),
      customer_email: customerEmail.trim().toLowerCase(), total_idr: total, payment_status: "pending",
    }).select("id,order_number").single();
    if (orderError) throw orderError;
    const { error: bookingError } = await supabase.from("room_bookings").insert({
      room_id: roomId, booking_date: bookingDate,
      start_time: `${String(startHour).padStart(2, "0")}:00:00`,
      end_time: `${String(endHour).padStart(2, "0")}:00:00`,
      customer_name: customerName.trim(), order_number: orderNumber, status: "pending",
    });
    if (bookingError) throw bookingError;

    const timestamp = Date.now().toString();
    const invoiceResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/merchant/createInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-duitku-merchantcode": merchantCode, "x-duitku-timestamp": timestamp, "x-duitku-signature": createSignature(merchantCode, timestamp, apiKey) },
      body: JSON.stringify({
        paymentAmount: total, merchantOrderId: orderNumber,
        productDetails: `Booking ${roomId} ${bookingDate} ${startHour}:00-${endHour}:00`,
        additionalParam: "", merchantUserInfo: customerEmail.trim().toLowerCase(), paymentMethod: "",
        customerVaName: customerName.trim().slice(0, 20), email: customerEmail.trim().toLowerCase(),
        itemDetails: [{ name: `Booking ${roomId}`, price: rooms[roomId], quantity: duration }],
        callbackUrl: `${appUrl}/api/duitku-callback`, returnUrl: `${appUrl}/order-status?order=${encodeURIComponent(orderNumber)}`, expiryPeriod: 60,
      }),
    });
    const invoice = await invoiceResponse.json().catch(() => ({}));
    if (!invoiceResponse.ok || invoice.statusCode !== "00" || !invoice.reference || !invoice.paymentUrl) {
      console.error("Duitku room invoice failed:", invoice.statusMessage || invoiceResponse.status);
      await supabase.from("room_bookings").update({ status: "cancelled" }).eq("order_number", orderNumber);
      await supabase.from("orders").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
      return res.status(502).json({ error: "Duitku gagal membuat invoice booking." });
    }
    const { error: updateError } = await supabase.from("orders").update({ duitku_reference: invoice.reference, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) throw updateError;
    return res.status(200).json({ orderNumber, paymentUrl: invoice.paymentUrl });
  } catch (error) {
    console.error("Room checkout error:", error.message);
    return res.status(500).json({ error: "Checkout booking gagal diproses." });
  }
}
