// Navigation logic between Level 1 and Level 2
document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const dashboardContainer = document.querySelector('.dashboard-container');

    if (sidebarToggle && dashboardContainer) {
        sidebarToggle.addEventListener('click', () => {
            dashboardContainer.classList.toggle('collapsed');

            // Trigger a resize event to make sure charts redraw if needed
            window.dispatchEvent(new Event('resize'));
        });
    }

    // Initialize global multi-selects
    initCustomSelects();

    // Initialize global date filters (last 30 days)
    const dateFrom = document.getElementById('global-date-from');
    const dateTo = document.getElementById('global-date-to');
    if (dateFrom && dateTo) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateTo.value = now.toISOString().split('T')[0];
        dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    // Initial data load for VTC (default)
    handleMarketChange('VTC');
});

// Global state for Cross-filtering
let activeFilterLabel = null;

function handleChartLabelClick(label) {
    if (activeFilterLabel === label) {
        activeFilterLabel = null;
        showToast("Đã xóa bộ lọc");
    } else {
        activeFilterLabel = label;
        showToast(`Đã lọc dữ liệu theo: ${label}`);
    }
    chartsInitialized = false;
    renderCharts();
}

// Market Dependencies Data
const marketDataDependencies = {
    'MYN': {
        provinces: ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'],
        regions: ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'],
        packages: ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'ST120', 'ST150'],
        channels: ['Kênh số / App', 'Cửa hàng trực tiếp', 'Đại lý ủy quyền', 'CTV / Bán hàng lưu động', 'Telemarketing']
    },
    'VTC': {
        provinces: ['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville'],
        regions: ['East', 'West', 'Sihanouk', 'Capital'],
        packages: ['C5', 'C10', 'C20', 'UNLI1', 'UNLI2'],
        channels: ['Direct Sales', 'Retail', 'Super App', 'B2B']
    },
    'STL': {
        provinces: ['Luang Prabang', 'Vientiane', 'Savannakhet', 'Champasak'],
        regions: ['North', 'Central', 'South'],
        packages: ['LAO5', 'LAO10', 'LAO-UNLI'],
        channels: ['Shop', 'Agent', 'D2D']
    }
    // ... add more for other markets if needed
};

const tenureCategories = [
    { value: '0-3', label: '< 3 tháng' },
    { value: '3-6', label: '3-6 tháng' },
    { value: '6-12', label: '6-12 tháng' },
    { value: '12-36', label: '1-3 năm' },
    { value: 'over36', label: '> 3 năm' }
];

const arpuCategories = [
    { value: '0-1', label: '$0 - $1' },
    { value: '1-2', label: '$1 - $2' },
    { value: '2-3', label: '$2 - $3' },
    { value: '3-5', label: '$3 - $5' },
    { value: '5plus', label: '$5+' }
];

const provinceStationData = {
    'Hà Nội': ['HN001', 'HN002', 'HN003', 'HN125', 'HN045'],
    'TP.HCM': ['HCM001', 'HCM002', 'HCM512', 'HCM012'],
    'Đà Nẵng': ['DN001', 'DN002', 'DN088'],
    'Phnom Penh': ['PP001', 'PP002', 'PP003'],
    'Vientiane': ['VT001', 'VT002']
};

function initCustomSelects() {
    const selects = document.querySelectorAll('.custom-select');

    selects.forEach(select => {
        const header = select.querySelector('.select-header');
        const allCheckbox = select.querySelector('.all-opt input');
        const optionsList = select.querySelector('.options-list');
        const searchInput = select.querySelector('.select-search input');

        // Toggle dropdown visibility
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            selects.forEach(s => { if (s !== select) s.classList.remove('active'); });
            select.classList.toggle('active');
            
            // Focus search input when opening
            if (select.classList.contains('active') && searchInput) {
                searchInput.value = '';
                const labels = optionsList.querySelectorAll('label');
                labels.forEach(l => l.style.display = 'flex');
                setTimeout(() => searchInput.focus(), 100);
            }
        });

        // Search logic
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const labels = optionsList.querySelectorAll('label');
                labels.forEach(label => {
                    const text = label.textContent.toLowerCase();
                    label.style.display = text.includes(query) ? 'flex' : 'none';
                });
            });

            // Prevent closing when clicking search input
            searchInput.addEventListener('click', (e) => e.stopPropagation());
        }

        // "All" checkbox logic
        if (allCheckbox) {
            allCheckbox.addEventListener('change', () => {
                const checkboxes = optionsList.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = allCheckbox.checked);
                updateSelectHeader(select);
            });
        }

        // Keep dropdown open while selecting items (clicking inside should not close)
        optionsList.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Individual change logic (event delegation)
        optionsList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' || e.target.type === 'radio') {
                const checkboxes = optionsList.querySelectorAll('input[type="checkbox"]');
                const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

                if (allCheckbox) {
                    allCheckbox.checked = checkedCount === checkboxes.length;
                }
                
                // If it's the market radio, trigger market change
                if (e.target.name === 'market' && e.target.type === 'radio') {
                    handleMarketChange(e.target.value);
                    select.classList.remove('active'); // Close on select for market
                }

                updateSelectHeader(select);
            }
        });
        
        // Initial header sync
        updateSelectHeader(select);
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        selects.forEach(s => s.classList.remove('active'));
    });
}

function updateSelectHeader(select) {
    const headerSpan = select.querySelector('.select-header span');
    
    // Check for radio buttons first (Market)
    const radioChecked = select.querySelector('.options-list input[type="radio"]:checked');
    if (radioChecked) {
        headerSpan.textContent = radioChecked.parentElement.textContent.trim();
        return;
    }

    const checkboxes = select.querySelectorAll('.options-list input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);

    if (checked.length === 0) {
        headerSpan.textContent = "Chưa chọn";
    } else if (checked.length === checkboxes.length && checkboxes.length > 0) {
        headerSpan.textContent = "Tất cả (" + checked.length + ")";
    } else if (checked.length === 1) {
        headerSpan.textContent = checked[0].parentElement.textContent.trim();
    } else {
        headerSpan.textContent = "Đã chọn " + checked.length;
    }
}

function handleMarketChange(market) {
    console.log('Market changed to:', market);
    filterState.market = market;
    const data = marketDataDependencies[market] || marketDataDependencies['MYN'];

    // Update Province
    updateOptions('select-tinh', data.provinces);
    // Update Region
    updateOptions('select-khuvuc', data.regions);
    // Update Package
    updateOptions('select-goicuoc', data.packages);
    // Update Channels
    updateOptions('select-kenh', data.channels);

    // Keep Tenure + ARPU in sync too like Province
    updateOptions('select-tuoitho', tenureCategories);
    updateOptions('select-arpu', arpuCategories);

    // When market changes, always reset and update stations
    updateStationOptions();

    // Do not auto-render charts for all other filters; only market changes is immediate
    chartsInitialized = false;
    renderCharts();
    renderHierarchyTable();
}

const filterState = {
    market: 'VTC',
    provinces: [],
    regions: [],
    packages: [],
    channels: [],
    stations: [],
    tenure: [],
    arpu: [],
    dateFrom: '',
    dateTo: ''
};

function getSelectCheckedValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.querySelectorAll('.options-list input[type="checkbox"]:checked')).map(cb => cb.value);
}

