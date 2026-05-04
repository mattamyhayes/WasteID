import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETTE = [
  '#166534', '#16a34a', '#4ade80', '#86efac',
  '#0369a1', '#0ea5e9', '#7dd3fc', '#bae6fd',
  '#9333ea', '#c084fc', '#f97316', '#fb923c',
  '#dc2626', '#f87171', '#ca8a04', '#fbbf24',
]

export default function CompositionChart({ components }) {
  if (!components || components.length === 0) return null

  const labels = components.map(c => c.component_name)
  const data = components.map(c => c.quantity)

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: components.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: '#fff',
      borderWidth: 2,
    }]
  }

  return (
    <div style={{ maxWidth: 340, margin: '0 auto' }}>
      <Pie
        data={chartData}
        options={{
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 12 }, padding: 12 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.parsed} ${components[ctx.dataIndex]?.unit || ''}`
              }
            }
          }
        }}
      />
    </div>
  )
}
