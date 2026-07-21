import { login, logout, getSessionToken } from './services/authService.js';
import { fetchTicketsFromGLPI } from './services/glpiService.js';
import {
    renderGlobalDashboard, renderClienteDashboard, renderPorChamadoDashboard,
    renderTecnicosDashboard, renderProdutividadeDashboard, renderBacklogDashboard,
    renderAllPeriodTickets, setAllTicketsPage,
    openTicketList, openTicketDetail, openClientUniversalModal,
    exportPanelToJPG, openExportPdfPopup, exportCSV
} from './components/ui.js';

const AppState = {
    globalData: [],
    currentFiltered: [],
    allTicketsData: []
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
    if (!user || !pass) return;

    try {
        showLoading("Autenticando...");
        await login(user, pass);
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('topbar-username').innerText = user;
        await initializeDashboard();
    } catch(err) {
        hideLoading();
        document.getElementById('login-error').textContent = err.message;
        document.getElementById('login-error').style.display = 'block';
    }
};

window.confirmLogout = () => {
    localStorage.removeItem('glpi_session_token');
    localStorage.removeItem('inovit_user');
    localStorage.clear();
    sessionStorage.clear();
    document.getElementById('logout-confirm-modal').classList.remove('active');
    window.location.href = window.location.pathname + '?nocache=' + new Date().getTime();
};
window.openLogoutModal = () => document.getElementById('logout-confirm-modal').classList.add('active');
window.closeLogoutModal = () => document.getElementById('logout-confirm-modal').classList.remove('active');
window.toggleUserMenu = (e) => { e.stopPropagation(); document.getElementById('user-menu-dropdown').classList.toggle('active'); };
window.closeModal = (id) => { document.getElementById(id).style.display='none'; document.body.style.overflow='auto'; };

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
        AppState.allTicketsData = [...AppState.globalData];

        hideLoading();
        document.getElementById('dashboard').style.display = 'block';
        const dateFilter = document.getElementById('topbar-date-filter');
        if (dateFilter) dateFilter.style.display = 'flex';

        populateFilterDropdowns();
        window.applyFilters(); // chama a versão assíncrona
    } catch(err) {
        hideLoading();
        alert(`Erro Crítico: ${err.message}`);
        logout();
    }
}

function populateFilterDropdowns() {
    const clients = [...new Set(AppState.globalData.map(d=>d.entidade))].sort();
    const selectChamado = document.getElementById('select-chamado-client');
    const selectTecnicos = document.getElementById('select-tecnicos-client');

    if(selectChamado) selectChamado.innerHTML = '<option value="Todos">-- Todos os Clientes --</option>';
    if(selectTecnicos) selectTecnicos.innerHTML = '<option value="Todos">-- Todos os Clientes --</option>';

    clients.forEach(c => {
        if(selectChamado) selectChamado.appendChild(new Option(c, c));
        if(selectTecnicos) selectTecnicos.appendChild(new Option(c, c));
    });
}

window.applyFilters = async () => {
    const fromVal = document.getElementById('filter-from').value;
    const toVal = document.getElementById('filter-to').value;

    try {
        showLoading('Carregando dados filtrados...');
        let newData;
        if (fromVal || toVal) {
            newData = await fetchTicketsFromGLPI(fromVal, toVal);
        } else {
            newData = await fetchTicketsFromGLPI();
        }

        AppState.globalData = newData;

        const filterClient = document.getElementById('select-chamado-client')?.value;
        if (filterClient && filterClient !== "Todos") {
            AppState.currentFiltered = AppState.globalData.filter(d => d.entidade === filterClient);
        } else {
            AppState.currentFiltered = [...AppState.globalData];
        }

        AppState.allTicketsData = [...AppState.currentFiltered];
        setAllTicketsPage(0);

        renderGlobalDashboard(AppState.currentFiltered);
        renderClienteDashboard(AppState.currentFiltered);
        renderPorChamadoDashboard(AppState.currentFiltered);
        renderTecnicosDashboard(AppState.currentFiltered);
        renderProdutividadeDashboard(AppState.currentFiltered);
        renderBacklogDashboard(AppState.currentFiltered);
        renderAllPeriodTickets(AppState.allTicketsData);

        hideLoading();
    } catch (err) {
        hideLoading();
        alert(`Erro ao carregar dados: ${err.message}`);
    }
};

window.clearGlobalFilters = () => {
    document.getElementById('filter-from').value = "";
    document.getElementById('filter-to').value = "";
    if(document.getElementById('select-chamado-client')) document.getElementById('select-chamado-client').value = "Todos";
    if(document.getElementById('select-tecnicos-client')) document.getElementById('select-tecnicos-client').value = "Todos";
    window.applyFilters();
};

window.openGlobalDrilldown = (type) => {};
window.openTicketDetail = (id) => openTicketDetail(id, AppState.globalData);
window.openClientUniversalModal = (client) => openClientUniversalModal(client, AppState.globalData);
window.allTicketsGoToPage = (page) => { setAllTicketsPage(page); renderAllPeriodTickets(AppState.allTicketsData); };

window.exportPanelToJPG = exportPanelToJPG;
window.openExportPdfPopup = openExportPdfPopup;
window.exportCSV = () => exportCSV(AppState.currentFiltered);