function applyFilters() {
    filterState.provinces = getSelectCheckedValues('select-tinh');
    filterState.regions = getSelectCheckedValues('select-khuvuc');
    filterState.packages = getSelectCheckedValues('select-goicuoc');
    filterState.channels = getSelectCheckedValues('select-kenh');
    filterState.stations = getSelectCheckedValues('select-tram');
    filterState.tenure = getSelectCheckedValues('select-tuoitho');
    filterState.arpu = getSelectCheckedValues('select-arpu');
    filterState.dateFrom = document.getElementById('global-date-from')?.value || '';
    filterState.dateTo = document.getElementById('global-date-to')?.value || '';

    // Update internal station options that depend on selected provinces
    updateStationOptions();

    chartsInitialized = false;
    renderCharts();

    showToast('Bộ lọc đã được áp dụng');
}

function updateOptions(selectId, items) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const list = select.querySelector('.options-list');
    const allCheckbox = select.querySelector('.all-opt input');
    const searchInput = select.querySelector('.select-search input');

    // Clear search when updating options
    if (searchInput) {
        searchInput.value = '';
    }

    list.innerHTML = '';

    // Prepend "Toàn mạng" and "Tổng" options as requested
    const specialOptions = [
        { value: 'TOTAL_NETWORK', label: 'Toàn mạng' },
        { value: 'GRAND_TOTAL', label: 'Tổng' }
    ];

    [...specialOptions, ...items].forEach(item => {
        const value = (typeof item === 'object' && item.value) ? item.value : item;
        const labelText = (typeof item === 'object' && item.label) ? item.label : item;

        const label = document.createElement('label');
        // If it's a special option, maybe style it differently
        if (value === 'TOTAL_NETWORK' || value === 'GRAND_TOTAL') {
            label.style.fontWeight = '700';
            label.style.color = 'var(--primary)';
            label.innerHTML = `<input type="checkbox" value="${value}"> ${labelText}`;
        } else {
            label.innerHTML = `<input type="checkbox" value="${value}" checked> ${labelText}`;
        }
        list.appendChild(label);
    });

    if (allCheckbox) allCheckbox.checked = true;
    updateSelectHeader(select);
}

