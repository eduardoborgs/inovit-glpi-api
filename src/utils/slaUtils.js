const BACKLOG_STATUSES = ['novo', 'pendente', 'em atendimento (atribuído)', 'em atendimento (planejado)'];

export function isBacklogStatus(status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return BACKLOG_STATUSES.some(b => s === b || s.includes(b) || b.includes(s));
}

export function calcularSla16HorasUteis(abertura, fechamento) {
    if (!abertura || !fechamento) return true;
    let d1 = new Date(abertura);
    let d2 = new Date(fechamento);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
    if (d1 >= d2) return true;
    
    let minutos = 0;
    let current = new Date(d1.getTime());
    while (current < d2) {
        let dia = current.getDay();
        if (dia !== 0 && dia !== 6) {
            let hora = current.getHours();
            if ((hora >= 8 && hora < 12) || (hora >= 14 && hora < 18)) minutos++;
        }
        current.setMinutes(current.getMinutes() + 1);
    }
    return (minutos / 60) <= 16;
}