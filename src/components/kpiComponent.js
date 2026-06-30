export function renderGlobalKPIs(tickets) {
    const totalAcoes = tickets.length;
    const uniqueTickets = new Set(tickets.map(d => d.id)).size;
    const totalClientes = new Set(tickets.map(d => d.entidade)).size;
    
    const naoBacklog = tickets.filter(d => !d.isBacklog);
    const dentroSLA = naoBacklog.filter(d => d.withinSLA === true).length;
    const foraSLA = naoBacklog.length - dentroSLA;
    const slaPct = naoBacklog.length > 0 ? ((dentroSLA / naoBacklog.length) * 100).toFixed(1) : "100.0";
    
    const backlogCount = tickets.filter(d => d.isBacklog).length;
    const totalTechs = new Set(tickets.filter(d => d.tecnico !== '').map(d => d.tecnico)).size;

    document.getElementById('kpi-sla-global').innerText = `${slaPct}%`;
    document.getElementById('kpi-clientes').innerText = totalClientes;
    document.getElementById('kpi-tickets').innerText = uniqueTickets;
    document.getElementById('kpi-acoes').innerText = totalAcoes;
    document.getElementById('kpi-dentro-sla').innerText = dentroSLA;
    document.getElementById('kpi-fora-sla').innerText = foraSLA;
    document.getElementById('kpi-backlog').innerText = backlogCount;
    document.getElementById('kpi-tecnicos-count').innerText = totalTechs;

    return slaPct; 
}