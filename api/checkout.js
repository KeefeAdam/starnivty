import { createHmac, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "../lib/server.js";

function createSignature(merchantCode, timestamp, apiKey) {
  return createHmac("sha256", apiKey)
    .update(`${merchantCode}${timestamp}`)
    .digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { customerName, customerEmail, items } = req.body ?? {};
    if (typeof customerName !== "string" || !customerName.trim() || customerName.trim().length > 100 ||
        typeof customerEmail !== "string" || customerEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
        !Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res.status(400).json({ error: "Data checkout tidak valid." });
    }

    const quantities = new Map();
    for (const item of items) {
      if (!item || typeof item.productId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.productId) ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        return res.status(400).json({ error: "Item produk tidak valid." });
      }
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    if ([...quantities.values()].some((q) => q > 20)) return res.status(400).json({ error: "Jumlah produk melewati batas." });

    const supabase = getSupabaseAdmin();
    const ids = [...quantities.keys()];
    const { data: products, error: productsError } = await supabase
      .from("products").select("id,name,price_idr").in("id", ids).eq("is_active", true);
    if (productsError) throw productsError;
    if (!products || products.length !== ids.length) return res.status(400).json({ error: "Ada produk yang tidak tersedia." });

    const orderItems = products.map((product) => {
      const quantity = quantities.get(product.id);
      const unitPrice = Number(product.price_idr);
      const subtotal = unitPrice * quantity;
      if (!Number.isSafeInteger(unitPrice) || unitPrice < 1 || !Number.isSafeInteger(subtotal)) throw new Error("Harga produk tidak valid.");
      return { product_id: product.id, product_name: product.name, quantity, unit_price_idr: unitPrice, subtotal_idr: subtotal };
    });
    const total = orderItems.reduce((sum, item) => sum + item.subtotal_idr, 0);
    if (!Number.isSafeInteger(total) || total < 1) return res.status(400).json({ error: "Total pembayaran tidak valid." });

    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const baseUrl = process.env.DUITKU_BASE_URL || "https://api-sandbox.duitku.com";
    const appUrl = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
    if (!merchantCode || !apiKey || !appUrl) throw new Error("Konfigurasi Duitku belum lengkap. Periksa environment variables server.");
    if (!/^https?:\/\//i.test(appUrl)) throw new Error("APP_BASE_URL harus berupa URL lengkap.");

    const orderNumber = `ORD-${randomUUID()}`;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      order_number: orderNumber,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim().toLowerCase(),
      total_idr: total,
      payment_status: "pending"
    }).select("id,order_number").single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw itemsError;

    const timestamp = Date.now().toString();
    const payload = {
      paymentAmount: total,
      merchantOrderId: orderNumber,
      productDetails: `Pembelian ${orderItems.length} produk digital`,
      additionalParam: "",
      merchantUserInfo: customerEmail.trim().toLowerCase(),
      paymentMethod: "",
      customerVaName: customerName.trim().slice(0, 20),
      email: customerEmail.trim().toLowerCase(),
      itemDetails: orderItems.map((item) => ({ name: item.product_name.slice(0, 100), price: item.unit_price_idr, quantity: item.quantity })),
      callbackUrl: `${appUrl}/api/duitku-callback`,
      returnUrl: `${appUrl}/order-status?order=${encodeURIComponent(orderNumber)}`,
      expiryPeriod: 60
    };

    const duitkuResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/merchant/createInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-duitku-merchantcode": merchantCode,
        "x-duitku-timestamp": timestamp,
        "x-duitku-signature": createSignature(merchantCode, timestamp, apiKey)
      },
      body: JSON.stringify(payload)
    });
    const invoice = await duitkuResponse.json().catch(() => ({}));
    if (!duitkuResponse.ok || invoice.statusCode !== "00" || !invoice.reference || !invoice.paymentUrl) {
      console.error("Duitku createInvoice failed:", invoice.statusMessage || duitkuResponse.status);
      return res.status(502).json({ error: "Duitku gagal membuat invoice. Coba lagi atau periksa konfigurasi sandbox." });
    }

    const { error: updateError } = await supabase.from("orders").update({ duitku_reference: invoice.reference, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) throw updateError;

    return res.status(200).json({ orderNumber, paymentUrl: invoice.paymentUrl });
  } catch (error) {
    console.error("Checkout error:", error.message);
    return res.status(500).json({ error: "Checkout gagal diproses. Periksa konfigurasi server dan log lokal." });
  }
}
