import { describe, it, expect } from 'vitest'
import { calculateStatisticalPrediction } from './statistical'

const days = (n: number) => {
  const base = new Date('2024-01-01')
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

describe('calculateStatisticalPrediction', () => {
  it('returns null for insufficient data', () => {
    const result = calculateStatisticalPrediction([{ date: '2024-01-01', quantity: 100 }])
    expect(result.daysUntilStockout).toBeNull()
    expect(result.avgDailySales).toBe(0)
    expect(result.confidence).toBe('low')
  })

  it('detects linear decline and predicts stockout', () => {
    const dates = days(14)
    const snapshots = dates.map((date, i) => ({ date, quantity: 100 - i * 5 }))
    const result = calculateStatisticalPrediction(snapshots)
    expect(result.daysUntilStockout).toBeGreaterThan(0)
    expect(result.avgDailySales).toBeCloseTo(5, 0)
    expect(result.confidence).toBe('high')
  })

  it('returns null days when stock is not declining', () => {
    const dates = days(14)
    const snapshots = dates.map((date) => ({ date, quantity: 100 }))
    const result = calculateStatisticalPrediction(snapshots)
    expect(result.daysUntilStockout).toBeNull()
    expect(result.avgDailySales).toBe(0)
  })

  it('returns medium confidence for 7+ days of data', () => {
    const dates = days(7)
    const snapshots = dates.map((date, i) => ({ date, quantity: 70 - i * 10 }))
    const result = calculateStatisticalPrediction(snapshots)
    expect(result.confidence).toBe('medium')
  })
})
