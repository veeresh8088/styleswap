/**
 * Admin Dashboard Chart.js Initializer
 */

function initAdminCharts(categoryLabels, categoryData, transactionStats) {
  // 1. Categories Breakdown Chart (Doughnut)
  const categoryCtx = document.getElementById('categoryChart');
  if (categoryCtx && categoryLabels && categoryData) {
    new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: categoryLabels,
        datasets: [
          {
            data: categoryData,
            backgroundColor: [
              '#D4AF37', // Gold
              '#C86D51', // Terracotta
              '#3B7A57', // Emerald
              '#D98282', // Lotus
              '#6B7280', // Slate
              '#E5B25D'  // Sand Gold
            ],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                family: 'Plus Jakarta Sans',
                size: 12
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // 2. Transaction Distribution Chart (Bar / Doughnut)
  const transCtx = document.getElementById('transactionChart');
  if (transCtx && transactionStats) {
    new Chart(transCtx, {
      type: 'bar',
      data: {
        labels: ['Purchases', 'Exchanges'],
        datasets: [
          {
            label: 'Total Completed Operations',
            data: [transactionStats.purchases || 0, transactionStats.exchanges || 0],
            backgroundColor: ['#D4AF37', '#3B7A57'],
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            grid: {
              color: '#F3F4F6'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}
