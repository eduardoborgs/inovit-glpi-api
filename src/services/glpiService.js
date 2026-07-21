import { API_CONFIG } from '../config/constants.js';

const BACKLOG_STATUSES = ['novo', 'pendente', 'em atendimento (atribuído)', 'em atendimento (planejado)'];

function isBacklogStatus(status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return BACKLOG_STATUSES.some(b => s === b || s.includes(b) || b.includes(s));
}

function parseDate(v) {
    if (!v) return null;
    let d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return {
        dia: String(d.getDate()).padStart(2, '0'),
        mes: String(d.getMonth() + 1).padStart(2, '0'),
        ano: d.getFullYear(),
        dateObj: d
    };
}

function calcularSLATodosOsDias(abertura, fechamento) {
    if (!abertura || !fechamento) return true;
    let d1 = new Date(abertura);
    let d2 = new Date(fechamento);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
    if (d1 >= d2) return true;

    let minutos = 0;
    let current = new Date(d1.getTime());
    while (current < d2) {
        minutos++;
        current.setMinutes(current.getMinutes() + 1);
    }
    return (minutos / 60) <= 16;
}

export async function fetchTicketsFromGLPI(startDate, endDate) {
    const token = localStorage.getItem('glpi_session_token');
    if (!token) throw new Error("Acesso negado: Token de sessão ausente.");

    let url = `${API_CONFIG.BFF_URL}/tickets`;
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    if (params.toString()) url += '?' + params.toString();

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Falha na API: ${err}`);
    }

    const rawTickets = await response.json();

    const enrichedTickets = rawTickets.map(t => {
        const openParsed = parseDate(t.dataAbertura);
        const closeParsed = parseDate(t.dataSolucao);
        const isBacklog = isBacklogStatus(t.status);

        let withinSLA = null;
        if (!isBacklog && closeParsed && openParsed?.dateObj && closeParsed?.dateObj) {
            withinSLA = calcularSLATodosOsDias(openParsed.dateObj, closeParsed.dateObj);
        }

        return {
            ...t,
            dataAbertura: openParsed,
            dataSolucao: closeParsed,
            isBacklog: isBacklog,
            withinSLA: withinSLA,
            duracao: parseFloat(t.duracao) || 0,
            categoriaPai: t.categoria ? t.categoria.split('>')[0].trim() : 'Geral',
            categoriaFilha: t.categoria && t.categoria.includes('>') ? t.categoria.split('>')[1].trim() : 'Outros',
        };
    });

    return enrichedTickets;
}