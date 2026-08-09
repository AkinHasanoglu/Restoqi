export interface InventoryDataPoint {
  date: string
  quantity: number
}

export interface PredictionResult {
  provider: 'statistical'
  daysUntilStockout: number | null
  avgDailySales: number
  confidence: 'low' | 'medium' | 'high'
}

export function calculateStatisticalPrediction(snapshots: InventoryDataPoint[]): PredictionResult {
  if (snapshots.length < 2) {
    return { provider: 'statistical', daysUntilStockout: null, avgDailySales: 0, confidence: 'low' }
  }

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  const currentQuantity = sorted[sorted.length - 1]!.quantity

  // Calculate daily sales velocity using linear regression
  const n = sorted.length
  const xMean = (n - 1) / 2
  const quantities = sorted.map((s) => s.quantity)
  const yMean = quantities.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (quantities[i]! - yMean)
    denominator += (i - xMean) ** 2
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const avgDailySales = Math.max(0, -slope)

  if (avgDailySales <= 0) {
    return { provider: 'statistical', daysUntilStockout: null, avgDailySales: 0, confidence: 'low' }
  }

  const daysUntilStockout = Math.floor(currentQuantity / avgDailySales)
  const confidence = n >= 14 ? 'high' : n >= 7 ? 'medium' : 'low'

  return { provider: 'statistical', daysUntilStockout, avgDailySales, confidence }
}
