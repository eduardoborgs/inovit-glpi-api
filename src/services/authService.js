import { API_CONFIG } from '../config/constants.js';

export async function login(user, password) {
    const response = await fetch(`${API_CONFIG.BFF_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user, password })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de autenticação (Status ${response.status})`);
    }

    const data = await response.json();

    if (data.session_token) {
        localStorage.setItem('glpi_session_token', data.session_token);
        localStorage.setItem('inovit_user', data.user || user);
    } else {
        throw new Error("O servidor (BFF) não devolveu um token válido.");
    }

    return data;
}

export function logout() {
    localStorage.removeItem('glpi_session_token');
    localStorage.removeItem('inovit_user');
    sessionStorage.clear();
    
    window.location.href = window.location.pathname + '?nocache=' + new Date().getTime();
}

export function getSessionToken() {
    return localStorage.getItem('glpi_session_token');
}