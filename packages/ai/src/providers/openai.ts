import OpenAI from 'openai'
import type { InventoryDataPoint } from '../statistical'
import type { LlmPredictionResult } from './anthropic'

export async function predictWithOpenAI(
  apiKey: string,
  productTitle: string,
  snapshots: InventoryDataPoint[],
  currentQuantity: number,
): Promise<LlmPredictionResult> {
  const client = new OpenAI({ apiKey })

  const snapshotSummary = snapshots
    .slice(-14)
    .map((s) => `${s.date}: ${s.quantity} units`)
    .join('\n')

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 256,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a supply chain analyst. Respond with JSON only.',
      },
      {
        role: 'user',
        content: `Based on inventory history for "${productTitle}", predict days until stockout.

Inventory history (last 14 days):
${snapshotSummary}

Current quantity: ${currentQuantity}

Respond: {"daysUntilStockout": <number or null>, "reasoning": "<1 sentence>", "confidence": "<low|medium|high>"}`,
      },
    ],
  })

  const text = completion.choices[0]?.message.content ?? '{}'
  try {
    const parsed = JSON.parse(text) as { daysUntilStockout: number | null; reasoning: string; confidence: 'low' | 'medium' | 'high' }
    return { provider: 'openai', ...parsed }
  } catch {
    return { provider: 'openai', daysUntilStockout: null, reasoning: 'Parse error', confidence: 'low' }
  }
}
