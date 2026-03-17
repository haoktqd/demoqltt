// Navigation logic between Level 1 and Level 2
function openLevel2(cardId) {
    // Hide all level 2 sections
    const allLevel2 = document.querySelectorAll('.level2-section');
    allLevel2.forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    
    // Show selected level 2 section
    const selectedLevel2 = document.getElementById('level2-' + cardId);
    if (selectedLevel2) {
        const level1 = document.getElementById('level1-view');
        
        level1.style.opacity = '0';
        setTimeout(() => {
            level1.classList.remove('active');
            level1.classList.add('hidden');
            
            selectedLevel2.classList.remove('hidden');
            selectedLevel2.classList.add('active');
            selectedLevel2.style.opacity = '1';
            
            // Render charts when opening level 2
            renderCharts();
        }, 300);
    }
}

function goBack() {
    // Hide all level 2 sections
    const allLevel2 = document.querySelectorAll('.level2-section');
    allLevel2.forEach(el => {
        el.style.opacity = '0';
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    
    // Show level 1
    const level1 = document.getElementById('level1-view');
    setTimeout(() => {
        level1.classList.remove('hidden');
        level1.classList.add('active');
        level1.style.opacity = '1';
        
        // Re-render trend charts when returning to level 1
        renderTrendCharts();
    }, 300);
}

// Format numeric values for display (strip floating-point mess)
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'number') return value;
    const formatted = value.toFixed(decimals);
    return formatted.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

// Function to switch chart metrics (Thực hiện, YoY, MoM, Xu hướng)
function switchChartMetric(button, chartId) {
    const container = button.parentElement;
    const buttons = container.querySelectorAll('.metric-btn');

    // Remove active class from all buttons
    buttons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    button.classList.add('active');

    const metric = button.getAttribute('data-metric');
    console.log(`Switching ${chartId} to ${metric}`);

    if (metric === 'trend') {
        // Open full-screen trend modal
        openTrendModal(chartId);
        return;
    }

    // If switching to a normal metric, re-render base chart
    chartsInitialized = false; // allow re-rendering the base charts
    renderCharts();
}

/**
 * Sets or clears trend mode for a specific chart.
 * In trend mode, the chart is rendered as a line chart with mandatory current/previous series
 * and optional category series that can be toggled via the trend filter.
 */
function setTrendMode(chartId, enabled) {
    trendModeState[chartId] = trendModeState[chartId] || { enabled: false, selectedCategories: {} };
    trendModeState[chartId].enabled = enabled;

    // Initialize default selected categories when enabling trend mode
    if (enabled && Object.keys(trendModeState[chartId].selectedCategories).length === 0) {
        const data = trendModeData[chartId];
        if (data && data.categories) {
            Object.keys(data.categories).forEach(category => {
                trendModeState[chartId].selectedCategories[category] = true;
            });
        }
    }

    if (enabled) {
        renderTrendModeChart(chartId);
    }
}

function renderTrendModeChart(chartId) {
    const chartData = trendModeData[chartId];
    if (!chartData) {
        console.warn('No trend mode data available for chart:', chartId);
        return;
    }

    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    const labels = chartData.labels || [];
    const selectedCategories = trendModeState[chartId]?.selectedCategories || {};

    // Build datasets: mandatory current/previous, then category lines
    const datasets = [
        {
            label: 'Thực hiện hiện tại',
            data: chartData.mandatory?.current || [],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6
        },
        {
            label: 'Cùng kỳ năm trước',
            data: chartData.mandatory?.previous || [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            borderDash: [5, 5],
            pointRadius: 2,
            pointHoverRadius: 5
        }
    ];

    if (chartData.categories) {
        const palette = ['#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#a855f7', '#14b8a6', '#f97316'];
        let idx = 0;
        for (const [category, series] of Object.entries(chartData.categories)) {
            const enabled = selectedCategories[category];
            if (enabled) {
                datasets.push({
                    label: category,
                    data: series,
                    borderColor: palette[idx % palette.length],
                    backgroundColor: palette[idx % palette.length],
                    borderWidth: 2,
                    fill: false,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5
                });
            }
            idx++;
        }
    }

    // Destroy existing chart instance if it exists
    if (trendChartInstances[chartId]) {
        trendChartInstances[chartId].destroy();
    }

    const ctx = canvas.getContext('2d');
    trendChartInstances[chartId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 8,
                        font: { size: 11, weight: '500' },
                        color: '#64748b',
                        padding: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 0,
                    padding: 10,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return formatNumber(context.raw);
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    offset: -4,
                    font: { size: 11, weight: '600' },
                    color: '#0f172a',
                    formatter: function(value) {
                        return formatNumber(value);
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f1f5f9', borderColor: '#e2e8f0' },
                    ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 4 }
                },
                x: {
                    grid: { display: false, borderColor: '#e2e8f0' },
                    ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 }
                }
            }
        }
    });
}