function updateStationOptions() {
    const provinceSelect = document.getElementById('select-tinh');
    const checkedProvinces = Array.from(provinceSelect.querySelectorAll('.options-list input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    let stations = [];
    checkedProvinces.forEach(p => {
        if (provinceStationData[p]) {
            stations = [...stations, ...provinceStationData[p]];
        }
    });

    // Remove duplicates
    stations = Array.from(new Set(stations));

    // If none found (common in mock), add some dummy ones based on provinces
    if (stations.length === 0 && checkedProvinces.length > 0) {
        checkedProvinces.forEach(p => {
            for (let i = 1; i <= 3; i++) stations.push(p.substring(0, 3).toUpperCase() + "00" + i);
        });
    }

    updateOptions('select-tram', stations);
}

function openLevel2(cardId, subType) {
    const allLevel2 = document.querySelectorAll('.level2-section');
    allLevel2.forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });

    const selectedLevel2 = document.getElementById('level2-' + cardId);
    if (selectedLevel2) {
        if (cardId === 'thue-bao') {
            const ms = document.getElementById('metric-selector-thue-bao');
            const title = document.getElementById('level2-thue-bao-title');
            if (subType === 'churn') { if(ms) ms.style.display='none'; if(title) title.textContent='Phân tích TB rời mạng'; }
            else { if(ms) ms.style.display='block'; if(title) title.textContent='Phân tích Thuê bao'; }
        }
        const l1 = document.getElementById('level1-view');
        l1.style.opacity = '0';
        setTimeout(() => {
            l1.classList.remove('active'); l1.classList.add('hidden');
            selectedLevel2.classList.remove('hidden'); selectedLevel2.classList.add('active');
            selectedLevel2.style.opacity = '1';
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
let currentMetricsState = {}; // Persist metric selection

function switchChartMetric(button, chartId) {
    const container = button.parentElement;
    const buttons = container.querySelectorAll('.metric-btn');

    // Remove active class from all buttons
    buttons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    button.classList.add('active');

    const metric = button.getAttribute('data-metric');
    currentMetricsState[chartId] = metric; // Save state

    console.log(`Switching ${chartId} to ${metric}`);

    if (metric === 'trend') {
        // Open full-screen trend modal
        openTrendModal(chartId);
        return;
    }

    // If switching to a normal metric, re-render charts
    chartsInitialized = false;
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
                        label: function (context) {
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
                    formatter: function (value) {
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
        },
        previous2: {
            'Hà Nội': [1.00, 1.02, 1.05, 1.08, 1.10, 1.11, 1.13, 1.14, 1.12, 1.15, 1.17, 1.19, 1.18, 1.15, 1.16, 1.17, 1.20, 1.22],
            'TP.HCM': [1.10, 1.12, 1.15, 1.18, 1.20, 1.21, 1.23, 1.24, 1.22, 1.25, 1.27, 1.29, 1.28, 1.25, 1.26, 1.27, 1.30, 1.32],
            'Đà Nẵng': [0.28, 0.29, 0.31, 0.33, 0.34, 0.35, 0.36, 0.37, 0.35, 0.37, 0.38, 0.39, 0.39, 0.38, 0.39, 0.40, 0.41, 0.42],
            'Hải Phòng': [0.24, 0.25, 0.27, 0.28, 0.29, 0.30, 0.31, 0.32, 0.30, 0.32, 0.33, 0.34, 0.34, 0.33, 0.34, 0.35, 0.36, 0.37],
            'Cần Thơ': [0.18, 0.19, 0.21, 0.23, 0.24, 0.25, 0.26, 0.27, 0.25, 0.27, 0.28, 0.29, 0.29, 0.28, 0.29, 0.30, 0.31, 0.32],
            'Đồng Nai': [0.22, 0.23, 0.25, 0.27, 0.28, 0.29, 0.30, 0.31, 0.29, 0.31, 0.32, 0.33, 0.33, 0.32, 0.33, 0.34, 0.35, 0.36],
            'Bình Dương': [0.28, 0.29, 0.31, 0.33, 0.34, 0.35, 0.36, 0.37, 0.35, 0.37, 0.38, 0.39, 0.39, 0.38, 0.39, 0.40, 0.41, 0.42]
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
        },
        previous2: {
            'Hà Nội': [0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.20, 0.21, 0.21, 0.22, 0.23, 0.24, 0.24, 0.25, 0.25, 0.26, 0.26, 0.27],
            'TP.HCM': [0.18, 0.19, 0.20, 0.21, 0.22, 0.23, 0.23, 0.24, 0.24, 0.25, 0.26, 0.27, 0.27, 0.28, 0.28, 0.29, 0.29, 0.30],
            'Đà Nẵng': [0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06],
            'Hải Phòng': [0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04],
            'Cần Thơ': [0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04],
            'Đồng Nai': [0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04],
            'Bình Dương': [0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04]
        },
        previous2: {
            'Hà Nội': [0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.20, 0.21, 0.21, 0.22, 0.23, 0.24, 0.24, 0.25, 0.25, 0.26, 0.26, 0.27],
            'TP.HCM': [0.18, 0.19, 0.20, 0.21, 0.22, 0.23, 0.23, 0.24, 0.24, 0.25, 0.26, 0.27, 0.27, 0.28, 0.28, 0.29, 0.29, 0.30],
            'Đà Nẵng': [0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06],
            'Hải Phòng': [0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04],
            'Cần Thơ': [0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04],
            'Đồng Nai': [0.01, 0.01, 0.01, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04],
            'Bình Dương': [0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04]
        }
    },
    'chart-feedback-count': {
        title: 'Xu hướng - Số lượng Phản ánh',
        categories: []
    },
    'chart-resolution-time': {
        title: 'Xu hướng - Thời gian Xử lý',
        categories: []
    },
    'chart-feedback-rate': {
        title: 'Xu hướng - Tỷ lệ Phản ánh',
        categories: []
    },
    'chart-nps': {
        title: 'Xu hướng - NPS Score',
        categories: []
    },
    'chart-resolution': {
        title: 'Xu hướng - Tỷ lệ Xử lý Thành công',
        categories: []
    },
    'chart-setup': {
        title: 'Xu hướng - Tỷ lệ Kết nối Thành công',
        categories: []
    },
    'chart-csat': {
        title: 'Xu hướng - CSAT',
        categories: []
    },
    'chart-ces': {
        title: 'Xu hướng - CES',
        categories: []
    },
    'chart-churn-rate': {
        title: 'Xu hướng - Tỷ lệ Rời Mạng',
        categories: []
    },
    'chart-arpu-tieu-dung-thuc': { title: 'Xu hướng - Cắt lớp theo ARPU (Tiêu dùng thực)', categories: [] },
    'chart-arpu-thue-bao': { title: 'Xu hướng - Cắt lớp theo ARPU (Thuê bao)', categories: [] },
    'chart-arpu-tb-phat-trien-moi': { title: 'Xu hướng - Cắt lớp theo ARPU (TB phát triển mới)', categories: [] },
    'chart-arpu-luu-luong': { title: 'Xu hướng - Cắt lớp theo ARPU (Lưu lượng)', categories: [] },
    'chart-arpu-super-app': { title: 'Xu hướng - Cắt lớp theo ARPU (Super App)', categories: [] },
    'chart-cat-lop-thu-nhap-kenh': { title: 'Xu hướng - Cắt lớp theo Thu nhập kênh', categories: [] }
};

// Dataset used for "Tải dữ liệu" (download) functionality.
// This is a minimal sample. Replace or extend with real backend data as needed.
const sliceList = [
  'Cắt lớp theo Tỉnh/TP',
  'Cắt lớp Hướng tiêu dùng (thoại, sms…)',
  'Cắt lớp Tuổi thọ TB',
  'Cắt lớp ARPU',
  'Cắt lớp Gói cước',
  'Cắt lớp theo Khu vực',
  'Cắt lớp theo Kênh phát triển',
  'Cắt lớp theo vị trí trạm',
  'Cắt lớp theo Trạng thái kênh',
  'Cắt lớp theo Kênh',
  'Cắt lớp theo mã kênh',
  'Cắt lớp theo thu nhập kênh',
  'Cắt lớp theo hạng khách hàng'
];

const baseDate = '2024-03-16';

const downloadDataset = sliceList.map((slice, index) => ({
  factor: `Demo ${index + 1}`,
  slice,
  date: baseDate,
  tb15c3d: 10 + index,
  luuLuong: 2000 + index * 100,
  tbMoi: 100 + index * 10,
  duLieu1: 50 + index * 5,
  duLieu2: 60 + index * 5
}));


let trendModalChartInstance = null;
let trendModalState = {};
let currentTrendModalChartId = null;

function openTrendModal(chartId) {
    const modal = document.getElementById('trend-modal');
    const titleEl = document.getElementById('trend-modal-title');
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
            metric: 'value',
            mode: 'byPeriod',
            selectedCategories: config.categories.reduce((acc, c) => {
                acc[c] = true;
                return acc;
            }, {})
        };
    }

    // Sync dropdowns
    const metricSelect = document.getElementById('trend-metric-type');
    const modeSelect = document.getElementById('trend-display-mode');

    if (metricSelect) metricSelect.value = trendModalState[chartId].metric || 'value';
    if (modeSelect) modeSelect.value = trendModalState[chartId].mode || 'byPeriod';

    // Render the chart
    renderTrendModalChart(chartId);

    // Open the main modal
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

// Render legend checkboxes in popup
function renderTrendLegendPopup() {
    if (!currentTrendModalChartId) return;

    const popupList = document.getElementById('trend-legend-popup-list');
    const config = trendModalConfig[currentTrendModalChartId];

    if (!config || !popupList) return;

    // Render legend checkboxes in popup
    popupList.innerHTML = '';
    config.categories.forEach(category => {
        const checked = trendModalState[currentTrendModalChartId].selectedCategories[category] ? 'checked' : '';
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" ${checked} onchange="toggleTrendLegend('${currentTrendModalChartId}', '${category.replace(/'/g, "\\'")}')">
            ${category}
        `;
        popupList.appendChild(label);
    });
}

// Legend popup functions
function openTrendLegendPopup() {
    if (!currentTrendModalChartId) return;

    const popup = document.getElementById('trend-legend-popup');
    if (!popup) return;

    // Render legend checkboxes in popup
    renderTrendLegendPopup();

    popup.classList.remove('hidden');
}

function closeTrendLegendPopup() {
    const popup = document.getElementById('trend-legend-popup');
    if (popup) {
        popup.classList.add('hidden');
    }
}

function selectAllDownloadSlices(checked) {
    const sliceInputs = document.querySelectorAll('#download-slice-list input[type=checkbox]');
    sliceInputs.forEach(input => {
        input.checked = checked;
    });
}

function selectAllDownloadFields(checked) {
    const fields = Array.from(document.querySelectorAll('#download-field-list input[type=checkbox]'));
    fields.forEach(f => { f.checked = checked; });
}

function openDownloadModal() {
    const modal = document.getElementById('download-modal');
    if (!modal) return;

    // Sync Market dropdown with global filterState
    const marketSelect = document.getElementById('download-select-market');
    if (marketSelect) {
        const radio = marketSelect.querySelector(`input[value="${filterState.market}"]`);
        if (radio) {
            radio.checked = true;
            updateSelectHeader(marketSelect);
        }
    }

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
    const btn = document.querySelector('.btn-primary');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
    btn.disabled = true;

    setTimeout(() => {
        const fromInput = document.getElementById('download-date-from');
        const toInput = document.getElementById('download-date-to');
        const sliceInputs = Array.from(document.querySelectorAll('#download-slice-list input[type=checkbox]'));
        const fieldInputs = Array.from(document.querySelectorAll('#download-field-list input[type=checkbox]'));
        const marketRadio = document.querySelector('#download-select-market input[type="radio"]:checked');
        const selectedMarket = marketRadio ? marketRadio.value : '';

        const selectedSlices = sliceInputs.filter(i => i.checked).map(i => i.value);
        const selectedFields = fieldInputs.filter(i => i.checked).map(i => i.value);

        if (!selectedSlices.length || !selectedFields.length) {
            alert('Vui lòng chọn dữ liệu!');
            btn.innerHTML = '<i class="fas fa-file-csv"></i> Tải CSV';
            btn.disabled = false;
            return;
        }

        // 👉 giả lập download (bạn giữ logic CSV cũ nếu muốn)
        console.log(`Downloading Market: ${selectedMarket}`, selectedSlices, selectedFields);

        btn.innerHTML = '<i class="fas fa-file-csv"></i> Tải CSV';
        btn.disabled = false;

        showToast("Tải dữ liệu thành công 🎉");

    }, 1200);
}

function updateTrendChart() {
    if (!currentTrendModalChartId) return;
    const metricSelect = document.getElementById('trend-metric-type');
    if (!metricSelect) return;

    trendModalState[currentTrendModalChartId].metric = metricSelect.value;
    renderTrendModalChart(currentTrendModalChartId);
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

    // Re-render popup legend checkboxes to reflect changes
    renderTrendLegendPopup();

    // Re-render the chart with updated selections
    renderTrendModalChart(currentTrendModalChartId);
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
    const displayMode = trendModalState[chartId]?.mode || 'byPeriod';
    const metricType = trendModalState[chartId]?.metric || 'value';

    const calculateMetric = (series, previousSeries = null) => {
        if (metricType === 'yoy' && previousSeries) {
            return series.map((v, i) => {
                const prev = previousSeries[i];
                return prev ? ((v - prev) / prev * 100) : 0;
            });
        }
        if (metricType === 'mom') {
            return series.map((v, i) => {
                if (i === 0) return 0;
                const prev = series[i - 1];
                return prev ? ((v - prev) / prev * 100) : 0;
            });
        }
        return series; // 'value'
    };

    const sumMap = (dataMap) => {
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
            '#2563eb', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7'
        ];

        Object.entries(config.current).forEach(([category, series], idx) => {
            if (!selectedCategories[category]) return;

            const color = palette[idx % palette.length];
            const displayData = calculateMetric(series, config.previous[category]);
            
            datasets.push({
                label: category,
                data: displayData,
                borderColor: color,
                backgroundColor: `${color}15`,
                borderWidth: 2.5,
                fill: true,
                cubicInterpolationMode: 'monotone',
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderWidth: 1,
                pointBorderColor: '#fff'
            });
        });
    } else {
        // Mode: byPeriod (Current, Previous, Previous 2y)
        const currentSum = sumMap(config.current);
        const previousSum = sumMap(config.previous);
        
        // Ensure previous2Sum is distinct even if not provided in config
        let previous2Sum;
        if (config.previous2) {
            previous2Sum = sumMap(config.previous2);
        } else {
            // Mock: Previous 2 years is roughly 90% of previous year with some jitter
            previous2Sum = previousSum.map(v => v * (0.85 + Math.random() * 0.1));
        }

        const currentData = calculateMetric(currentSum, previousSum);
        const previousData = calculateMetric(previousSum, previous2Sum);
        
        // For previous2, we compare with an even older period (mocked)
        const previous3Sum = previous2Sum.map(v => v * 0.9);
        const previous2Data = calculateMetric(previous2Sum, previous3Sum);

        // Current Year line
        datasets.push({
            label: 'Trong kỳ',
            data: currentData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 3,
            fill: true,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#2563eb',
            pointBorderWidth: 2,
            pointBorderColor: '#fff',
            zIndex: 3
        });

        // Previous Year line
        datasets.push({
            label: 'Cùng kỳ năm trước',
            data: previousData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            borderWidth: 2,
            fill: false,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderDash: [5, 5],
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#f59e0b',
            zIndex: 2
        });

        // 2 Years Ago line
        datasets.push({
            label: 'Cùng kỳ 2 năm trước',
            data: previous2Data,
            borderColor: '#8b5cf6',
            backgroundColor: 'transparent',
            borderWidth: 2,
            fill: false,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            borderDash: [3, 3],
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#8b5cf6',
            zIndex: 1
        });
    }
 
    if (!datasets.length) {
        datasets.push({ label: 'Không có dữ liệu', data: [], borderColor: '#cbd5e1' });
    }

    // Auto-render the side table
    renderTrendDataTable(labels, datasets);

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
                        label: function (context) {
                            const chartId = currentTrendModalChartId;
                            const metricType = trendModalState[chartId]?.metric || 'value';
                            const suffix = (metricType === 'yoy' || metricType === 'mom') ? '%' : '';
                            return context.dataset.label + ': ' + formatNumber(context.raw) + suffix;
                        }
                    }
                },
                datalabels: {
                    display: false // Hide datalabels as they overlap, use side table instead
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f1f5f9', borderColor: '#e2e8f0' },
                    ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 6 }
                },
                x: {
                    display: true,
                    grid: { display: true, color: '#f1f5f9', borderColor: '#e2e8f0' },
                    ticks: { display: true, color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 }
                }
            }
        }
    });
}

function renderTrendDataTable(labels, datasets) {
    const wrapper = document.getElementById('trend-data-table-wrapper');
    if (!wrapper) return;

    const chartId = currentTrendModalChartId;
    const metricType = trendModalState[chartId]?.metric || 'value';
    const suffix = (metricType === 'yoy' || metricType === 'mom') ? '%' : '';

    let html = `<table class="trend-data-table">
        <thead>
            <tr>
                <th>Tháng / Phân lớp</th>
                <th style="text-align: right">Giá trị</th>
            </tr>
        </thead>
        <tbody>`;

    // Months in reverse order (newest first)
    const reversedLabels = [...labels].reverse();
    const reversedIdx = labels.map((_, i) => i).reverse();

    reversedIdx.forEach((idx) => {
        const label = labels[idx];
        html += `<tr class="month-row" style="background:#f8fafc; font-weight: bold"><td colspan="2"><i class="far fa-calendar-alt"></i> ${label}</td></tr>`;
        datasets.forEach(ds => {
            const val = ds.data[idx];
            if (val === undefined || isNaN(val)) return;
            
            html += `<tr>
                <td>
                    <span class="series-indicator" style="background: ${ds.borderColor}"></span>
                    ${ds.label}
                </td>
                <td class="val-col">${formatNumber(val)}${suffix}</td>
            </tr>`;
        });
    });

    html += `</tbody></table>`;
    wrapper.innerHTML = html;
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
    },
    'chart-feedback-count': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [1250, 1320, 1410, 1510, 1620, 1750],
            previous: [980, 1050, 1120, 1180, 1250, 1330]
        },
        categories: {}
    },
    'chart-resolution-time': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [3.8, 3.6, 3.4, 3.2, 3.0, 2.8],
            previous: [4.5, 4.3, 4.1, 3.9, 3.7, 3.5]
        },
        categories: {}
    },
    'chart-feedback-rate': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [8.5, 8.2, 7.9, 7.6, 7.3, 7.0],
            previous: [11.2, 10.8, 10.4, 10.0, 9.6, 9.2]
        },
        categories: {}
    },
    'chart-nps': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [48, 50, 52, 54, 56, 58],
            previous: [42, 44, 46, 48, 50, 52]
        },
        categories: {}
    },
    'chart-resolution': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [87.5, 88.2, 89.0, 89.8, 90.5, 91.0],
            previous: [85.0, 85.5, 86.0, 86.5, 87.0, 87.5]
        },
        categories: {}
    },
    'chart-setup': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [92.5, 93.0, 93.5, 94.0, 94.5, 95.0],
            previous: [90.0, 90.5, 91.0, 91.5, 92.0, 92.5]
        },
        categories: {}
    },
    'chart-csat': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [4.15, 4.20, 4.25, 4.30, 4.35, 4.40],
            previous: [3.95, 4.00, 4.05, 4.10, 4.15, 4.20]
        },
        categories: {}
    },
    'chart-ces': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [2.8, 2.7, 2.6, 2.5, 2.4, 2.3],
            previous: [3.2, 3.1, 3.0, 2.9, 2.8, 2.7]
        },
        categories: {}
    },
    'chart-churn-rate': {
        labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
        mandatory: {
            current: [1.8, 1.7, 1.6, 1.5, 1.4, 1.3],
            previous: [2.3, 2.2, 2.1, 2.0, 1.9, 1.8]
        },
        categories: {}
    },
    'chart-arpu-tieu-dung-thuc': { labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], mandatory: { current: [45, 45.2, 45.1, 45.5, 45.3, 45.2], previous: [43, 43.1, 43.2, 43.3, 43.5, 43.4] }, categories: {} },
    'chart-arpu-thue-bao': { labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], mandatory: { current: [12.0, 12.2, 12.1, 12.5, 12.3, 12.4], previous: [11.5, 11.7, 11.9, 12.0, 12.1, 12.2] }, categories: {} },
    'chart-arpu-tb-phat-trien-moi': { labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], mandatory: { current: [3.0, 3.2, 3.1, 3.5, 3.3, 3.4], previous: [2.5, 2.7, 2.9, 3.0, 3.1, 3.2] }, categories: {} },
    'chart-arpu-luu-luong': { labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], mandatory: { current: [8000, 8200, 8100, 8500, 8300, 8400], previous: [7500, 7700, 7900, 8000, 8100, 8200] }, categories: {} },
    'chart-arpu-super-app': { labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], mandatory: { current: [1.5, 1.6, 1.7, 1.8, 1.9, 2.0], previous: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7] }, categories: {} },
    'chart-cat-lop-thu-nhap-kenh': { labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'], mandatory: { current: [4500, 4800, 5100, 5300, 5600, 5800], previous: [4000, 4200, 4400, 4600, 4800, 5000] }, categories: {} }
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
                                    borderColor: '#16a34a',
                                    backgroundColor: 'rgba(22, 163, 74, 0.05)',
                                    borderWidth: 2.5,
                                    fill: false,
                                    tension: 0.3,
                                    pointRadius: 3,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: '#16a34a',
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
                                        afterLabel: function (context) {
                                            if (context.datasetIndex === 0 && context.dataIndex > 0) {
                                                const currentValue = context.parsed.y;
                                                const previousValue = trendDatasetsPreviousYear[cardKey][context.dataIndex];
                                                const change = currentValue - previousValue;
                                                const pctChange = ((change / previousValue) * 100).toFixed(1);
                                                return `YoY: ${change > 0 ? '+' : ''}${change.toFixed(1)} (${pctChange > 0 ? '+' : ''}${pctChange}%)`;
                                            }
                                        }
                                    }
                                },
                                datalabels: {
                                    display: false
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
                                    display: false,
                                    grid: {
                                        display: false,
                                        borderColor: '#e2e8f0'
                                    },
                                    ticks: {
                                        display: false,
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

// Render CX trend charts for Level 2 (Trải nghiệm)
function renderCXTrendCharts() {
    try {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded yet for CX charts, retrying...');
            setTimeout(renderCXTrendCharts, 500);
            return;
        }

        const chartIds = [
            'chart-feedback-count',
            'chart-resolution-time',
            'chart-feedback-rate',
            'chart-nps',
            'chart-resolution',
            'chart-setup',
            'chart-csat',
            'chart-ces',
            'chart-churn-rate'
        ];

        chartIds.forEach((chartId) => {
            const canvas = document.getElementById(chartId);
            if (!canvas) {
                console.warn('Canvas not found:', chartId);
                return;
            }

            // Check if trendModeData has this chart
            if (!trendModeData[chartId]) {
                console.warn('No trend data for:', chartId);
                return;
            }

            const trendData = trendModeData[chartId];
            const ctx = canvas.getContext('2d');

            // Destroy existing chart instance if it exists
            if (trendChartInstances[chartId]) {
                trendChartInstances[chartId].destroy();
            }

            trendChartInstances[chartId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [
                        {
                            label: 'Hiện tại',
                            data: activeFilterLabel ? trendData.mandatory.current.map(v => v * (0.2 + Math.random() * 0.3)) : trendData.mandatory.current,
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
                            label: 'Năm trước',
                            data: activeFilterLabel ? trendData.mandatory.previous.map(v => v * (0.2 + Math.random() * 0.3)) : trendData.mandatory.previous,
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
                                afterLabel: function (context) {
                                    if (context.datasetIndex === 0 && context.dataIndex > 0) {
                                        const currentValue = context.parsed.y;
                                        const previousValue = trendData.mandatory.previous[context.dataIndex];
                                        const change = currentValue - previousValue;
                                        const pctChange = ((change / previousValue) * 100).toFixed(1);
                                        return `YoY: ${change > 0 ? '+' : ''}${change.toFixed(1)} (${pctChange > 0 ? '+' : ''}${pctChange}%)`;
                                    }
                                }
                            }
                        },
                        datalabels: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: { color: '#f1f5f9', borderColor: '#e2e8f0' },
                            ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 4 }
                        },
                        x: {
                            display: true,
                            grid: { display: false, borderColor: '#e2e8f0' },
                            ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, minRotation: 0 }
                        }
                    }
                }
            });
        });
    } catch (e) {
        console.error('Error in renderCXTrendCharts:', e);
    }
}

// Helper to create a horizontal bar chart safely with Cross-filtering support
const createHorizontalBarChart = (canvasId, labels, data, accentColor, unitLabel, customColors = null) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Apply filtering if a label is active
    let displayData = [...data];
    let displayLabels = [...labels];
    let displayColors = customColors || data.map(() => accentColor);

    if (activeFilterLabel) {
        const labelIndex = labels.indexOf(activeFilterLabel);
        if (labelIndex !== -1) {
            displayColors = labels.map((l, i) => i === labelIndex ? (customColors ? customColors[i] : accentColor) : '#e2e8f0');
        } else {
            // Dim data if filter doesn't apply to this chart
            // But keep Toàn mạng and Tổng bright if they are the first two bars?
            // Actually, let's just use the standard dimming but check for the label
            displayData = data.map(v => v * (0.15 + Math.random() * 0.3));
        }
    }

    if (trendChartInstances[canvasId]) {
        trendChartInstances[canvasId].destroy();
        delete trendChartInstances[canvasId];
    }

    const tooltipLabel = unitLabel ? `${unitLabel}: ` : '';
    trendChartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: unitLabel || 'Giá trị',
                data: displayData,
                backgroundColor: displayColors,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    right: 60
                }
            },
            onClick: (e) => {
                const chart = trendChartInstances[canvasId];
                const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length > 0) {
                    handleChartLabelClick(labels[points[0].index]);
                } else {
                    const yAx = chart.scales.y;
                    const val = yAx.getValueForPixel(e.y);
                    if (val >= 0 && val < labels.length) handleChartLabelClick(labels[Math.round(val)]);
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'end',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value, context) => {
                        const label = context.chart.data.labels[context.dataIndex];
                        const formattedValue = formatNumber(value) + (unitLabel || '');
                        
                        // Find index of 'Tổng'
                        const totalIndex = context.chart.data.labels.indexOf('Tổng');
                        
                        if (label === 'Toàn mạng') return formattedValue;
                        
                        if (label === 'Tổng') return `${formattedValue} (100%)`;
                        
                        if (totalIndex !== -1) {
                            const totalValue = context.chart.data.datasets[0].data[totalIndex];
                            if (totalValue > 0) {
                                const pct = ((value / totalValue) * 100).toFixed(1);
                                return `${formattedValue} (${pct}%)`;
                            }
                        }
                        
                        return formattedValue;
                    }
                }
            },
            scales: {
                x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { font: { weight: '600' } } }
            }
        }
    });
};

function renderCharts() {
    if (chartsInitialized) return;
    Chart.register(ChartDataLabels);
    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";

    function getUnitForChart(chartId, defaultUnit) {
        if (currentMetricsState[chartId] === 'rev' || (chartId.includes('-kenh') && currentKenhMetric === 'thu-nhap-kenh')) return 'Tỉ VNĐ';
        if (chartId.includes('arpu') || currentTieuDungMetric === 'arpu') return '$';
        if (currentThueBaoMetric === 'ty-le-dat-15c3d') return '%';
        return defaultUnit;
    }

    // Helper to prepend "Toàn mạng" and "Tổng" bars
    // Labels array, Data array, accentColor for segments, optional wholeValue
    const withSummary = (canvasId, labels, data, accentColor, unitLabel, customWhole = null) => {
        const total = data.reduce((a, b) => a + b, 0);
        const whole = customWhole || total * 1.12; // Mock: Whole is slightly more than total
        
        const summaryLabels = ['Toàn mạng', 'Tổng', ...labels];
        const summaryData = [whole, total, ...data];
        
        // Colors: Grey for Whole, Darker for Total, accentColor for segments
        const summaryColors = ['#94a3b8', '#1e293b', ...data.map(() => accentColor)];
        
        createHorizontalBarChart(canvasId, summaryLabels, summaryData, accentColor, unitLabel, summaryColors);
    };

    // 1. Consumer charts (Tiêu dùng thực)
    const isARPU = currentTieuDungMetric === 'actual'; // check actual vs arpu
    const tdUnit = getUnitForChart('chart-tinh', 'Tỉ');
    const tdColor = '#3b82f6';

    withSummary('chart-tinh', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], currentTieuDungMetric === 'arpu' ? [4.2, 4.8, 3.5, 3.2, 2.8, 2.9, 3.4] : [12.5, 14.2, 4.3, 3.8, 3.1, 3.3, 4.0], tdColor, tdUnit);
    withSummary('chart-cat-lop-tieu-dung', ['Thoại', 'SMS', 'Data', 'VAS', 'Khác'], currentTieuDungMetric === 'arpu' ? [2.5, 0.8, 5.2, 1.2, 0.5] : [20.5, 5.2, 15.8, 2.1, 1.6], '#ef4444', tdUnit);
    withSummary('chart-goicuoc', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], currentTieuDungMetric === 'arpu' ? [5.5, 4.2, 3.8, 2.5, 4.0, 3.0] : [15.2, 8.4, 6.1, 5.3, 4.2, 6.0], '#8b5cf6', tdUnit);
    withSummary('chart-khuvuc', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], currentTieuDungMetric === 'arpu' ? [4.0, 4.5, 3.2, 2.8] : [16.8, 18.5, 6.4, 3.5], '#10b981', tdUnit);
    withSummary('chart-tuoitho', ['< 3 tháng', '3-6 tháng', '6-12 tháng', '1-3 năm', '> 3 năm'], currentTieuDungMetric === 'arpu' ? [2.1, 3.4, 4.2, 5.5, 4.8] : [4.2, 5.6, 8.4, 15.3, 11.7], '#f43f5e', tdUnit);
    withSummary('chart-kenh', ['App', 'CH Trực tiếp', 'Đại lý', 'CTV', 'Tele', 'B2B'], currentTieuDungMetric === 'arpu' ? [5.2, 4.8, 3.5, 2.8, 2.1, 3.2] : [14.5, 12.1, 8.4, 4.3, 2.5, 3.4], '#f59e0b', tdUnit);
    withSummary('chart-tram', ['ABC123', 'BBC124', 'XCB1235', 'XCBxyz', 'Khác'], currentTieuDungMetric === 'arpu' ? [4.5, 3.8, 3.2, 5.1, 3.5] : [10.5, 8.2, 6.1, 12.3, 7.9], '#06b6d4', tdUnit);
    withSummary('chart-arpu-tieu-dung-thuc', ['0-0.5$', '0.5-1$', '1-2$', '2-5$', '5-10$', '>10$'], [1.5, 2.8, 15.6, 18.2, 5.4, 1.7], '#14b8a6', tdUnit);

    // 2. Subscriber charts (Thuê bao)
    const tbUnit = 'M';
    const tbColor = '#3b82f6';
    const isLũyKế = currentThueBao15c3dMetric === 'luy-ke';

    withSummary('chart-tinh-thue-bao', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], isLũyKế ? [1.2, 1.4, 0.5, 0.4, 0.3, 0.35, 0.45] : [0.12, 0.15, 0.05, 0.04, 0.03, 0.03, 0.04], tbColor, tbUnit);
    withSummary('chart-goicuoc-thue-bao', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], isLũyKế ? [1.5, 0.8, 0.6, 0.5, 0.4, 0.6] : [0.15, 0.08, 0.06, 0.05, 0.04, 0.06], '#8b5cf6', tbUnit);
    withSummary('chart-khuvuc-thue-bao', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], isLũyKế ? [1.7, 1.9, 0.7, 0.3] : [0.17, 0.2, 0.07, 0.03], '#10b981', tbUnit);
    withSummary('chart-tuoitho-thue-bao', ['< 3 tháng', '3-6 tháng', '6-12 tháng', '1-3 năm', '> 3 năm'], isLũyKế ? [0.4, 0.6, 0.9, 1.5, 1.3] : [0.04, 0.06, 0.09, 0.15, 0.13], '#f43f5e', tbUnit);
    withSummary('chart-kenh-thue-bao', ['App', 'CH Trực tiếp', 'Đại lý', 'CTV', 'Tele', 'B2B'], isLũyKế ? [1.45, 1.21, 0.84, 0.43, 0.25, 0.34] : [0.14, 0.12, 0.08, 0.04, 0.02, 0.03], '#f59e0b', tbUnit);
    withSummary('chart-tram-thue-bao', ['ABC123', 'BBC124', 'XCB1235', 'XCBxyz', 'Khác'], isLũyKế ? [1.1, 0.8, 0.6, 1.3, 0.7] : [0.11, 0.08, 0.06, 0.13, 0.07], '#06b6d4', tbUnit);
    withSummary('chart-arpu-thue-bao', ['0-0.5$', '0.5-1$', '1-2$', '2-5$', '5-10$', '>10$'], isLũyKế ? [0.8, 1.2, 5.5, 4.0, 0.8, 0.2] : [0.08, 0.12, 0.15, 0.1, 0.05, 0.02], '#14b8a6', tbUnit);

    // 3. New Sub charts
    const ptmUnit = 'M';
    withSummary('chart-tinh-tb-phat-trien-moi', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [1.2, 1.4, 0.5, 0.4, 0.3, 0.35, 0.45], tbColor, ptmUnit);
    withSummary('chart-goicuoc-tb-phat-trien-moi', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], [1.5, 0.8, 0.6, 0.5, 0.4, 0.6], '#8b5cf6', ptmUnit);
    withSummary('chart-khuvuc-tb-phat-trien-moi', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [1.7, 1.9, 0.7, 0.3], '#10b981', ptmUnit);
    withSummary('chart-tuoitho-tb-phat-trien-moi', ['< 3 tháng', '3-6 tháng', '6-12 tháng', '1-3 năm', '> 3 năm'], [0.4, 0.6, 0.9, 1.5, 1.3], '#f43f5e', ptmUnit);
    withSummary('chart-kenh-tb-phat-trien-moi', ['App', 'CH Trực tiếp', 'Đại lý', 'CTV', 'Tele', 'B2B'], [1.45, 1.21, 0.84, 0.43, 0.25, 0.34], '#f59e0b', ptmUnit);
    withSummary('chart-tram-tb-phat-trien-moi', ['ABC123', 'BBC124', 'XCB1235', 'XCBxyz', 'Khác'], [1.1, 0.8, 0.6, 1.3, 0.7], '#06b6d4', ptmUnit);
    withSummary('chart-arpu-tb-phat-trien-moi', ['0-0.5$', '0.5-1$', '1-2$', '2-5$', '5-10$', '>10$'], [0.5, 0.7, 1.8, 1.0, 0.15, 0.05], '#14b8a6', ptmUnit);

    // 4. Super App charts
    withSummary('chart-tinh-super-app', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [1.8, 2.1, 0.3, 0.2, 0.2, 0.25, 0.35], '#3b82f6', 'M');
    withSummary('chart-arpu-super-app', ['0-0.5$', '0.5-1$', '1-2$', '2-5$', '5-10$', '>10$'], [0.4, 0.6, 1.2, 0.9, 0.3, 0.1], '#14b8a6', 'M');
    withSummary('chart-khuvuc-super-app', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [2.5, 2.8, 0.5, 0.2], '#10b981', 'M');
    withSummary('chart-tuoitho-super-app', ['< 3 tháng', '3-6 tháng', '6-12 tháng', '1-3 năm', '> 3 năm'], [0.6, 0.8, 1.2, 2.0, 1.8], '#f43f5e', 'M');
    withSummary('chart-kenh-super-app', ['App', 'CH Trực tiếp', 'Đại lý', 'CTV', 'Tele', 'B2B'], [2.1, 1.8, 1.2, 0.6, 0.3, 0.5], '#f59e0b', 'M');

    // 5. Data Traffic charts (GB/PB)
    const trafficUnit = 'GB';
    withSummary('chart-tinh-luu-luong', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [2500, 2800, 950, 820, 670, 740, 890], '#3b82f6', trafficUnit);
    withSummary('chart-goicuoc-luu-luong', ['V120', 'ST90', 'MIMAX70', 'UMAX50', 'V90', 'Khác'], [2800, 1600, 1200, 900, 720, 1100], '#8b5cf6', trafficUnit);
    withSummary('chart-khuvuc-luu-luong', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [3100, 3300, 1200, 620], '#10b981', trafficUnit);
    withSummary('chart-tuoitho-luu-luong', ['< 3 tháng', '3-6 tháng', '6-12 tháng', '1-3 năm', '> 3 năm'], [780, 940, 1200, 1900, 1600], '#f43f5e', trafficUnit);
    withSummary('chart-kenh-luu-luong', ['App', 'CH Trực tiếp', 'Đại lý', 'CTV', 'Tele', 'B2B'], [2900, 2500, 1800, 950, 520, 670], '#f59e0b', trafficUnit);
    withSummary('chart-tram-luu-luong', ['ABC123', 'BBC124', 'XCB1235', 'XCBxyz', 'Khác'], [2000, 1500, 1200, 2500, 1300], '#06b6d4', trafficUnit);
    withSummary('chart-arpu-luu-luong', ['0-0.5$', '0.5-1$', '1-2$', '2-5$', '5-10$', '>10$'], [200, 500, 3100, 2800, 1200, 600], '#14b8a6', trafficUnit);

    // 6. Channel (Kênh) charts
    withSummary('chart-tinh-kenh', ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Đồng Nai', 'Bình Dương'], [850, 920, 310, 280, 220, 240, 290], '#3b82f6', 'kênh');
    withSummary('chart-loaikenh-kenh', ['Trực tiếp', 'Đại lý', 'CTV', 'App', 'Tele', 'B2B'], [120, 850, 3500, 450, 320, 210], '#8b5cf6', 'kênh');
    withSummary('chart-khuvuc-kenh', ['Miền Bắc', 'Miền Nam', 'Miền Trung', 'Miền Tây'], [1650, 1850, 640, 420], '#10b981', 'kênh');
    withSummary('chart-trangthai-kenh', ['Hoạt động', 'Tạm ngưng', 'Chờ đóng', 'Hết hạn'], [4800, 450, 280, 100], '#f43f5e', 'kênh');
    withSummary('chart-makenh-kenh', ['CHN001', 'DLU002', 'CTV003', 'KSN004', 'TEL005', 'KDN006', 'Khác'], [120, 850, 3500, 450, 320, 210, 180], '#8b5cf6', 'kênh');
    withSummary('chart-cat-lop-thu-nhap-kenh', ['<1tr', '1-5tr', '5-10tr', '10-20tr', '20-50tr', '>50tr'], [1200, 2500, 1800, 950, 420, 150], '#6366f1', 'kênh');

    // 11. CX charts
    const cxCards = [
        { id: 'chart-feedback-count', label: 'khiếu nại', color: '#3b82f6', data: [120, 450, 890], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-resolution-time', label: 'giờ', color: '#8b5cf6', data: [2.5, 3.8, 5.2], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-feedback-rate', label: '%', color: '#10b981', data: [0.8, 1.2, 2.5], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-nps', label: 'điểm', color: '#f43f5e', data: [85, 72, 58], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-resolution', label: '%', color: '#f59e0b', data: [98, 94, 89], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-setup', label: '%', color: '#06b6d4', data: [99, 98, 96], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-csat', label: '%', color: '#14b8a6', data: [92, 85, 78], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-ces', label: 'điểm', color: '#6366f1', data: [4.6, 4.1, 3.8], categories: ['Kim cương', 'Vàng', 'Bạc'] },
        { id: 'chart-churn-rate', label: '%', color: '#ef4444', data: [0.5, 1.2, 3.4], categories: ['Kim cương', 'Vàng', 'Bạc'] }
    ];

    cxCards.forEach(cx => {
        withSummary(cx.id, cx.categories, cx.data, cx.color, cx.label);
    });

    chartsInitialized = true;
}

// Utility Functions
let currentKenhMetric = 'phat-trien';
function updateKenhMetric(val) { currentKenhMetric = val; chartsInitialized = false; renderCharts(); showToast(`Đã chuyển: ${getKenhMetricName(val)}`); }
function getKenhMetricName(v) { return {'phat-trien':'Kênh PT TB','mua-hang':'Kênh mua hàng','d2d':'Kênh D2D','co-thu-nhap':'Kênh có thu nhập','thu-nhap-kenh':'Thu nhập kênh','thu-nhap-tren-kenh':'Thu nhập/Kênh'}[v] || v; }

let currentLuuLuongMetric = 'data';
function updateLuuLuongMetric(v) { currentLuuLuongMetric = v; chartsInitialized = false; renderCharts(); showToast(`Đã chuyển: ${v === 'data' ? 'Lưu lượng Data' : 'DOU'}`); }

let currentThueBaoMetric = 'phat-trien-moi';
let currentThueBao15c3dMetric = 'tang-them';
function updateThueBaoMetric(v) { currentThueBaoMetric = v; chartsInitialized = false; renderCharts(); showToast(`Đã chuyển: ${getThueBaoMetricName(v)}`); }
function updateThueBao15c3dMetric(v) { currentThueBao15c3dMetric = v; chartsInitialized = false; renderCharts(); showToast(`Đã chuyển: ${getThueBaoMetricName(v)}`); }
function getThueBaoMetricName(v) { return {'phat-trien-moi':'TB PT mới','dat-15c3d':'TB PT mới đạt 15c3d','ty-le-dat-15c3d':'Tỷ lệ TB mới đạt 15c3d','tang-them':'TB 15c3d tăng thêm','luy-ke':'TB 15c3d lũy kế'}[v] || v; }

function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;animation:fadeInOut 3s forwards;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

let currentTieuDungMetric = 'actual';
function updateTieuDungMetric(v) { currentTieuDungMetric = v; chartsInitialized = false; renderCharts(); showToast(`Đã chuyển: ${v === 'actual' ? 'Tiêu dùng thực' : 'ARPU'}`); }
function getTieuDungMetricName(v) { return {'actual':'Tiêu dùng thực','arpu':'ARPU'}[v] || v; }

function openDefinitionModal() {
    showToast("Tính năng Định nghĩa & Hướng dẫn đang được xây dựng!");
}

// Add animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        15% { opacity: 1; transform: translate(-50%, 0); }
        85% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
    }
`;
document.head.appendChild(style);

/* ===== HIERARCHY TREE TABLE LOGIC ===== */
let expandedRows = new Set();

function renderHierarchyTable() {
    const tableBody = document.getElementById('hierarchy-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const market = filterState.market;
    const data = marketDataDependencies[market] || marketDataDependencies['MYN'];
    let provinces = data.provinces || [];

    provinces.forEach(province => {
        const provinceRowId = `p:${province}`;
        renderHierarchyRow(tableBody, province, 0, provinceRowId, 'fas fa-map-marker-alt');

        if (expandedRows.has(provinceRowId)) {
            tenureCategories.forEach(tenure => {
                const tenureRowId = `${provinceRowId}|t:${tenure.label}`;
                renderHierarchyRow(tableBody, tenure.label, 1, tenureRowId, 'fas fa-hourglass-half');

                if (expandedRows.has(tenureRowId)) {
                    arpuCategories.forEach(arpu => {
                        const arpuRowId = `${tenureRowId}|a:${arpu.label}`;
                        renderHierarchyRow(tableBody, arpu.label, 2, arpuRowId, 'fas fa-coins');

                        if (expandedRows.has(arpuRowId)) {
                            const packages = data.packages || [];
                            packages.forEach(pkg => {
                                const pkgRowId = `${arpuRowId}|pkg:${pkg}`;
                                renderHierarchyRow(tableBody, pkg, 3, pkgRowId, 'fas fa-cube', false);
                            });
                        }
                    });
                }
            });
        }
    });
}

function renderHierarchyRow(container, label, level, rowId, iconClass, canExpand = true) {
    const isExpanded = expandedRows.has(rowId);
    const row = document.createElement('tr');
    row.className = `node-level-${level}`;

    // Deterministic mock data generator
    const hash = (str) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
        return Math.abs(h);
    };
    const h = hash(rowId);
    
    const lũy_kế = (h % 2000) + 500;
    const yoy = ((h % 200) / 10 - 10).toFixed(1);
    const mom = ((h % 100) / 10 - 5).toFixed(1);
    const tiêu_dùng = (h % 400) + 50;
    const td_yoy = ((h % 180) / 10 - 9).toFixed(1);
    const td_mom = ((h % 90) / 10 - 4.5).toFixed(1);

    const formatGrowthVal = (val, asPercentage = true) => {
        const floatVal = parseFloat(val);
        if (floatVal > 0) return `<span class="growth-positive">▲ ${asPercentage ? val + '%' : Math.round(val)}</span>`;
        if (floatVal < 0) return `<span class="growth-negative">▼ ${asPercentage ? Math.abs(val) + '%' : Math.abs(Math.round(val))}</span>`;
        return `<span style="color: var(--text-muted)">- ${asPercentage ? '0.0%' : '0'}</span>`;
    };

    row.innerHTML = `
        <td>
            <div class="tree-node">
                ${canExpand ? `
                    <div class="tree-toggle" onclick="toggleHierarchyRow('${rowId}')">
                        <i class="fas fa-${isExpanded ? 'minus' : 'plus'}"></i>
                    </div>
                ` : '<div class="tree-indent"></div>'}
                <i class="${iconClass} tree-icon"></i>
                <span>${label}</span>
            </div>
        </td>
        <td class="num-val">${formatNumber(lũy_kế / (level + 1), 0)}</td>
        <td class="num-val">${formatGrowthVal(yoy, false)}</td>
        <td class="num-val">${formatGrowthVal(mom, false)}</td>
        <td class="num-val">${formatNumber(tiêu_dùng / (level + 1), 1)}</td>
        <td class="num-val">${formatGrowthVal(td_yoy, true)}</td>
        <td class="num-val">${formatGrowthVal(td_mom, true)}</td>
    `;
    container.appendChild(row);
}

function toggleHierarchyRow(rowId) {
    if (expandedRows.has(rowId)) expandedRows.delete(rowId);
    else expandedRows.add(rowId);
    renderHierarchyTable();
}

// Auto-init on load if not already called
window.addEventListener('load', renderHierarchyTable);