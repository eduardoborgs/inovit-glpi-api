import { API_CONFIG } from '../config/constants.js';
import { getSessionToken } from './authService.js';
import { Ticket } from '../models/Ticket.js';

export async function fetchTicketsFromGLPI() {
    const token = getSessionToken();
    if (!token) throw new Error("Não autorizado");

    const response = await fetch(`${API_CONFIG.BFF_URL}/tickets`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Falha ao sincronizar com GLPI.");
    
    const rawData = await response.json();
    return rawData.map(ticketData => new Ticket(ticketData));
}