// Modal + trend chart for the "Xu hướng" button (full-screen view)
const trendModalConfig = {
    'chart-tinh': {
        title: 'Xu hướng - Cắt lớp theo Tỉnh/Thành phố',
        categories: ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'],
        current: {
            'Hà Nội': [1.15, 1.17, 1.16, 1.22, 1.20, 1.21, 1.25, 1.26, 1.24, 1.28, 1.30, 1.32, 1.31, 1.29, 1.30, 1.31, 1.34, 1.36],
            'TP.HCM': [1.25, 1.27, 1.26, 1.30, 1.28, 1.29, 1.33, 1.34, 1.32, 1.36, 1.38, 1.39, 1.38, 1.37, 1.39, 1.40, 1.42, 1.44],
            'Đà Nẵng': [0.35, 0.36, 0.35, 0.38, 0.37, 0.38, 0.39, 0.40, 0.39, 0.41, 0.42, 0.43, 0.43, 0.42, 0.43, 0.44, 0.45, 0.46],
            'Hải Phòng': [0.30, 0.31, 0.30, 0.32, 0.31, 0.32, 0.33, 0.34, 0.33, 0.35, 0.36, 0.37, 0.37, 0.36, 0.37, 0.38, 0.39, 0.40],
            'Cần Thơ': [0.25, 0.26, 0.25, 0.27, 0.26, 0.27, 0.28, 0.29, 0.28, 0.30, 0.31, 0.32, 0.32, 0.31, 0.32, 0.33, 0.34, 0.35],
            'Đồng Nai': [0.28, 0.29, 0.28, 0.30, 0.29, 0.30, 0.31, 0.32, 0.31, 0.33, 0.34, 0.35, 0.35, 0.34, 0.35, 0.36, 0.37, 0.38],
            'Bình Dương': [0.34, 0.35, 0.34, 0.36, 0.35, 0.36, 0.37, 0.38, 0.37, 0.39, 0.40, 0.41, 0.41, 0.40, 0.41, 0.42, 0.43, 0.44]
        },
        previous: {
            'Hà Nội': [1.10, 1.12, 1.11, 1.18, 1.16, 1.17, 1.20, 1.21, 1.19, 1.23, 1.25, 1.26, 1.25, 1.24, 1.25, 1.26, 1.28, 1.30],
            'TP.HCM': [1.20, 1.22, 1.21, 1.25, 1.23, 1.24, 1.28, 1.29, 1.27, 1.31, 1.33, 1.34, 1.33, 1.32, 1.33, 1.34, 1.36, 1.38],
            'Đà Nẵng': [0.33, 0.34, 0.33, 0.36, 0.35, 0.36, 0.37, 0.38, 0.37, 0.39, 0.40, 0.41, 0.41, 0.40, 0.41, 0.42, 0.43, 0.44],
            'Hải Phòng': [0.28, 0.29, 0.28, 0.30, 0.29, 0.30, 0.31, 0.32, 0.31, 0.33, 0.34, 0.35, 0.35, 0.34, 0.35, 0.36, 0.37, 0.38],
            'Cần Thơ': [0.23, 0.24, 0.23, 0.25, 0.24, 0.25, 0.26, 0.27, 0.26, 0.28, 0.29, 0.30, 0.30, 0.29, 0.30, 0.31, 0.32, 0.33],
            'Đồng Nai': [0.26, 0.27, 0.26, 0.28, 0.27, 0.28, 0.29, 0.30, 0.29, 0.31, 0.32, 0.33, 0.33, 0.32, 0.33, 0.34, 0.35, 0.36],
            'Bình Dương': [0.32, 0.33, 0.32, 0.34, 0.33, 0.34, 0.35, 0.36, 0.35, 0.37, 0.38, 0.39, 0.39, 0.38, 0.39, 0.40, 0.41, 0.42]
        }
    },
    'chart-tinh-super-app': {
        title: 'Xu hướng - Super App',
        categories: ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'],
        current: {
            'Hà Nội': [0.25, 0.26, 0.27, 0.28, 0.29, 0.30, 0.31, 0.31, 0.32, 0.33, 0.34, 0.35, 0.35, 0.36, 0.36, 0.37, 0.38, 0.39],
            'TP.HCM': [0.28, 0.29, 0.30, 0.31, 0.32, 0.33, 0.34, 0.34, 0.35, 0.36, 0.37, 0.38, 0.38, 0.39, 0.39, 0.40, 0.41, 0.42],
            'Đà Nẵng': [0.04, 0.04, 0.05, 0.05, 0.06, 0.06, 0.06, 0.07, 0.07, 0.07, 0.08, 0.08, 0.08, 0.09, 0.09, 0.09, 0.10, 0.10],
            'Hải Phòng': [0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.07, 0.07, 0.07, 0.08],
            'Cần Thơ': [0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05],
            'Đồng Nai': [0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.06, 0.07, 0.07],
            'Bình Dương': [0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.07, 0.07, 0.07, 0.07, 0.08, 0.08]
        },
        previous: {
            'Hà Nội': [0.20, 0.21, 0.22, 0.23, 0.24, 0.25, 0.25, 0.26, 0.26, 0.27, 0.28, 0.29, 0.29, 0.30, 0.30, 0.31, 0.31, 0.32],
            'TP.HCM': [0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.28, 0.29, 0.29, 0.30, 0.31, 0.32, 0.32, 0.33, 0.33, 0.34, 0.34, 0.35],
            'Đà Nẵng': [0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.07, 0.07, 0.07, 0.07],
            'Hải Phòng': [0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05],
            'Cần Thơ': [0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05],
            'Đồng Nai': [0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05],
            'Bình Dương': [0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
        }
    }
};

// Dataset used for "Tải dữ liệu" (download) functionality.
// This is a minimal sample. Replace or extend with real backend data as needed.
const downloadDataset = [
    { factor: 'Hà Nội', slice: 'Tỉnh/Thành phố', date: '2024-03-16', tb15c3d: 12.5, luuLuong: 2500, tbMoi: 120, duLieu1: 56.3, duLieu2: 78.4 },
    { factor: 'TP.HCM', slice: 'Tỉnh/Thành phố', date: '2024-03-16', tb15c3d: 14.2, luuLuong: 2800, tbMoi: 140, duLieu1: 63.1, duLieu2: 82.2 },
    { factor: 'Đà Nẵng', slice: 'Tỉnh/Thành phố', date: '2024-03-16', tb15c3d: 4.3, luuLuong: 1200, tbMoi: 42, duLieu1: 29.4, duLieu2: 31.7 },
    { factor: 'Kênh số/App', slice: 'Kênh phát triển', date: '2024-03-16', tb15c3d: 14.5, luuLuong: 3200, tbMoi: 180, duLieu1: 92.8, duLieu2: 104.5 },
    { factor: 'Cửa hàng trực tiếp', slice: 'Kênh phát triển', date: '2024-03-16', tb15c3d: 12.1, luuLuong: 2700, tbMoi: 150, duLieu1: 79.2, duLieu2: 85.1 }
];

let trendModalChartInstance = null;
let trendModalState = {};
let currentTrendModalChartId = null;

function openTrendModal(chartId) {
    const modal = document.getElementById('trend-modal');
    const titleEl = document.getElementById('trend-modal-title');
    const legendList = document.getElementById('trend-modal-legend-list');
    const displayModeSelect = document.getElementById('trend-display-mode');

    const config = trendModalConfig[chartId];
    if (!config) {
        console.warn('No trend modal config found for', chartId);
        return;
    }

    currentTrendModalChartId = chartId;
    titleEl.textContent = config.title || 'Biểu đồ xu hướng';

    // Initialize selection state (all on by default)
    if (!trendModalState[chartId]) {
        trendModalState[chartId] = {
            mode: 'sum',
            selectedCategories: config.categories.reduce((acc, c) => {
                acc[c] = true;
                return acc;
            }, {})
        };
    }

    if (displayModeSelect) {
        displayModeSelect.value = trendModalState[chartId].mode || 'sum';
    }

    // Render legend checkboxes
    legendList.innerHTML = '';
    config.categories.forEach(category => {
        const checked = trendModalState[chartId].selectedCategories[category] ? 'checked' : '';
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" ${checked} onchange="toggleTrendLegend('${chartId}', '${category.replace(/'/g, "\\'")}')">
            ${category}
        `;
        legendList.appendChild(label);
    });

    renderTrendModalChart(chartId);
    modal.classList.remove('hidden');
}

function showTrendFilter(chartId) {
    // legacy button name from Level 2 layout; open the full trend modal
    openTrendModal(chartId);
}

function closeTrendModal() {
    const modal = document.getElementById('trend-modal');
    modal.classList.add('hidden');
    currentTrendModalChartId = null;
}

function openDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (!modal) return;

    const now = new Date();
    const prior = new Date(now);
    prior.setDate(prior.getDate() - 30);

    const fromInput = document.getElementById('download-date-from');
    const toInput = document.getElementById('download-date-to');

    if (fromInput && toInput) {
        fromInput.value = prior.toISOString().slice(0, 10);
        toInput.value = now.toISOString().slice(0, 10);
    }

    modal.classList.remove('hidden');
}

function closeDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (modal) modal.classList.add('hidden');
}

function formatCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function downloadSelectedData() {
    const fromInput = document.getElementById('download-date-from');
    const toInput = document.getElementById('download-date-to');
    const fieldInputs = Array.from(document.querySelectorAll('#download-field-list input[type=checkbox]'));

    const fromDate = fromInput?.value ? new Date(fromInput.value) : null;
    const toDate = toInput?.value ? new Date(toInput.value) : null;

    const selectedFields = fieldInputs.filter(i => i.checked).map(i => i.value);
    if (!selectedFields.length) {
        alert('Vui lòng chọn ít nhất một trường để tải.');
        return;
    }

    const filtered = downloadDataset.filter(row => {
        if (!fromDate && !toDate) return true;
        const rowDate = new Date(row.date);
        if (fromDate && rowDate < fromDate) return false;
        if (toDate && rowDate > toDate) return false;
        return true;
    });

    const header = selectedFields.map(f => {
        switch (f) {
            case 'factor': return 'Nhân tố';
            case 'slice': return 'Loại cắt lớp';
            case 'date': return 'Ngày';
            case 'tb15c3d': return 'TB 15c3d lũy kế';
            case 'luuLuong': return 'Lưu lượng';
            case 'tbMoi': return 'TB mới';
            case 'duLieu1': return 'Dữ liệu 1';
            case 'duLieu2': return 'Dữ liệu 2';
            default: return f;
        }
    });

    const rows = filtered.map(row => selectedFields.map(field => formatCsvValue(row[field])).join(','));
    const csv = [header.join(','), ...rows].join('\n');

    const filename = `telecom-data-${new Date().toISOString().slice(0,10)}.csv`;
    // Prepend UTF-8 BOM to ensure Excel interprets the file as UTF-8 (fixes Unicode garbling)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeDownloadModal();
}

function updateTrendDisplayMode() {
    if (!currentTrendModalChartId) return;
    const select = document.getElementById('trend-display-mode');
    if (!select) return;

    const mode = select.value;
    if (!trendModalState[currentTrendModalChartId]) return;
    trendModalState[currentTrendModalChartId].mode = mode;
    renderTrendModalChart(currentTrendModalChartId);
}

function selectAllTrendLegends(checked) {
    if (!currentTrendModalChartId) return;

    const config = trendModalConfig[currentTrendModalChartId];
    if (!config) return;

    config.categories.forEach(category => {
        trendModalState[currentTrendModalChartId].selectedCategories[category] = checked;
    });
    openTrendModal(currentTrendModalChartId); // re-render checkboxes + chart
}

function toggleTrendLegend(chartId, category) {
    if (!trendModalState[chartId]) return;
    trendModalState[chartId].selectedCategories[category] = !trendModalState[chartId].selectedCategories[category];
    renderTrendModalChart(chartId);
}

function renderTrendModalChart(chartId) {
    const modalChartCanvas = document.getElementById('trend-modal-canvas');
    const config = trendModalConfig[chartId];
    if (!config || !modalChartCanvas) return;

    const labels = generateMonthLabels();
    const selectedCategories = trendModalState[chartId].selectedCategories;
    const displayMode = trendModalState[chartId]?.mode || 'sum';

    const sumSeries = (dataMap) => {
        const totals = Array(labels.length).fill(0);
        Object.entries(dataMap).forEach(([cat, series]) => {
            if (!selectedCategories[cat]) return;
            series.forEach((v, idx) => {
                totals[idx] += v;
            });
        });
        return totals;
    };

    // Prepare datasets based on display mode
    const datasets = [];

    if (displayMode === 'byCategory') {
        const palette = [
            '#2563eb', '#f97316', '#10b981', '#818cf8', '#eab308', '#ec4899', '#22c55e', '#8b5cf6'
        ];

        Object.entries(config.current).forEach(([category, series], idx) => {
            if (!selectedCategories[category]) return;

            const color = palette[idx % palette.length];
            datasets.push({
                label: category,
                data: series,
                borderColor: color,
                backgroundColor: `${color}40`,
                borderWidth: 2.5,
                fill: false,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6
            });
        });

        if (!datasets.length) {
            // If nothing selected, render an empty dataset to keep chart responsive
            datasets.push({
                label: 'Không có dữ liệu',
                data: [],
                borderColor: '#cbd5e1',
                borderWidth: 2,
                fill: false,
                tension: 0.3
            });
        }
    } else {
        // Default: sum across selected categories (current vs same period last year)
        const currentSeries = sumSeries(config.current);
        const previousSeries = sumSeries(config.previous);

        datasets.push({
            label: 'Thực hiện hiện tại',
            data: currentSeries,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6
        });
        datasets.push({
            label: 'Cùng kỳ năm trước',
            data: previousSeries,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            borderDash: [5, 5],
            pointRadius: 2,
            pointHoverRadius: 5
        });
    }

    // Destroy existing chart instance if exists
    if (trendModalChartInstance) {
        trendModalChartInstance.destroy();
    }

    trendModalChartInstance = new Chart(modalChartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 8,
                        font: { size: 11, weight: '500' },
                        color: '#64748b',
                        padding: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 0,
                    padding: 10,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return formatNumber(context.raw);
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    offset: -4,
                    font: { size: 11, weight: '600' },
                    color: '#0f172a',
                    formatter: function(value) {
                        return formatNumber(value);
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f1f5f9', borderColor: '#e2e8f0' },
                    ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 6 }
                },
                x: {
                    grid: { display: false, borderColor: '#e2e8f0' },
                    ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 }
                }
            }
        }
    });
}

// Chart.js Configuration & Rendering Logic (Light Mode)
let chartsInitialized = false;

// Trend data for 18 months for each card
// Current period (thực hiện hiện tại)
const trendDatasets = {
    'card1': [38, 40, 39, 41, 43, 44, 45, 46, 45, 47, 48, 50, 51, 52, 50, 51, 45.2],
    'card2': [11.2, 11.4, 11.5, 11.6, 11.8, 12.0, 12.1, 12.2, 12.2, 12.3, 12.4, 12.5, 12.5, 12.4, 12.5, 12.5, 12.5],
    'card3': [280, 300, 310, 320, 330, 335, 340, 343, 344, 345, 346, 345, 345, 344, 344, 345, 345],
    'card4': [110, 112, 114, 115, 116, 118, 120, 122, 123, 124, 125, 125, 124, 124, 123, 123, 124],
    'card5': [6.5, 6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.4, 8.4, 8.4, 8.4, 8.4],
    'card6': [5550, 5560, 5570, 5590, 5600, 5610, 5620, 5625, 5630, 5630, 5630, 5630, 5630, 5630, 5630, 5630, 5630],
    'card7': [2.1, 2.4, 2.7, 3.0, 3.3, 3.6, 3.8, 4.0, 4.1, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2, 4.2],
    'card8': [91.5, 91.8, 92.0, 92.2, 92.5, 92.8, 93.0, 93.3, 93.5, 93.8, 93.9, 94.0, 94.1, 94.2, 94.2, 94.2, 94.2]
};

// Same period last year (cùng kỳ năm trước) for comparison
const trendDatasetsPreviousYear = {
    'card1': [35, 37, 36, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49, 51, 50, 49, 43],
    'card2': [10.5, 10.8, 11.0, 11.1, 11.3, 11.5, 11.6, 11.8, 11.9, 12.0, 12.1, 12.2, 12.2, 12.1, 12.3, 12.4, 12.1],
    'card3': [250, 270, 290, 310, 320, 325, 330, 338, 340, 340, 335, 338, 340, 340, 340, 343, 320],
    'card4': [105, 108, 110, 112, 113, 115, 117, 119, 120, 121, 122, 123, 122, 121, 120, 121, 122],
    'card5': [5.0, 5.3, 5.5, 5.8, 6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.2, 7.5, 7.8, 8.0, 8.1, 8.2, 8.3],
    'card6': [5480, 5500, 5520, 5540, 5560, 5580, 5600, 5615, 5620, 5625, 5630, 5630, 5630, 5630, 5630, 5630, 5630],
    'card7': [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9, 4.0, 3.5],
    'card8': [90.5, 90.8, 91.0, 91.3, 91.5, 91.8, 92.0, 92.3, 92.5, 92.8, 92.9, 93.0, 93.1, 93.2, 93.2, 93.3, 93.0]
};

// Trend mode data for Level 2 charts (used when 'Xu hướng' is active)
const trendModeData = {
    'chart-tinh': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [12.0, 12.2, 12.1, 12.5, 12.3, 12.4],
            previous: [11.5, 11.7, 11.9, 12.0, 12.1, 12.2]
        },
        categories: {
            'Hà Nội': [1.15, 1.17, 1.16, 1.22, 1.20, 1.21],
            'TP.HCM': [1.25, 1.27, 1.26, 1.30, 1.28, 1.29],
            'Đà Nẵng': [0.35, 0.36, 0.35, 0.38, 0.37, 0.38],
            'Hải Phòng': [0.30, 0.31, 0.30, 0.32, 0.31, 0.32],
            'Cần Thơ': [0.25, 0.26, 0.25, 0.27, 0.26, 0.27],
            'Đồng Nai': [0.28, 0.29, 0.28, 0.30, 0.29, 0.30],
            'Bình Dương': [0.34, 0.35, 0.34, 0.36, 0.35, 0.36]
        }
    },
    'chart-tinh-super-app': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [1.7, 1.8, 1.9, 2.0, 2.1, 2.2],
            previous: [1.3, 1.4, 1.5, 1.6, 1.7, 1.8]
        },
        categories: {
            'Hà Nội': [0.25, 0.26, 0.27, 0.28, 0.29, 0.30],
            'TP.HCM': [0.28, 0.29, 0.30, 0.31, 0.32, 0.33],
            'Đà Nẵng': [0.04, 0.04, 0.05, 0.05, 0.06, 0.06],
            'Hải Phòng': [0.03, 0.03, 0.03, 0.04, 0.04, 0.04],
            'Cần Thơ': [0.02, 0.02, 0.02, 0.03, 0.03, 0.03],
            'Đồng Nai': [0.03, 0.03, 0.03, 0.04, 0.04, 0.04],
            'Bình Dương': [0.04, 0.04, 0.04, 0.05, 0.05, 0.05]
        }
    }
};

// Holds the current trend mode state & selected category filters per chart
const trendModeState = {};

// Store chart instances for cleanup
const trendChartInstances = {};

// Generate month labels for 18 months
function generateMonthLabels(endDate = new Date(2026, 2)) {
    const labels = [];
    for (let i = 17; i >= 0; i--) {
        const d = new Date(endDate);
        d.setMonth(d.getMonth() - i);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        labels.push(`${month}/${year}`);
    }
    return labels;
}

// Render trend charts for all cards
function renderTrendCharts() {
    // Always render trend charts when called, destroying existing ones if needed
    
    try {
        // Wait for Chart to be available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded yet, retrying...');
            setTimeout(renderTrendCharts, 500);
            return;
        }
        
        const monthLabels = generateMonthLabels();
        console.log('Rendering trend charts with labels:', monthLabels);
        
        Object.keys(trendDatasets).forEach((cardKey) => {
            const canvasId = 'trend-' + cardKey;
            const canvas = document.getElementById(canvasId);
            
            if (canvas) {
                try {
                    console.log('Creating chart for:', canvasId);
                    const ctx = canvas.getContext('2d');
                    
                    // Destroy existing chart if it exists
                    if (trendChartInstances[canvasId]) {
                        trendChartInstances[canvasId].destroy();
                    }
                    
                    trendChartInstances[canvasId] = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: monthLabels,
                            datasets: [
                                {
                                    label: 'Thực hiện hiện tại',
                                    data: trendDatasets[cardKey],
                                    borderColor: '#2563eb',
                                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                                    borderWidth: 2.5,
                                    fill: false,
                                    tension: 0.3,
                                    pointRadius: 3,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: '#2563eb',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 1
                                },
                                {
                                    label: 'Cùng kỳ năm trước',
                                    data: trendDatasetsPreviousYear[cardKey],
                                    borderColor: '#f59e0b',
                                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                                    borderWidth: 2,
                                    fill: false,
                                    tension: 0.3,
                                    borderDash: [5, 5],
                                    pointRadius: 2,
                                    pointHoverRadius: 5,
                                    pointBackgroundColor: '#f59e0b',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 1
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    labels: {
                                        boxWidth: 8,
                                        font: { size: 11, weight: '500' },
                                        color: '#64748b',
                                        padding: 10,
                                        usePointStyle: true
                                    }
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    titleColor: '#f8fafc',
                                    bodyColor: '#e2e8f0',
                                    borderColor: 'rgba(0,0,0,0)',
                                    borderWidth: 0,
                                    padding: 10,
                                    cornerRadius: 6,
                                    displayColors: true,
                                    callbacks: {
                                        afterLabel: function(context) {
                                            if (context.datasetIndex === 0 && context.dataIndex > 0) {
                                                const currentValue = context.parsed.y;
                                                const previousValue = trendDatasetsPreviousYear[cardKey][context.dataIndex];
                                                const change = currentValue - previousValue;
                                                const pctChange = ((change / previousValue) * 100).toFixed(1);
                                                return `YoY: ${change > 0 ? '+' : ''}${change.toFixed(1)} (${pctChange > 0 ? '+' : ''}${pctChange}%)`;
                                            }
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    grid: {
                                        color: '#f1f5f9',
                                        borderColor: '#e2e8f0'
                                    },
                                    ticks: {
                                        color: '#64748b',
                                        font: { size: 11 },
                                        maxTicksLimit: 4
                                    }
                                },
                                x: {
                                    grid: {
                                        display: false,
                                        borderColor: '#e2e8f0'
                                    },
                                    ticks: {
                                        color: '#64748b',
                                        font: { size: 10 },
                                        maxRotation: 45,
                                        minRotation: 0
                                    }
                                }
                            }
                        }
                    });
                    
                    console.log('Chart created successfully for:', canvasId);
                } catch (e) {
                    console.error('Error rendering trend chart for ' + canvasId, e);
                }
            } else {
                console.warn('Canvas element not found:', canvasId);
            }
        });
        
        console.log('Trend charts rendering complete');
    } catch (e) {
        console.error('Error in renderTrendCharts:', e);
    }
}

function renderCharts() {
    if (chartsInitialized) return; 
    
    // Register the datalabels plugin
    Chart.register(ChartDataLabels);
    
    // Global Chart.js defaults for LIGHT theme
    Chart.defaults.color = '#64748b'; // text-muted
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 13;
    
    // Helper to create a horizontal bar chart safely
    const createHorizontalBarChart = (canvasId, labels, data, accentColor, unitLabel) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Destroy existing chart instance if it exists (prevents duplicates)
        if (trendChartInstances[canvasId]) {
            trendChartInstances[canvasId].destroy();
            delete trendChartInstances[canvasId];
        }

        const tooltipLabel = unitLabel ? `${unitLabel}: ` : '';
        trendChartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: unitLabel || 'Giá trị',
                    data,
                    backgroundColor: accentColor,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(0,0,0,0)',
                        borderWidth: 0,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return `${tooltipLabel}${context.raw}` + (unitLabel ? ` ${unitLabel}` : '');
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'end',
                        font: { weight: 'bold', size: 12 },
                        color: '#1a1a1a',
                        padding: { right: 8 },
                        formatter: function(value, context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${value} ${unitLabel || ''} (${percentage}%)`;
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#e2e8f0', drawBorder: false, tickLength: 0 },
                        title: { display: true, text: unitLabel ? `Giá trị (${unitLabel})` : 'Giá trị', color: '#64748b', font: { weight: '500' } },
                        ticks: { padding: 8 }
                    },
                    y: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { weight: '500' }, color: '#334155' }
                    }
                }
            }
        });
    };

    // 1. Chart: Theo Tỉnh/Thành phố (Tiêu dùng thực)
    createHorizontalBarChart('chart-tinh', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [12.5, 14.2, 4.3, 3.8, 3.1, 3.3, 4.0], '#3b82f6', 'Tỉ');

    // 2. Chart: Theo Gói cước (Tiêu dùng thực)
    createHorizontalBarChart('chart-goicuoc', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], [15.2, 8.4, 6.1, 5.3, 4.2, 6.0], '#8b5cf6', 'Tỉ');

    // 3. Chart: Theo Khu vực (Tiêu dùng thực)
    createHorizontalBarChart('chart-khuvuc', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [16.8, 18.5, 6.4, 3.5], '#10b981', 'Tỉ');

    // 4. Chart: Theo Tuổi thọ TB (Tiêu dùng thực)
    createHorizontalBarChart('chart-tuoitho', ['< 3 tháng', '3 - 6 tháng', '6 - 12 tháng', '1 - 3 năm', '> 3 năm'], [4.2, 5.6, 8.4, 15.3, 11.7], '#f43f5e', 'Tỉ');

    // 5. Chart: Theo Kênh phát triển (Tiêu dùng thực)
    createHorizontalBarChart('chart-kenh', ['Kênh số / App MyViettel', 'Cửa hàng trực tiếp', 'Đại lý ủy quyền', 'CTV / Bán hàng lưu động', 'Telemarketing', 'Kênh Doanh nghiệp'], [14.5, 12.1, 8.4, 4.3, 2.5, 3.4], '#f59e0b', 'Tỉ');

    // Subscriber (Thuê bao) charts
    createHorizontalBarChart('chart-tinh-thue-bao', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [1.2, 1.4, 0.5, 0.4, 0.3, 0.35, 0.45], '#3b82f6', 'M');
    createHorizontalBarChart('chart-goicuoc-thue-bao', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], [1.5, 0.8, 0.6, 0.5, 0.4, 0.6], '#8b5cf6', 'M');
    createHorizontalBarChart('chart-khuvuc-thue-bao', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [1.7, 1.9, 0.7, 0.3], '#10b981', 'M');
    createHorizontalBarChart('chart-tuoitho-thue-bao', ['< 3 tháng', '3 - 6 tháng', '6 - 12 tháng', '1 - 3 năm', '> 3 năm'], [0.4, 0.6, 0.9, 1.5, 1.3], '#f43f5e', 'M');
    createHorizontalBarChart('chart-kenh-thue-bao', ['Kênh số / App MyViettel', 'Cửa hàng trực tiếp', 'Đại lý ủy quyền', 'CTV / Bán hàng lưu động', 'Telemarketing', 'Kênh Doanh nghiệp'], [1.45, 1.21, 0.84, 0.43, 0.25, 0.34], '#f59e0b', 'M');

    // Super App charts
    createHorizontalBarChart('chart-tinh-super-app', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [1.8, 2.1, 0.3, 0.2, 0.2, 0.25, 0.35], '#3b82f6', 'M');
    createHorizontalBarChart('chart-goicuoc-super-app', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], [2.2, 1.2, 0.8, 0.6, 0.5, 0.7], '#8b5cf6', 'M');
    createHorizontalBarChart('chart-khuvuc-super-app', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [2.5, 2.8, 0.5, 0.2], '#10b981', 'M');
    createHorizontalBarChart('chart-tuoitho-super-app', ['< 3 tháng', '3 - 6 tháng', '6 - 12 tháng', '1 - 3 năm', '> 3 năm'], [0.6, 0.8, 1.2, 2.0, 1.8], '#f43f5e', 'M');
    createHorizontalBarChart('chart-kenh-super-app', ['Kênh số / App MyViettel', 'Cửa hàng trực tiếp', 'Đại lý ủy quyền', 'CTV / Bán hàng lưu động', 'Telemarketing', 'Kênh Doanh nghiệp'], [2.1, 1.8, 1.2, 0.6, 0.3, 0.5], '#f59e0b', 'M');

    // Data Traffic charts (GB)
    createHorizontalBarChart('chart-tinh-luu-luong', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [2500, 2800, 950, 820, 670, 740, 890], '#3b82f6', 'GB');
    createHorizontalBarChart('chart-goicuoc-luu-luong', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], [2800, 1600, 1200, 900, 720, 1100], '#8b5cf6', 'GB');
    createHorizontalBarChart('chart-khuvuc-luu-luong', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [3100, 3300, 1200, 620], '#10b981', 'GB');
    createHorizontalBarChart('chart-tuoitho-luu-luong', ['< 3 tháng', '3 - 6 tháng', '6 - 12 tháng', '1 - 3 năm', '> 3 năm'], [780, 940, 1200, 1900, 1600], '#f43f5e', 'GB');
    createHorizontalBarChart('chart-kenh-luu-luong', ['Kênh số / App MyViettel', 'Cửa hàng trực tiếp', 'Đại lý ủy quyền', 'CTV / Bán hàng lưu động', 'Telemarketing', 'Kênh Doanh nghiệp'], [2900, 2500, 1800, 950, 520, 670], '#f59e0b', 'GB');

    // Customer Experience charts (percentage)
    const createPercentBarChart = (canvasId, labels, data, accentColor) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Phần trăm', data, backgroundColor: accentColor, borderRadius: 6, barPercentage: 0.6 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                animation: { duration: 1000, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(0,0,0,0)',
                        borderWidth: 0,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) { return `Giá trị: ${context.raw}%`; }
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'end',
                        font: { weight: 'bold', size: 12 },
                        color: '#1a1a1a',
                        padding: { right: 8 },
                        formatter: function(value) { return `${value}%`; }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#e2e8f0', drawBorder: false, tickLength: 0 },
                        title: { display: true, text: '%', color: '#64748b', font: { weight: '500' } },
                        ticks: { padding: 8 }
                    },
                    y: { grid: { display: false, drawBorder: false }, ticks: { font: { weight: '500' }, color: '#334155' } }
                }
            }
        });
    };

    createPercentBarChart('chart-nps', ['NPS trung bình', 'NPS trung bình', 'NPS trung bình'], [45.2, 46.1, 44.8], '#3b82f6');
    createPercentBarChart('chart-resolution', ['Xử lý đúng hạn', 'Xử lý đúng hạn', 'Xử lý đúng hạn'], [92.3, 91.8, 93.1], '#10b981');
    createPercentBarChart('chart-setup', ['Thiết lập thành công', 'Thiết lập thành công', 'Thiết lập thành công'], [97.8, 98.1, 97.2], '#f59e0b');
    createPercentBarChart('chart-feedback', ['Phản ánh tiêu cực', 'Phản ánh tiêu cực', 'Phản ánh tiêu cực'], [12.5, 11.8, 13.1], '#f43f5e');

    chartsInitialized = true;
}