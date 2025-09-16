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

const WongaChart = ({ salesProgressions = [], startYear }) => {
  
  // Process data to group by financial year months (April to March)
  const processChartData = () => {
    // Consider all deals that affect invoicing (need invoiceAmount and paymentExpected)
    const deals = salesProgressions.filter(row => row.invoiceAmount && (row.paymentExpected || row.completionDateSet || row.targetCompletionDate));

    // Group sums by month: paid vs pending
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

      // Determine financial year
      let fy = year;
      if (month < 4) fy = year - 1; // Jan–Mar belong to previous FY

      if (fy !== startYear) return; // only selected FY

      const key = `${year}-${month.toString().padStart(2, '0')}`;
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

    // Create financial year months (April to March)
    const months = [];
    const paid = [];
    const pending = [];
    const paidDetails = [];
    const pendingDetails = [];

    for (let m = 4; m <= 12; m++) {
      const key = `${startYear}-${m.toString().padStart(2, '0')}`;
      months.push(key);
      paid.push(monthlyPaid[key] || 0);
      pending.push(monthlyPending[key] || 0);
      paidDetails.push(monthlyPaidBreakdown[key] || []);
      pendingDetails.push(monthlyPendingBreakdown[key] || []);
    }
    for (let m = 1; m <= 3; m++) {
      const key = `${startYear + 1}-${m.toString().padStart(2, '0')}`;
      months.push(key);
      paid.push(monthlyPaid[key] || 0);
      pending.push(monthlyPending[key] || 0);
      paidDetails.push(monthlyPaidBreakdown[key] || []);
      pendingDetails.push(monthlyPendingBreakdown[key] || []);
    }

    const totals = months.map((_, i) => (paid[i] || 0) + (pending[i] || 0));
    return { months, paid, pending, totals, paidDetails, pendingDetails };
  };

  const { months, paid, pending, totals, paidDetails, pendingDetails } = processChartData();

  // Chart configuration
  const chartData = {
    labels: months.map(month => {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-GB', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Paid (£)',
        data: paid,
        backgroundColor: 'rgba(85, 85, 85, 0.9)',
        borderColor: 'rgb(85, 85, 85)',
        borderWidth: 1,
        // Round top corners only if there's no pending segment for that month
        borderRadius: (ctx) => {
          const i = ctx.dataIndex;
          const pendingVal = ctx.chart.data.datasets[1]?.data?.[i] || 0;
          if (pendingVal > 0) {
            return { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 };
          }
          return { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 };
        },
        borderSkipped: false,
        stack: 'wonga',
      },
      {
        label: 'Pending (£)',
        data: pending,
        backgroundColor: 'rgba(255, 140, 0, 0.85)', // orange
        borderColor: 'rgb(255, 140, 0)',
        borderWidth: 1,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: 'wonga',
        datalabels: {
          // Use two labels: inside segment value (white) and top total (grey)
          labels: {
            inside: {
              color: 'white',
              font: { weight: 'bold', size: 11 },
              align: 'center',
              anchor: 'center',
              formatter: function(value) {
                if (!value) return '';
                return '£' + Number(value).toLocaleString();
              },
            },
            total: {
              color: '#555',
              font: { weight: 'bold', size: 12 },
              align: 'end',
              anchor: 'end',
              offset: 4,
              clip: false,
              formatter: function(value, ctx) {
                const i = ctx.dataIndex;
                const paidVal = ctx.chart.data.datasets[0].data[i] || 0;
                const pendingVal = ctx.chart.data.datasets[1].data[i] || 0;
                const total = paidVal + pendingVal;
                return total ? '£' + Number(total).toLocaleString() : '';
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
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Monthly Net GD Fees - FY ${startYear}/${startYear + 1}`,
        font: {
          size: 16,
          weight: 'bold',
        },
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
      // Base datalabels for segment values (inside bars)
      datalabels: {
        display: true,
        color: 'white',
        font: { weight: 'bold', size: 11 },
        formatter: function(value, ctx) {
          // We'll render Pending segment labels via the dataset-specific config (to also add totals),
          // so skip the base renderer for Pending to avoid duplicate labels.
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
        title: {
          display: true,
          text: 'Month',
        },
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Amount (£)',
        },
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          callback: function(value) {
            return '£' + value.toLocaleString();
          }
        },
      },
    },
  };

  // If no data, show placeholder
  if (months.length === 0) {
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
        📊 No completed deals data available for chart
      </div>
    );
  }

  // Navigation removed; parent controls FY

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default WongaChart;
