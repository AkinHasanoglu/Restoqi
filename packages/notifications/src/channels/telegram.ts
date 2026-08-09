import type { AlertPayload } from '../types'

export async function sendTelegramAlert(payload: AlertPayload, botToken: string, chatId: string) {
  const text = `⚠️ *Low Stock Alert*\n\n*${payload.productTitle}* (${payload.platform})\nCurrent stock: *${payload.currentQuantity}*\nThreshold: ${payload.thresholdValue}\n\n[View products](${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/products)`
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
  if (!res.ok) throw new Error(`Telegram API failed: ${res.status}`)
}
