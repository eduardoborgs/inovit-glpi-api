const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://eduardoborgs.github.io/", // Em produção, altere para a URL do seu GitHub Pages
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, App-Token, Session-Token",
};

const STATUS_MAP = {
  1: "Novo", 2: "Em atendimento (Atribuído)", 3: "Em atendimento (Planejado)",
  4: "Pendente", 5: "Solucionado", 6: "Fechado"
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    
    const GLPI_API = env.GLPI_URL; 
    const APP_TOKEN = env.GLPI_APP_TOKEN;

    if (url.pathname === "/login" && request.method === "POST") {
      try {
        const { user, password } = await request.json();
        
        const encodedCreds = btoa(`${user}:${password}`);
        
        const initRes = await fetch(`${GLPI_API}/initSession`, {
          method: 'GET',
          headers: { 
            'Authorization': `Basic ${encodedCreds}`, 
            'App-Token': APP_TOKEN 
          }
        });

        if (!initRes.ok) {
          return new Response(JSON.stringify({ error: "Credenciais inválidas no GLPI" }), { status: 401, headers: CORS_HEADERS });
        }
        
        const data = await initRes.json();
        
        return new Response(JSON.stringify({ session_token: data.session_token, user: user }), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro de infraestrutura do BFF" }), { status: 500, headers: CORS_HEADERS });
      }
    }

    if (url.pathname === "/tickets" && request.method === "GET") {
      const sessionToken = request.headers.get("Authorization")?.replace("Bearer ", "");
      
      if (!sessionToken) {
        return new Response("Acesso negado", { status: 401, headers: CORS_HEADERS });
      }

      try {
        const ticketRes = await fetch(`${GLPI_API}/Ticket?expand_dropdowns=true&range=0-500`, {
          headers: { 
            'Session-Token': sessionToken, 
            'App-Token': APP_TOKEN 
          }
        });

        if (!ticketRes.ok) {
          return new Response("Falha na API GLPI", { status: 500, headers: CORS_HEADERS });
        }
        
        const glpiTickets = await ticketRes.json();
        
        const mappedTickets = glpiTickets.map(t => ({
          id: t.id,
          titulo: t.name,
          entidade: t.entities_id || "Inovit",
          dataAbertura: t.date,
          dataSolucao: t.solvedate || t.closedate || null,
          tipo: t.type === 1 ? "Incidente" : "Requisição",
          categoria: t.itilcategories_id || "Geral > Outros",
          tecnico: t.users_id_assign || "Sem Técnico",
          equipe: t.groups_id_assign || "Central de Suporte",
          requerente: t.users_id_recipient || "Usuário GLPI",
          status: STATUS_MAP[t.status] || "Desconhecido",
          duracao: t.actiontime ? (t.actiontime / 3600) : 0, 
          csat: null 
        }));

        return new Response(JSON.stringify(mappedTickets), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro ao compilar tickets" }), { status: 500, headers: CORS_HEADERS });
      }
    }

    return new Response("Endpoint não encontrado no BFF", { status: 404, headers: CORS_HEADERS });
  }
};