import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Chart from 'chart.js/auto';

export function useChartExport() {
  const exportToExcel = async (dailyLog, mode = "dc") => {
    if (!dailyLog || dailyLog.length === 0) {
      alert("No data to export!");
      return;
    }

    const normalizedMode = mode === "mc4" ? "mc4" : "dc";
    const filteredLog = dailyLog.filter(entry => (entry.mode || "dc") === normalizedMode);

    if (filteredLog.length === 0) {
      alert(`No ${normalizedMode.toUpperCase()} records to export!`);
      return;
    }

    // 1. Aggregate Data
    // Sort by date
    const sortedLog = [...filteredLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 2. Prepare Chart Data
    const labels = sortedLog.map(l => l.date);
    const dataValues = sortedLog.map(l => {
      if (typeof l.value === "number") return l.value;
      if (typeof l.installed_length === "number") return l.installed_length;
      return 0;
    });
    const subLabels = sortedLog.map(l => {
        const sub = l.subcontractor ? l.subcontractor.slice(0, 3).toUpperCase() : "";
        const workers = l.workers || 0;
        return `${sub}-${workers}`; // e.g. BZ-23
    });

    const datasetLabel = normalizedMode === "mc4" ? "Daily MC4 Progress (pcs)" : "Daily Progress (m)";
    const axisLabel = normalizedMode === "mc4" ? "MC4 Installation (pcs)" : "DC Cable Pulling (m)";

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
          label: datasetLabel,
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
                text: axisLabel,
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
      { header: normalizedMode === 'mc4' ? 'Installed MC4 (pcs)' : 'Installed Length (m)', key: 'value', width: 20 },
    ];

    sortedLog.forEach(record => {
      const rowValue = typeof record.value === "number"
        ? record.value
        : (typeof record.installed_length === "number" ? record.installed_length : 0);

      sheet1.addRow({
        date: record.date,
        subcontractor: record.subcontractor,
        workers: record.workers,
        value: rowValue,
      });
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
    saveAs(blob, `Daily_${normalizedMode.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Cleanup
    chart.destroy();
  };

  return { exportToExcel };
}
