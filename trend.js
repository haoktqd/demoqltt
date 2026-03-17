<script>
    // Sample data for trend line
    const trendData = [
        { x: '2026-01', y: 30 },
        { x: '2026-02', y: 40 },
        { x: '2026-03', y: 35 },
        { x: '2026-04', y: 50 },
        { x: '2026-05', y: 45 },
        { x: '2026-06', y: 60 }
    ];

    const ctx = document.getElementById('trendChart').getContext('2d');
    const trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Đường xu thế',
                data: trendData,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month'
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
</script>
