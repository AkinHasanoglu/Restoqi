export type { InventoryDataPoint, PredictionResult } from './statistical'
export { calculateStatisticalPrediction } from './statistical'
export type { LlmPredictionResult } from './providers/anthropic'
export { predictWithAnthropic } from './providers/anthropic'
export { predictWithOpenAI } from './providers/openai'

export type AiProvider = 'anthropic' | 'openai' | 'statistical'

export interface ApiKeys {
  anthropic?: string
  openai?: string
}

export async function predictInventory(
  apiKeys: ApiKeys,
  productTitle: string,
  snapshots: import('./statistical').InventoryDataPoint[],
  currentQuantity: number,
): Promise<import('./statistical').PredictionResult | import('./providers/anthropic').LlmPredictionResult> {
  if (apiKeys.anthropic) {
    const { predictWithAnthropic: predict } = await import('./providers/anthropic')
    return predict(apiKeys.anthropic, productTitle, snapshots, currentQuantity)
  }
  if (apiKeys.openai) {
    const { predictWithOpenAI: predict } = await import('./providers/openai')
    return predict(apiKeys.openai, productTitle, snapshots, currentQuantity)
  }
  const { calculateStatisticalPrediction } = await import('./statistical')
  return calculateStatisticalPrediction(snapshots)
}
