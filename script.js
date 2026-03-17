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
    }, 300);
}

// Chart.js Configuration & Rendering Logic (Light Mode)
let chartsInitialized = false;
let trendChartsInitialized = false;

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
    if (trendChartsInitialized) return;
    
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
        
        trendChartsInitialized = true;
        console.log('Trend charts initialization complete');
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

        const tooltipLabel = unitLabel ? `${unitLabel}: ` : '';
        new Chart(canvas.getContext('2d'), {
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