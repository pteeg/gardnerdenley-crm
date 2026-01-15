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

const MiniRevenueChart = ({ salesProgressions = [] }) => {
  // Get current month and calculate previous and next months
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  // Calculate previous month
  const prevDate = new Date(currentYear, currentMonth - 2, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  // Calculate next month
  const nextDate = new Date(currentYear, currentMonth, 1);
  const nextYear = nextDate.getFullYear();
  const nextMonth = nextDate.getMonth() + 1;

  // Create month keys
  const prevMonthKey = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
  const nextMonthKey = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`;

  // Process data for the three months
  const processChartData = () => {
    const deals = salesProgressions.filter(row => 
      row.invoiceAmount && 
      (row.paymentExpected || row.completionDateSet || row.targetCompletionDate)
    );

    const monthlyPaid = {};
    const monthlyPending = {};
    const monthlyPaidBreakdown = {};
    const monthlyPendingBreakdown = {};

    deals.forEach(deal => {
      const dateStr = deal.paymentExpected || deal.completionDateSet || deal.targetCompletionDate;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;

      // Only process the three months we're showing
      if (key !== prevMonthKey && key !== currentMonthKey && key !== nextMonthKey) return;

      const amount = Number(deal.invoiceAmount) || 0;
      const isPaid = deal.invoicePaid === 'Done';

      if (isPaid) {
        monthlyPaid[key] = (monthlyPaid[key] || 0) + amount;
        (monthlyPaidBreakdown[key] = monthlyPaidBreakdown[key] || []).push({ client: deal.client, amount });
      } else {
        monthlyPending[key] = (monthlyPending[key] || 0) + amount;
        (monthlyPendingBreakdown[key] = monthlyPendingBreakdown[key] || []).push({ client: deal.client, amount });
      }
    });

    // Create arrays for the three months in order: previous, current, next
    const months = [prevMonthKey, currentMonthKey, nextMonthKey];
    const paid = months.map(key => monthlyPaid[key] || 0);
    const pending = months.map(key => monthlyPending[key] || 0);
    const paidDetails = months.map(key => monthlyPaidBreakdown[key] || []);
    const pendingDetails = months.map(key => monthlyPendingBreakdown[key] || []);

    return { months, paid, pending, paidDetails, pendingDetails };
  };

  const { months, paid, pending, paidDetails, pendingDetails } = processChartData();
  const totals = months.map((_, i) => (paid[i] || 0) + (pending[i] || 0));
  const maxValue = Math.max(...totals, 1000); // Use 1000 as minimum to show axis properly

  // Format month labels
  const monthLabels = months.map(month => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  });

  // Chart configuration
  const chartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Paid (£)',
        data: paid,
        backgroundColor: 'rgba(85, 85, 85, 0.9)',
        borderColor: 'rgb(85, 85, 85)',
        borderWidth: 1,
        borderRadius: (ctx) => {
          const pendingVal = ctx.chart.data.datasets[1]?.data?.[ctx.dataIndex] || 0;
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
        backgroundColor: 'rgba(255, 140, 0, 0.85)',
        borderColor: 'rgb(255, 140, 0)',
        borderWidth: 1,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: 'revenue',
        datalabels: {
          labels: {
            inside: {
              color: 'white',
              font: { weight: 'bold', size: 10 },
              align: 'center',
              anchor: 'center',
              formatter: function(value) {
                if (!value) return '';
                return '£' + Number(value).toLocaleString();
              },
            },
            total: {
              color: '#555',
              font: { weight: 'bold', size: 11 },
              align: 'end',
              anchor: 'end',
              offset: 8,
              clip: false,
              formatter: function(value, ctx) {
                const paidVal = ctx.chart.data.datasets[0].data[ctx.dataIndex] || 0;
                const pendingVal = ctx.chart.data.datasets[1].data[ctx.dataIndex] || 0;
                const total = paidVal + pendingVal;
                return '£' + Number(total).toLocaleString();
              },
            },
          },
        }
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: -10,
        bottom: -15,
        left: 0,
        right: 0,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          boxWidth: 12,
          padding: 4,
          font: { size: 10 },
        },
        padding: {
          top: -10,
          bottom: 2,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const isPaid = (context.dataset.label || '').startsWith('Paid');
            const items = isPaid ? paidDetails[index] : pendingDetails[index];
            if (!items || items.length === 0) return '';
            const lines = items.map(it => `${it.client}: £${Number(it.amount).toLocaleString()}`);
            return lines;
          }
        }
      },
      datalabels: {
        display: true,
        color: 'white',
        font: { weight: 'bold', size: 10 },
        formatter: function(value, ctx) {
          if (ctx.dataset && ctx.dataset.label === 'Pending (£)') return '';
          if (!value) return '';
          return '£' + Number(value).toLocaleString();
        },
        anchor: 'center',
        align: 'center',
        clip: false,
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10 },
          padding: 5,
        },
        position: 'bottom',
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grace: '10%',
        suggestedMax: maxValue * 1.15,
        grid: {
          display: false,
        },
        ticks: {
          display: false, // Hide y-axis numbers
        },
        position: 'left',
      },
    },
  };

  // Always show the chart, even when there's no revenue
  return (
    <div style={{ height: '100%', width: '100%', minHeight: '150px', display: 'flex', flexDirection: 'column', paddingTop: '0', paddingBottom: '0', marginBottom: '-20px' }}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default MiniRevenueChart;
