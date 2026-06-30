import { API_CONFIG } from '../config/constants.js';

export async function login(user, password) {
    const response = await fetch(`${API_CONFIG.BFF_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password })
    });
    if (!response.ok) throw new Error("Credenciais inválidas.");
    const data = await response.json();
    
    localStorage.setItem('inovit_session', data.session_token);
    localStorage.setItem('inovit_user', data.user);
    return data;
}

export function logout() {
    localStorage.removeItem('inovit_session');
    localStorage.removeItem('inovit_user');
    location.reload();
}

export function getSessionToken() {
    return localStorage.getItem('inovit_session');
}