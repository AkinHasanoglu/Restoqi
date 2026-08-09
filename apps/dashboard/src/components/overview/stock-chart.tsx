'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface StockDataPoint {
  date: string
  quantity: number
}

interface StockChartProps {
  data: StockDataPoint[]
  title?: string
}

// TODO: stock_history tablosu eklenince gerçek veri kullan
export function StockChart({ data, title = 'Stok Trendi — Son 7 Gün' }: StockChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
        Stok geçmişi verisi yok
      </div>
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-muted-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            stroke="hsl(240 3.8% 46.1%)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(240 3.8% 46.1%)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(0 0% 100%)',
              border: '1px solid hsl(240 5.9% 90%)',
              borderRadius: '8px',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: 'hsl(240 5.9% 26%)', fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="quantity"
            stroke="hsl(24 100% 50%)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(24 100% 50%)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
