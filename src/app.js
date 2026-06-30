import { login, logout, getSessionToken } from './services/authService.js';
import { fetchTicketsFromGLPI } from './services/glpiService.js';
import { renderGlobalKPIs } from './components/kpiComponent.js';
import { renderSLAChart } from './components/chartComponent.js';

const AppState = {
    globalData: [],
    currentFiltered: []
};

function showLoading(msg) {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-text').innerText = msg;
}
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = getSessionToken();
    if (token) {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('topbar-username').innerText = localStorage.getItem('inovit_user');
        await initializeDashboard();
    }
});

window.doLogin = async () => {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const errorEl = document.getElementById('login-error');

    if (!user || !pass) {
        errorEl.textContent = 'Preencha todos os campos.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        errorEl.style.display = 'none';
        showLoading("Autenticando...");
        await login(user, pass);
        
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('topbar-username').innerText = user;
        
        await initializeDashboard();
    } catch(err) {
        hideLoading();
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
};

window.confirmLogout = () => { logout(); };
window.openLogoutModal = () => { document.getElementById('logout-confirm-modal').classList.add('active'); };
window.closeLogoutModal = () => { document.getElementById('logout-confirm-modal').classList.remove('active'); };
window.toggleUserMenu = (e) => { 
    e.stopPropagation(); 
    document.getElementById('user-menu-dropdown').classList.toggle('active'); 
};
window.switchSection = (sectionKey, btnEl) => {
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.section-panel').forEach(el=>el.classList.remove('active'));
    btnEl.classList.add('active');
    document.getElementById(`panel-${sectionKey}`).classList.add('active');
};

async function initializeDashboard() {
    showLoading('SINCRONIZANDO COM GLPI...');
    try {
        AppState.globalData = await fetchTicketsFromGLPI();
        AppState.currentFiltered = [...AppState.globalData];
        
        hideLoading();
        
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('topbar-date-filter').style.display = 'flex';
        
        refreshUI();

    } catch(err) {
        hideLoading();
        alert(`Erro Crítico: ${err.message}`);
        logout(); 
    }
}

function refreshUI() {
    const slaPercent = renderGlobalKPIs(AppState.currentFiltered);
    
    renderSLAChart(slaPercent);
    
    // Opcional: Adicione chamadas aqui para renderizar outras tabelas e painéis.
}