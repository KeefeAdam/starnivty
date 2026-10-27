import { createHmac, timingSafeEqual } from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set CHECK_TRANSACTION_TOKEN di environment variables server.
  const token = process.env.CHECK_TRANSACTION_TOKEN;
  const receivedToken = req.headers["x-debug-token"];

  if (
    !token ||
    typeof receivedToken !== "string" ||
    receivedToken.length !== token.length ||
    !timingSafeEqual(Buffer.from(receivedToken), Buffer.from(token))
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const { merchantOrderId } = req.body ?? {};

    if (!merchantCode || !apiKey || typeof merchantOrderId !== "string") {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const signature = createHmac("sha256", apiKey)
      .update(`${merchantCode}${merchantOrderId}`)
      .digest("hex");

    const response = await fetch(
      "https://sandbox.duitku.com/webapi/api/merchant/transactionStatus",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantCode,
          merchantOrderId,
          signature
        })
      }
    );

    const result = await response.json();
    return res.status(response.ok ? 200 : 502).json(result);
  } catch (error) {
    console.error("Transaction check failed:", error.message);
    return res.status(502).json({ error: "Failed to check transaction" });
  }
}