import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Chart from 'chart.js/auto';

export function useChartExport() {
  const exportToExcel = async (dailyLog) => {
    if (!dailyLog || dailyLog.length === 0) {
      alert("No data to export!");
      return;
    }

    // 1. Aggregate Data
    // Sort by date
    const sortedLog = [...dailyLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 2. Prepare Chart Data
    const labels = sortedLog.map(l => l.date);
    const dataValues = sortedLog.map(l => l.installed_length);
    const subLabels = sortedLog.map(l => {
        const sub = l.subcontractor ? l.subcontractor.slice(0, 3).toUpperCase() : "";
        const workers = l.workers || 0;
        return `${sub}-${workers}`; // e.g. BZ-23
    });

    // 3. Draw Chart
    const canvas = document.getElementById('dailyChart');
    if (!canvas) {
      console.error("Canvas #dailyChart not found");
      return;
    }
    
    // Destroy existing chart instance if any
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Progress (m)',
          data: dataValues,
          backgroundColor: '#3b82f6',
          borderColor: '#1d4ed8',
          borderWidth: 1
        }]
      },
      options: {
        animation: false,
        responsive: false,
        plugins: {
            legend: { display: true },
            tooltip: { enabled: false },
        },
        scales: {
            y: { 
              beginAtZero: true,
              title: {
                display: true,
                text: 'DC Cable Pulling (m)',
                font: {
                  weight: 'bold'
                }
              }
            }
        }
      },
      plugins: [{
        id: 'customLabels',
        afterDatasetsDraw(chart, args, options) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                    const text = subLabels[index];
                    if (text) {
                        ctx.fillStyle = 'black';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(text, bar.x, bar.y - 5);
                    }
                });
            });
        }
      }]
    });

    // Wait for render
    await new Promise(r => setTimeout(r, 100));

    const base64Image = canvas.toDataURL('image/png');
    
    // 4. Create Excel
    const workbook = new ExcelJS.Workbook();
    const sheet1 = workbook.addWorksheet('Daily Progress');
    const sheet2 = workbook.addWorksheet('Chart');

    // Sheet 1: Data
    sheet1.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Subcontractor', key: 'subcontractor', width: 20 },
      { header: 'Workers', key: 'workers', width: 10 },
      { header: 'Installed Length (m)', key: 'installed_length', width: 20 },
    ];

    sortedLog.forEach(record => {
      sheet1.addRow(record);
    });

    // Sheet 2: Image
    const imageId = workbook.addImage({
      base64: base64Image,
      extension: 'png',
    });

    sheet2.addImage(imageId, {
      tl: { col: 1, row: 1 },
      ext: { width: 800, height: 400 }
    });

    // 5. Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Daily_Progress_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Cleanup
    chart.destroy();
  };

  return { exportToExcel };
}
