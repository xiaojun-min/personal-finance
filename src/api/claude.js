import { CATEGORY_NAMES } from "../constants";

export async function parseStatement(pdfBase64, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `You are a financial data parser. Extract all transactions from this bank statement PDF and return structured JSON.

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "month": "Month YYYY (e.g. June 2026)",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "merchant or description (keep concise, max 50 chars)",
      "amount": 12.34,
      "type": "debit",
      "category": "Food & Dining"
    }
  ]
}

Rules:
- amount is always a positive number
- type: "debit" for spending/withdrawals, "credit" for deposits/income/refunds
- Categories must be one of: ${CATEGORY_NAMES.join(", ")}
- Skip obvious internal transfers (e.g. "Transfer to Savings", "ACH Transfer")
- If month is unclear, infer from dates
- date format: YYYY-MM-DD`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse API response");
  return JSON.parse(match[0]);
}
