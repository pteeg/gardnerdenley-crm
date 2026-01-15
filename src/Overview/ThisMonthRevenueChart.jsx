import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const ThisMonthRevenueChart = ({ salesProgressions = [] }) => {
  // Get current month and adjacent months
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Calculate previous and next month
  const prevMonth = new Date(currentYear, currentMonth - 2, 1); // month is 0-indexed
  const nextMonth = new Date(currentYear, currentMonth, 1);
  
  const getMonthLabel = (date) => {
    return date.toLocaleDateString('en-GB', { month: 'short' });
  };
  
  // Process data for previous, current, and next month
  const processChartData = () => {
    // Consider all deals that affect invoicing (need invoiceAmount and paymentExpected)
    const deals = salesProgressions.filter(row => row.invoiceAmount && (row.paymentExpected || row.completionDateSet || row.targetCompletionDate));

    // Calculate previous, current, and next month dates
    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1); // month is 0-indexed
    const nextMonthDate = new Date(currentYear, currentMonth, 1);
    
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;

    // Group sums by month: paid vs pending
    const monthlyPaid = { prev: 0, current: 0, next: 0 };
    const monthlyPending = { prev: 0, current: 0, next: 0 };

    deals.forEach(deal => {
      const dateStr = deal.paymentExpected || deal.completionDateSet || deal.targetCompletionDate;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const amount = Number(deal.invoiceAmount) || 0;
      const isPaid = deal.invoicePaid === 'Done';

      // Check which month this deal belongs to
      if (year === prevYear && month === prevMonth) {
        if (isPaid) {
          monthlyPaid.prev += amount;
        } else {
          monthlyPending.prev += amount;
        }
      } else if (year === currentYear && month === currentMonth) {
        if (isPaid) {
          monthlyPaid.current += amount;
        } else {
          monthlyPending.current += amount;
        }
      } else if (year === nextYear && month === nextMonth) {
        if (isPaid) {
          monthlyPaid.next += amount;
        } else {
          monthlyPending.next += amount;
        }
      }
    });

    return { 
      paid: [monthlyPaid.prev, monthlyPaid.current, monthlyPaid.next],
      pending: [monthlyPending.prev, monthlyPending.current, monthlyPending.next]
    };
  };

  const { paid, pending } = processChartData();
  const totals = paid.map((p, i) => p + pending[i]);
  const maxValue = Math.max(...totals, ...paid, ...pending, 1);
  const currentTotal = totals[1]; // Total for current month

  // Chart configuration
  const chartData = {
    labels: [getMonthLabel(prevMonth), getMonthLabel(now), getMonthLabel(nextMonth)],
    datasets: [
      {
        label: 'Paid (£)',
        data: paid,
        backgroundColor: 'rgba(85, 85, 85, 0.9)',
        borderColor: 'rgb(85, 85, 85)',
        borderWidth: 1,
        borderRadius: (ctx) => {
          const i = ctx.dataIndex;
          const pendingVal = ctx.chart.data.datasets[1]?.data?.[i] || 0;
          if (pendingVal > 0) {
            return { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 };
          }
          return { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 };
        },
        borderSkipped: false,
        stack: 'revenue',
      },
      {
        label: 'Pending (£)',
        data: pending,
        backgroundColor: 'rgba(255, 140, 0, 0.85)', // orange
        borderColor: 'rgb(255, 140, 0)',
        borderWidth: 1,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, // No rounded corners at bottom
        borderSkipped: false,
        stack: 'revenue',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label.replace(' (£)', '');
            return label + ': £' + context.parsed.y.toLocaleString();
          }
        }
      },
      datalabels: {
        anchor: (ctx) => {
          // Show labels for all three months
          if (!ctx) return false;
          
          const monthIndex = ctx.dataIndex;
          const monthTotal = totals[monthIndex];
          
          // For pending dataset, always show total on top of the entire bar if there's a total
          if (ctx.datasetIndex === 1 && monthTotal > 0) {
            return 'end'; // Top of the bar
          }
          // If only paid (no pending), show total on top of paid bar
          if (ctx.datasetIndex === 0 && monthTotal > 0 && pending[monthIndex] === 0) {
            return 'end'; // Top of the bar
          }
          return false;
        },
        align: (ctx) => {
          // Show labels for all three months
          if (!ctx) return 'top';
          
          const monthIndex = ctx.dataIndex;
          const monthTotal = totals[monthIndex];
          
          // Show total on top for pending dataset (or paid if no pending)
          if (ctx.datasetIndex === 1 && monthTotal > 0) {
            return 'top';
          }
          // If only paid (no pending), show total on top of paid bar
          if (ctx.datasetIndex === 0 && monthTotal > 0 && pending[monthIndex] === 0) {
            return 'top';
          }
          return 'top';
        },
        formatter: (value, ctx) => {
          // Show labels for all three months
          if (!ctx) return '';
          
          const monthIndex = ctx.dataIndex;
          const monthTotal = totals[monthIndex];
          
          // For pending dataset, always show total on top if there's a total
          if (ctx.datasetIndex === 1 && monthTotal > 0) {
            return '£' + monthTotal.toLocaleString();
          }
          // If only paid (no pending), show total on top of paid bar
          if (ctx.datasetIndex === 0 && monthTotal > 0 && pending[monthIndex] === 0) {
            return '£' + monthTotal.toLocaleString();
          }
          // Don't show individual amounts in bar sections
          return '';
        },
        color: (ctx) => {
          // Only for the middle bar
          if (!ctx || ctx.dataIndex !== 1) return '#333';
          
          // White text for dark grey bars (paid)
          if (ctx.datasetIndex === 0) {
            return '#fff';
          }
          // Dark text for orange bars (pending) or total on top
          return '#333';
        },
        font: (ctx) => {
          // Make current month (index 1) bolder than previous/next months
          const isCurrentMonth = ctx && ctx.dataIndex === 1;
          return {
            weight: isCurrentMonth ? 'bold' : 'normal',
            size: 14,
          };
        },
        clip: false,
        padding: {
          top: 8,
          bottom: 4,
        },
        offset: (ctx) => {
          // Add extra offset for total label on top
          if (!ctx) return 0;
          const monthIndex = ctx.dataIndex;
          const monthTotal = totals[monthIndex];
          if (ctx.datasetIndex === 1 && monthTotal > 0) {
            return 8;
          }
          if (ctx.datasetIndex === 0 && monthTotal > 0 && pending[monthIndex] === 0) {
            return 8;
          }
          return 0;
        },
        display: (ctx) => {
          // Show labels for all three months
          if (!ctx) return false;
          const monthIndex = ctx.dataIndex;
          const monthTotal = totals[monthIndex];
          // Always show total on pending dataset if there's a total
          if (ctx.datasetIndex === 1 && monthTotal > 0) return true;
          // Show total on paid if only paid (no pending)
          if (ctx.datasetIndex === 0 && monthTotal > 0 && pending[monthIndex] === 0) return true;
          // Don't show individual amounts
          return false;
        },
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
        y: {
        stacked: true,
        title: {
          display: false,
        },
        beginAtZero: true,
        grace: '15%',
        suggestedMax: maxValue ? Math.ceil(maxValue * 1.1) : undefined,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 6,
          callback: function(value) {
            return '£' + value.toLocaleString();
          }
        },
      },
    },
  };

  // If no data, show placeholder
  const allTotals = totals.reduce((sum, val) => sum + val, 0);
  if (allTotals === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#6c757d',
        fontSize: '1.1rem',
        fontWeight: '500'
      }}>
        📊 No revenue data for this month
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Bar 
          data={chartData} 
          options={chartOptions}
          key={`revenue-chart-${currentYear}-${currentMonth}`}
        />
      </div>
    </div>
  );
};

export default ThisMonthRevenueChart;

