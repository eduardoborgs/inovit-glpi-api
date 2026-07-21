const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://eduardoborgs.github.io", 
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, App-Token, Session-Token, Range",
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
        
        const bytes = new TextEncoder().encode(`${user}:${password}`);
        const binString = String.fromCodePoint(...bytes);
        const encodedCreds = btoa(binString);
        
        // entities_id=0 + is_recursive=true: a sessão passa a abranger a
        // entidade raiz e TODAS as sub-entidades (clientes). Sem isso a GLPI
        // só devolve chamados da entidade padrão do usuário logado.
        const initRes = await fetch(`${GLPI_API}/initSession?entities_id=0&is_recursive=true`, {
          method: 'GET',
          headers: { 
            'Authorization': `Basic ${encodedCreds}`, 
            'App-Token': APP_TOKEN 
          }
        });

        if (!initRes.ok) {
          const errText = await initRes.text();
          return new Response(JSON.stringify({ error: `GLPI recusou login: ${errText}` }), { status: 401, headers: CORS_HEADERS });
        }
        
        const data = await initRes.json();
        return new Response(JSON.stringify({ session_token: data.session_token, user: user }), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: `Erro CF: ${e.message}` }), { status: 500, headers: CORS_HEADERS });
      }
    }

    if (url.pathname === "/tickets" && request.method === "GET") {
      const sessionToken = request.headers.get("Authorization")?.replace("Bearer ", "");
      if (!sessionToken) return new Response("Acesso negado (Token ausente)", { status: 401, headers: CORS_HEADERS });

      try {
        // is_recursive=true aqui também, para garantir que a própria busca de
        // chamados (e não só o login) considere as sub-entidades.
        const ticketRes = await fetch(`${GLPI_API}/Ticket?expand_dropdowns=true&is_recursive=true`, {
          method: 'GET',
          headers: { 
            'Session-Token': sessionToken, 
            'App-Token': APP_TOKEN,
            'Range': '0-2000' 
          }
        });

        if (!ticketRes.ok) {
          const errText = await ticketRes.text();
          return new Response(JSON.stringify({ 
            error: `Falha ao buscar chamados (Status ${ticketRes.status}): ${errText}` 
          }), { status: ticketRes.status, headers: CORS_HEADERS });
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
        return new Response(JSON.stringify({ error: `Erro no Worker ao processar chamados: ${e.message}` }), { status: 500, headers: CORS_HEADERS });
      }
    }

    return new Response("Endpoint não encontrado no BFF", { status: 404, headers: CORS_HEADERS });
  }
};