import { parseDate } from '../utils/dateUtils.js';
import { calcularSla16HorasUteis, isBacklogStatus } from '../utils/slaUtils.js';

export class Ticket {
    constructor(data) {
        this.id = data.id;
        this.titulo = data.titulo;
        this.entidade = data.entidade;
        this.dataAbertura = parseDate(data.dataAbertura);
        this.dataSolucao = data.dataSolucao ? parseDate(data.dataSolucao) : null;
        this.tipo = data.tipo;
        this.categoria = data.categoria;
        this.categoriaPai = data.categoria.split('>')[0] || 'Geral';
        this.tecnico = data.tecnico;
        this.equipe = data.equipe;
        this.duracao = data.duracao;
        this.csat = data.csat || null;
        this.status = data.status;
        this.isBacklog = isBacklogStatus(this.status);
        this.requerente = data.requerente;
        
        this.withinSLA = null;
        if (!this.isBacklog && this.dataSolucao && this.dataAbertura) {
            this.withinSLA = calcularSla16HorasUteis(this.dataAbertura.dateObj, this.dataSolucao.dateObj);
        }
    }
}