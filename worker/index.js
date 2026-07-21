const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://eduardoborgs.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, App-Token, Session-Token, Range",
};

const STATUS_MAP = {
  1: "Novo",
  2: "Em atendimento (Atribuído)",
  3: "Em atendimento (Planejado)",
  4: "Pendente",
  5: "Solucionado",
  6: "Fechado",
};

export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: CORS_HEADERS
      });
    }

    const url = new URL(request.url);

    const GLPI_API = env.GLPI_URL;
    const APP_TOKEN = env.GLPI_APP_TOKEN;

    //=========================================================
    // LOGIN
    //=========================================================

    if (url.pathname === "/login" && request.method === "POST") {

      try {

        const { user, password } = await request.json();

        const encodedCreds = btoa(`${user}:${password}`);

        const response = await fetch(
          `${GLPI_API}/initSession?entities_id=0&is_recursive=true`,
          {
            headers: {
              Authorization: `Basic ${encodedCreds}`,
              "App-Token": APP_TOKEN
            }
          }
        );

        if (!response.ok) {

          const erro = await response.text();

          return new Response(JSON.stringify({
            error: erro
          }), {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS
            }
          });

        }

        const data = await response.json();

        return new Response(JSON.stringify({
          session_token: data.session_token,
          user
        }), {
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        });

      } catch (e) {

        return new Response(JSON.stringify({
          error: e.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        });

      }

    }

    //=========================================================
    // TICKETS
    //=========================================================

    if (url.pathname === "/tickets" && request.method === "GET") {

      const sessionToken = request.headers
        .get("Authorization")
        ?.replace("Bearer ", "");

      if (!sessionToken) {

        return new Response("Token não informado", {
          status: 401,
          headers: CORS_HEADERS
        });

      }

      try {

        const tickets = [];

        let start = 0;
        const pageSize = 200;

        while (true) {

          const end = start + pageSize - 1;

          const response = await fetch(
            `${GLPI_API}/Ticket?expand_dropdowns=true&is_recursive=true&sort=id&order=DESC`,
            {
              headers: {
                "Session-Token": sessionToken,
                "App-Token": APP_TOKEN,
                "Range": `${start}-${end}`
              }
            }
          );

          if (!response.ok) {

            const erro = await response.text();

            return new Response(JSON.stringify({
              error: erro
            }), {
              status: response.status,
              headers: {
                "Content-Type": "application/json",
                ...CORS_HEADERS
              }
            });

          }

          const lote = await response.json();

          if (!Array.isArray(lote) || lote.length === 0) {
            break;
          }

          tickets.push(...lote);

          if (lote.length < pageSize) {
            break;
          }

          start += pageSize;

        }

        tickets.sort((a, b) => b.id - a.id);

        const mappedTickets = tickets.map(t => ({

          id: t.id,

          titulo: t.name,

          entidade:
            t.entities_id ?? "Inovit",

          dataAbertura:
            t.date,

          dataSolucao:
            t.solvedate || t.closedate || null,

          tipo:
            t.type == 1
              ? "Incidente"
              : "Requisição",

          categoria:
            t.itilcategories_id || "Geral",

          tecnico:
            t.users_id_assign || "Sem Técnico",

          equipe:
            t.groups_id_assign || "Central",

          requerente:
            t.users_id_recipient || "Usuário",

          status:
            STATUS_MAP[t.status] || "Desconhecido",

          duracao:
            Number(t.actiontime || 0) / 3600,

          csat: null

        }));

        return new Response(
          JSON.stringify(mappedTickets),
          {
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS
            }
          }
        );

      } catch (e) {

        return new Response(JSON.stringify({
          error: e.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        });

      }

    }

    return new Response(
      "Endpoint não encontrado",
      {
        status: 404,
        headers: CORS_HEADERS
      }
    );

  }

};