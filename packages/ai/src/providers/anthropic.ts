import Anthropic from '@anthropic-ai/sdk'
import type { InventoryDataPoint } from '../statistical'

export interface LlmPredictionResult {
  provider: 'anthropic' | 'openai'
  daysUntilStockout: number | null
  reasoning: string
  confidence: 'low' | 'medium' | 'high'
}

export async function predictWithAnthropic(
  apiKey: string,
  productTitle: string,
  snapshots: InventoryDataPoint[],
  currentQuantity: number,
): Promise<LlmPredictionResult> {
  const client = new Anthropic({ apiKey })

  const snapshotSummary = snapshots
    .slice(-14)
    .map((s) => `${s.date}: ${s.quantity} units`)
    .join('\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `You are a supply chain analyst. Based on the following inventory history for "${productTitle}", predict how many days until stockout.

Inventory history (last 14 days):
${snapshotSummary}

Current quantity: ${currentQuantity}

Respond with JSON only:
{"daysUntilStockout": <number or null if unclear>, "reasoning": "<1 sentence>", "confidence": "<low|medium|high>"}`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
  try {
    const parsed = JSON.parse(text) as { daysUntilStockout: number | null; reasoning: string; confidence: 'low' | 'medium' | 'high' }
    return { provider: 'anthropic', ...parsed }
  } catch {
    return { provider: 'anthropic', daysUntilStockout: null, reasoning: 'Parse error', confidence: 'low' }
  }
}
