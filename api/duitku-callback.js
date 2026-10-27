import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "../lib/server.js";

function signatureIsValid(received, expected) {
  if (typeof received !== "string" || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const a = Buffer.from(received, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  try {
    // Duitku sends application/x-www-form-urlencoded. Vercel parses this into req.body.
    const { merchantCode, amount, merchantOrderId, resultCode, signature, reference, paymentCode } = req.body ?? {};
    const apiKey = process.env.DUITKU_API_KEY;
    if (!apiKey || typeof merchantCode !== "string" || typeof amount !== "string" ||
        typeof merchantOrderId !== "string" || typeof signature !== "string") {
      return res.status(400).send("Invalid callback parameters");
    }
    const expected = createHmac("sha256", apiKey).update(`${merchantCode}${amount}${merchantOrderId}`).digest("hex");
    if (merchantCode !== process.env.DUITKU_MERCHANT_CODE || !signatureIsValid(signature, expected)) {
      return res.status(400).send("Invalid signature");
    }
    if (!/^\d+$/.test(amount) || typeof reference !== "string" || !["00", "01"].includes(resultCode)) {
      return res.status(400).send("Invalid callback data");
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase.from("orders")
      .select("id,total_idr,payment_status,duitku_reference")
      .eq("order_number", merchantOrderId).maybeSingle();
    if (error) throw error;
    if (!order || String(order.total_idr) !== amount ||
        (order.duitku_reference && order.duitku_reference !== reference)) {
      return res.status(400).send("Order mismatch");
    }
    if (order.payment_status === "paid") return res.status(200).send("OK");

    const nextStatus = resultCode === "00" ? "paid" : "failed";
    const update = {
      payment_status: nextStatus,
      duitku_reference: reference,
      payment_method: typeof paymentCode === "string" ? paymentCode : null,
      updated_at: new Date().toISOString()
    };
    if (nextStatus === "paid") update.paid_at = new Date().toISOString();

    const { data: changed, error: updateError } = await supabase.from("orders")
      .update(update).eq("id", order.id).eq("payment_status", "pending").select("id");
    if (updateError) throw updateError;
    if (!changed?.length) {
      const { data: latest, error: latestError } = await supabase.from("orders")
        .select("payment_status").eq("id", order.id).single();
      if (latestError) throw latestError;
      if (latest.payment_status !== nextStatus && latest.payment_status !== "paid") return res.status(409).send("Order status conflict");
    }
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Duitku callback error:", error.message);
    return res.status(500).send("Callback processing failed");
  }
}
