let chartInstances = {};

export function renderSLAChart(slaPct) {
    if (chartInstances.sla) chartInstances.sla.destroy();

    const ctxSla = document.getElementById('chart-sla').getContext('2d');
    const slaValue = parseFloat(slaPct);

    chartInstances.sla = new Chart(ctxSla, { 
        type: 'bar', 
        data: { 
            labels: ['SLA Global'], 
            datasets: [{ 
                label: 'Conformidade (%)', 
                data: [slaValue], 
                backgroundColor: slaValue >= 85 ? '#2e7d32' : (slaValue >= 70 ? '#f9a825' : '#c62828'), 
                borderRadius: 4 
            }] 
        }, 
        options: { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { min: 0, max: 100 } }
        } 
    });
}