import { cleanEntityName, escapeStr } from '../utils/stringUtils.js';

let chartInstances = {};
let allTicketsPageSize = 50;
export let allTicketsCurrentPage = 0;
export let activeModalClientKey = "";

export function renderGlobalDashboard(currentFiltered) {
    const totalAcoes = currentFiltered.length;
    const uniqueTickets = new Set(currentFiltered.map(d=>d.id)).size;
    const uniqueClients = new Set(currentFiltered.map(d=>d.entidade));
    const totalClientes = uniqueClients.size;
    
    const naoBacklog = currentFiltered.filter(d=>!d.isBacklog);
    const totalConsidered = naoBacklog.length;
    const dentroSLA = naoBacklog.filter(d=>d.withinSLA===true).length;
    const foraSLA = totalConsidered - dentroSLA;
    const slaPct = totalConsidered > 0 ? ((dentroSLA/totalConsidered)*100).toFixed(1) : "100.0";
    
    const backlogCount = currentFiltered.filter(d=>d.isBacklog).length;
    const pendentesCount = currentFiltered.filter(d=>d.isBacklog && d.status && d.status.toLowerCase().includes('pendente')).length;
    const novosCount = currentFiltered.filter(d=>d.isBacklog && d.status && d.status.toLowerCase().includes('novo')).length;
    
    const csatArray = currentFiltered.filter(d=>d.csat!==null).map(d=>d.csat);
    const csatAvg = csatArray.length > 0 ? (csatArray.reduce((a,b)=>a+b,0)/csatArray.length).toFixed(2) : "4.50";
    const totalAvaliadosCsat = csatArray.length;
    
    const totalTechs = new Set(currentFiltered.filter(d=>d.tecnico!=='').map(d=>d.tecnico)).size;
    const totalCats = new Set(currentFiltered.map(d=>d.categoria)).size;
    
    const horasPorChamado = {}; currentFiltered.forEach(d=>{ if(!horasPorChamado[d.id]) horasPorChamado[d.id]=d.duracao||0; });
    const totalHoras = Object.values(horasPorChamado).reduce((a,b)=>a+b,0);
    const horasFormat = totalHoras.toFixed(2);

    document.getElementById('kpi-sla-global').innerText=`${slaPct}%`;
    document.getElementById('kpi-clientes').innerText=totalClientes;
    document.getElementById('kpi-tickets').innerText=uniqueTickets;
    document.getElementById('kpi-acoes').innerText=totalAcoes;
    document.getElementById('kpi-dentro-sla').innerText=dentroSLA;
    document.getElementById('kpi-fora-sla').innerText=foraSLA;
    document.getElementById('kpi-backlog').innerText=backlogCount;
    document.getElementById('kpi-backlog-desc').innerHTML=`Pendentes: ${pendentesCount} | Novos: ${novosCount}`;
    document.getElementById('kpi-csat').innerText=totalAvaliadosCsat;
    document.getElementById('kpi-csat-desc').innerHTML=`Média CSAT: ${csatAvg}`;
    document.getElementById('kpi-tecnicos-count').innerText=totalTechs;
    document.getElementById('kpi-categorias-count').innerText=totalCats;
    
    let incidentes = currentFiltered.filter(d=>d.tipo.toLowerCase().includes('incidente')).length;
    let requisicoes = totalAcoes - incidentes;
    let incPct = totalAcoes > 0 ? ((incidentes/totalAcoes)*100).toFixed(0) : 0;
    let reqPct = totalAcoes > 0 ? ((requisicoes/totalAcoes)*100).toFixed(0) : 0;
    document.getElementById('kpi-tipo-predominante').innerText=`Incidentes: ${incPct}%`;
    document.getElementById('kpi-tipo-detalhe').innerText=`Req: ${reqPct}%`;
    
    const uniqueTicketCount = Object.keys(horasPorChamado).length;
    const avgHours = uniqueTicketCount > 0 ? (Object.values(horasPorChamado).reduce((a,b)=>a+b,0)/uniqueTicketCount).toFixed(1) : "0.0";
    document.getElementById('kpi-media-horas-chamado').innerText=`${avgHours}h`;
    document.getElementById('kpi-horas-totais').innerText=`${horasFormat}h`;

    Object.values(chartInstances).forEach(chart=>{ if(chart) chart.destroy(); }); chartInstances={};
    
    const slaValue = parseFloat(slaPct);
    const ctxSla = document.getElementById('chart-sla').getContext('2d');
    chartInstances.sla = new Chart(ctxSla,{ type:'bar', data:{ labels:['SLA Global'], datasets:[{ label:'Conformidade (%)', data:[slaValue], backgroundColor:slaValue>=85?'#2e7d32':(slaValue>=70?'#f9a825':'#c62828'), borderRadius:4 }] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(ctx)=>`${ctx.parsed.x.toFixed(1)}%`}}, datalabels:{ anchor:'end', align:'end', color:'#0b1e2e', font:{weight:'bold',size:12}, formatter:(value)=>`${value.toFixed(1)}%` } }, scales:{ x:{min:0,max:100,grid:{color:'rgba(0,0,0,0.05)'}}, y:{grid:{display:false}} } }, plugins:[ChartDataLabels] });

    const ctxSlaStatus = document.getElementById('chart-sla-status').getContext('2d');
    chartInstances.slaStatus = new Chart(ctxSlaStatus,{ type:'doughnut', data:{ labels:['Dentro do SLA','Fora do SLA'], datasets:[{ data:[dentroSLA,foraSLA], backgroundColor:['#2e7d32','#c62828'], borderWidth:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom',labels:{boxWidth:12}}, tooltip:{callbacks:{label:(ctx)=>{ const total=ctx.dataset.data.reduce((a,b)=>a+b,0); const pct=total>0?(ctx.parsed/total*100).toFixed(1):0; return `${ctx.label}: ${ctx.parsed} (${pct}%)`; }}}, datalabels:{ color:'#fff', font:{weight:'bold',size:14}, formatter:(value,ctx)=>{ const total=ctx.dataset.data.reduce((a,b)=>a+b,0); return total>0?`${(value/total*100).toFixed(1)}%`:'0%'; } } } }, plugins:[ChartDataLabels] });

    const tipoPizza = {}; currentFiltered.forEach(d=>{ const t=d.tipo||'Outros'; tipoPizza[t]=(tipoPizza[t]||0)+1; });
    const ctxTipo = document.getElementById('chart-tipo').getContext('2d');
    chartInstances.tipo = new Chart(ctxTipo,{ type:'pie', data:{ labels:Object.keys(tipoPizza), datasets:[{ data:Object.values(tipoPizza), backgroundColor:['#0474c4','#f57c00','#2e7d32','#c62828','#6a1b9a','#f9a825'], borderWidth:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom',labels:{boxWidth:12}}, datalabels:{ color:'#fff', font:{weight:'bold',size:12}, formatter:(value,ctx)=>{ const total=ctx.dataset.data.reduce((a,b)=>a+b,0); return total>0?`${(value/total*100).toFixed(1)}%`:'0%'; } } } }, plugins:[ChartDataLabels] });

    const avgHoursVal = parseFloat(avgHours);
    const ctxMediaHoras = document.getElementById('chart-media-horas').getContext('2d');
    chartInstances.mediaHoras = new Chart(ctxMediaHoras,{ type:'bar', data:{ labels:['Média Horas/Chamado'], datasets:[{ label:'Horas', data:[avgHoursVal], backgroundColor:'#0474c4', borderRadius:4 }] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'end', color:'#0b1e2e', font:{weight:'bold',size:12}, formatter:(value)=>`${value.toFixed(1)}h` } }, scales:{ x:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.05)'}}, y:{grid:{display:false}} } }, plugins:[ChartDataLabels] });

    const mensalMap = {}; currentFiltered.forEach(d=>{ if(d.dataAbertura) { const key=`${d.dataAbertura.ano}-${String(d.dataAbertura.mes).padStart(2,'0')}`; if(!mensalMap[key]) mensalMap[key]=0; mensalMap[key]++; } });
    const sortedKeys = Object.keys(mensalMap).sort();
    const labels = sortedKeys.map(k=>{ const [ano,mes]=k.split('-'); const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${meses[parseInt(mes)-1]}/${ano}`; });
    const ctxMensal = document.getElementById('chart-mensal').getContext('2d');
    chartInstances.mensal = new Chart(ctxMensal,{ type:'line', data:{ labels:labels, datasets:[{ label:'Chamados', data:sortedKeys.map(k=>mensalMap[k]), borderColor:'#0474c4', backgroundColor:'rgba(4,116,196,0.1)', fill:true, tension:0.3, pointBackgroundColor:'#0474c4', pointRadius:4, borderWidth:2 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'top', color:'#0b1e2e', font:{weight:'bold',size:10} } }, scales:{ x:{grid:{display:false}, ticks:{maxRotation:45}}, y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.05)'}} } }, plugins:[ChartDataLabels] });

    const csatDist = {}; currentFiltered.forEach(d=>{ if(d.csat!==null) csatDist[d.csat]=(csatDist[d.csat]||0)+1; });
    const csatLabels = Object.keys(csatDist).sort((a,b)=>a-b);
    const ctxCsat = document.getElementById('chart-csat-dist').getContext('2d');
    chartInstances.csatDist = new Chart(ctxCsat,{ type:'bar', data:{ labels:csatLabels.map(n=>`Nota ${n}`), datasets:[{ label:'Quantidade', data:csatLabels.map(k=>csatDist[k]), backgroundColor:['#c62828','#f9a825','#f9a825','#2e7d32','#2e7d32'], borderRadius:4 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'top', color:'#0b1e2e', font:{weight:'bold',size:12} } }, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.05)'}} } }, plugins:[ChartDataLabels] });
}

export function renderClienteDashboard(currentFiltered) {
    const grid = document.getElementById('grid-clientes-cards'); grid.innerHTML='';
    const clientMap={}; 
    currentFiltered.forEach(d=>{ 
        if(!clientMap[d.entidade]) clientMap[d.entidade]={vol:0,dentro:0,backlog:0,pendentes:0,novos:0,horas:0};
        const m=clientMap[d.entidade]; 
        m.vol++; 
        if(d.withinSLA) m.dentro++; 
        if(d.isBacklog) m.backlog++; 
        if(d.status && d.status.toLowerCase().includes('pendente')) m.pendentes++; 
        if(d.status && d.status.toLowerCase().includes('novo')) m.novos++; 
        m.horas += d.duracao||0; 
    });
    Object.keys(clientMap).sort((a,b)=>clientMap[b].vol-clientMap[a].vol).forEach(c=>{
        const m=clientMap[c]; const considered=m.vol-m.backlog; const pct=considered>0?((m.dentro/considered)*100).toFixed(1):"100.0"; const horasFormat=m.horas.toFixed(1);
        const card=document.createElement('div'); card.className='client-summary-card'; card.setAttribute('onclick', `window.openClientUniversalModal('${escapeStr(c)}')`);
        card.innerHTML=`<div class="client-card-title">${cleanEntityName(c)}</div><div class="client-metric-row"><span class="lbl">Volume:</span><span class="val">${m.vol}</span></div><div class="client-metric-row"><span class="lbl">SLA:</span><span class="val" style="color:${pct>=85?'var(--success)':'var(--warn)'}">${pct}%</span></div><div class="client-metric-row"><span class="lbl">Backlog / Pendentes:</span><span class="val">${m.backlog} / ${m.pendentes}</span></div><div class="client-metric-row"><span class="lbl">Horas:</span><span class="val">${horasFormat}h</span></div><div style="margin-top:8px; font-size:11px; font-family:'JetBrains Mono'; text-align:right; color:var(--blue-primary);">VER DETALHES →</div>`;
        grid.appendChild(card);
    });
}

export function renderPorChamadoDashboard(currentFiltered) {
    const filterClient = document.getElementById('select-chamado-client').value;
    let localSet = currentFiltered;
    if(filterClient && filterClient!=="Todos") localSet=currentFiltered.filter(d=>d.entidade===filterClient);
    
    const tbody = document.querySelector('#table-top-categories tbody'); tbody.innerHTML='';
    const weekdayCounts=[0,0,0,0,0,0,0];
    localSet.forEach(d=>{ if(d.dataAbertura && d.dataAbertura.dateObj){ const dayIndex=d.dataAbertura.dateObj.getDay(); weekdayCounts[dayIndex]++; } });
    const maxDayVol=Math.max(...weekdayCounts)||1;
    for(let i=0;i<7;i++){ const bar=document.getElementById(`bar-day-${i}`); const valSpan=document.getElementById(`bar-val-${i}`); if(bar){ const pctHeight=(weekdayCounts[i]/maxDayVol)*100; bar.style.height=`${Math.max(pctHeight*0.8,2)}%`; bar.style.backgroundColor=weekdayCounts[i]>0?'var(--blue-primary)':'#d4e0e8'; if(valSpan){ valSpan.textContent=weekdayCounts[i]>0?weekdayCounts[i]:'0'; valSpan.style.color=weekdayCounts[i]>0?'var(--text-primary)':'var(--text-muted)'; } } }
    
    const catMap={}; localSet.forEach(d=>catMap[d.categoria]=(catMap[d.categoria]||0)+1);
    const totalAcoes=localSet.length;
    Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]).slice(0,20).forEach((cat,index)=>{ 
        const vol=catMap[cat]; const pct=totalAcoes>0?((vol/totalAcoes)*100).toFixed(1):"0.0"; 
        let grau="Baixo", badgeClass="success"; if(vol>150){ grau="Crítico"; badgeClass="danger"; } else if(vol>50){ grau="Moderado"; badgeClass="warn"; } 
        const tr=document.createElement('tr'); tr.innerHTML=`<td style="font-family:'JetBrains Mono'; font-weight:600;">#${index+1}</td><td>${cat}</td><td style="font-family:'JetBrains Mono';">${vol}</td><td>${pct}%</td><td><span class="status-badge ${badgeClass}">${grau}</span></td>`; tbody.appendChild(tr); 
    });
}

export function renderTecnicosDashboard(currentFiltered) {
    const filterClient=document.getElementById('select-tecnicos-client').value;
    let localSet=currentFiltered;
    if(filterClient && filterClient!=="Todos") localSet=currentFiltered.filter(d=>d.entidade===filterClient);
    
    const grid=document.getElementById('grid-tecnicos-cards'); grid.innerHTML='';
    const techMap={}; 
    localSet.forEach(d=>{ 
        if(d.tecnico) {
            if(!techMap[d.tecnico]) techMap[d.tecnico]={vol:0,dentro:0,csatSum:0,csatCount:0,clientesAtendidos:new Set(),backlog:0,horas:0};
            const m=techMap[d.tecnico]; m.vol++; if(d.withinSLA) m.dentro++; if(d.isBacklog) m.backlog++; 
            if(d.csat!==null){m.csatSum+=d.csat; m.csatCount++;} m.clientesAtendidos.add(d.entidade); m.horas += d.duracao||0; 
        }
    });
    
    Object.keys(techMap).sort((a,b)=>techMap[b].vol-techMap[a].vol).forEach(t=>{
        const m=techMap[t]; const considered=m.vol-m.backlog; const sla=considered>0?((m.dentro/considered)*100).toFixed(1):"100.0"; const horasFormat=m.horas.toFixed(1); const csatMedia=m.csatCount>0?(m.csatSum/m.csatCount).toFixed(2):'N/A';
        const card=document.createElement('div'); card.className='client-summary-card'; card.setAttribute('onclick', `window.openTechnicianDetail('${escapeStr(t)}')`);
        card.innerHTML=`<div class="client-card-title">👨‍💻 ${t}</div><div class="client-metric-row"><span class="lbl">Chamados:</span><span class="val">${m.vol}</span></div><div class="client-metric-row"><span class="lbl">SLA:</span><span class="val" style="color:${sla>=85?'var(--success)':'var(--warn)'}">${sla}%</span></div><div class="client-metric-row"><span class="lbl">Clientes:</span><span class="val" style="color:var(--blue-primary);">${m.clientesAtendidos.size}</span></div><div class="client-metric-row"><span class="lbl">Horas:</span><span class="val">${horasFormat}h</span></div><div class="client-metric-row"><span class="lbl">Média CSAT:</span><span class="val" style="color:var(--purple); cursor:pointer;" onclick="event.stopPropagation(); window.openTechEvaluatedTickets('${escapeStr(t)}')">⭐ ${csatMedia}</span></div>`;
        grid.appendChild(card);
    });
}

export function renderProdutividadeDashboard(currentFiltered) {
    const tecnicos = new Set(currentFiltered.filter(d=>d.tecnico!=='').map(d=>d.tecnico));
    document.getElementById('prod-tecnicos-ativos').innerText = tecnicos.size;
    let totalHorasProd = currentFiltered.reduce((a,b)=>a+(b.duracao||0),0);
    
    let diasUteis = 0;
    if (currentFiltered.length > 0) {
        const dates = currentFiltered.map(d=>d.dataAbertura?.dateObj).filter(d=>d);
        if(dates.length > 0) {
            let current = new Date(Math.min(...dates.map(d=>d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d=>d.getTime())));
            while (current <= maxDate) {
                const dia = current.getDay();
                if (dia !== 0 && dia !== 6) diasUteis++;
                current.setDate(current.getDate() + 1);
            }
        }
    }
    const cargaHorariaTotal = tecnicos.size * 8 * diasUteis;
    const ocupacao = cargaHorariaTotal > 0 ? Math.min(100, (totalHorasProd / cargaHorariaTotal) * 100) : 0;
    document.getElementById('prod-ocupacao').innerText = `${ocupacao.toFixed(0)}%`;

    const clientHoras = {}; currentFiltered.forEach(d=>{ const c=d.entidade; clientHoras[c]=(clientHoras[c]||0)+(d.duracao||0); });
    const listClientHoras = document.getElementById('prod-top-clientes-horas'); listClientHoras.innerHTML='';
    Object.entries(clientHoras).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([nome, valor], idx)=>{ const li=document.createElement('li'); li.setAttribute('onclick', `window.openClientUniversalModal('${escapeStr(nome)}')`); li.innerHTML=`<span class="rank">#${idx+1}</span><span class="name">${cleanEntityName(nome)}</span><span class="value">${valor.toFixed(2)}</span>`; listClientHoras.appendChild(li); });
}

export function renderBacklogDashboard(currentFiltered) {
    const summaryGrid=document.getElementById('grid-backlog-summary-cards'); summaryGrid.innerHTML='';
    const backlogRows=currentFiltered.filter(d=>d.isBacklog);
    const clientBacklogMap={}; backlogRows.forEach(d=>clientBacklogMap[d.entidade]=(clientBacklogMap[d.entidade]||0)+1);
    Object.keys(clientBacklogMap).sort((a,b)=>clientBacklogMap[b]-clientBacklogMap[a]).forEach(c=>{
        const vol=clientBacklogMap[c];
        const card=document.createElement('div'); card.className='client-summary-card'; card.setAttribute('onclick', `window.drilldownBacklogIsolated('${escapeStr(c)}')`);
        card.innerHTML=`<div class="client-card-title">${cleanEntityName(c)}</div><div class="client-metric-row"><span class="lbl">Backlog:</span><span class="val" style="color:${vol>10?'var(--danger)':'var(--warn)'}; font-weight:700;">${vol} chamados</span></div><div style="margin-top:8px; font-size:11px; text-align:right; color:var(--text-muted);">EXIBIR CHAMADOS ↓</div>`;
        summaryGrid.appendChild(card);
    });
}

export function renderAllPeriodTickets(allTicketsData) {
    const tbody=document.getElementById('all-tickets-tbody'); if(!tbody) return;
    const total=allTicketsData.length; const totalPages=Math.ceil(total/allTicketsPageSize);
    const start=allTicketsCurrentPage*allTicketsPageSize; const end=Math.min(start+allTicketsPageSize,total);
    const pageData=allTicketsData.slice(start,end);
    tbody.innerHTML='';
    if(pageData.length===0){ tbody.innerHTML=`<tr><td colspan="8" class="text-center" style="padding:40px; color:var(--text-muted);">Nenhum chamado encontrado.</td></tr>`; }
    else{ pageData.forEach(d=>{ const tr=document.createElement('tr'); tr.className='clickable-row'; tr.setAttribute('onclick', `window.openTicketDetail('${escapeStr(d.id)}')`); let badgeClass=d.withinSLA===true?'success':'danger'; let badgeLabel=d.withinSLA===true?'DENTRO':'FORA'; if(d.isBacklog){badgeClass='warn'; badgeLabel='BACKLOG';} tr.innerHTML=`<td style="font-family:'JetBrains Mono';">${d.id}</td><td>${cleanEntityName(d.entidade)}</td><td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${d.titulo}">${d.titulo}</td><td>${d.dataAbertura?.dia}/${d.dataAbertura?.mes}/${d.dataAbertura?.ano}</td><td>${d.dataSolucao?`${d.dataSolucao.dia}/${d.dataSolucao.mes}/${d.dataSolucao.ano}`:'ABERTO'}</td><td>${d.tecnico}</td><td>${d.equipe}</td><td><span class="status-badge ${badgeClass}">${badgeLabel}</span></td>`; tbody.appendChild(tr); }); }
    document.getElementById('all-tickets-info').innerText=`Mostrando ${total>0?start+1:0}–${end} de ${total}`;
    document.getElementById('all-tickets-buttons').innerHTML=`<button onclick="window.allTicketsGoToPage(${allTicketsCurrentPage-1})" ${allTicketsCurrentPage===0?'disabled':''}>◀</button><span style="padding:4px 12px; font-weight:600;">${totalPages>0?allTicketsCurrentPage+1:0} / ${totalPages||1}</span><button onclick="window.allTicketsGoToPage(${allTicketsCurrentPage+1})" ${allTicketsCurrentPage>=totalPages-1?'disabled':''}>▶</button>`;
}

export function setAllTicketsPage(page) { allTicketsCurrentPage = page; }

export function openTicketList(title, dataSource, columns, clickable=true) {
    const modal=document.getElementById('modal-ticket-list');
    document.getElementById('ticket-list-title').innerText=title;
    document.getElementById('ticket-list-thead').innerHTML=columns.map(c=>`<th>${c}</th>`).join('');
    const pageSize=50; let currentPage=0; const totalPages=Math.ceil(dataSource.length/pageSize);
    
    function renderPage(page){ 
        currentPage=page; const start=page*pageSize; const end=Math.min(start+pageSize,dataSource.length); const pageData=dataSource.slice(start,end); 
        const tbody=document.getElementById('ticket-list-tbody'); tbody.innerHTML=''; 
        if(pageData.length===0){ tbody.innerHTML=`<tr><td colspan="${columns.length}" class="text-center" style="padding:40px;">Nenhum registro encontrado.</td></tr>`; } 
        else { 
            pageData.forEach(row=>{ 
                const tr=document.createElement('tr'); if(clickable && row.id){ tr.className='clickable-row'; tr.setAttribute('onclick', `window.openTicketDetail('${escapeStr(row.id)}')`); } 
                const cells=columns.map(col=>{ 
                    let val=row[col]!==undefined?row[col]:''; 
                    if(col==='sla') return row.isBacklog ? '<span class="status-badge warn">BACKLOG</span>' : (row.withinSLA===true?'<span class="status-badge success">DENTRO</span>':'<span class="status-badge danger">FORA</span>'); 
                    if(col==='dataAbertura' && row.dataAbertura) return `${row.dataAbertura.dia}/${row.dataAbertura.mes}/${row.dataAbertura.ano}`; 
                    if(col==='dataSolucao' && row.dataSolucao) return `${row.dataSolucao.dia}/${row.dataSolucao.mes}/${row.dataSolucao.ano}`; 
                    if(col==='entidade') return cleanEntityName(row.entidade); 
                    if(col==='csat') return row.csat!==null?`⭐ ${row.csat}`:'—'; 
                    if(col==='duracao') return (row.duracao||0).toFixed(1)+'h'; 
                    return val; 
                }); 
                tr.innerHTML=cells.map(c=>`<td>${c}</td>`).join(''); tbody.appendChild(tr); 
            }); 
        } 
        document.getElementById('ticket-list-info').innerText=`Mostrando ${start+1}–${end} de ${dataSource.length}`; 
        document.getElementById('ticket-list-buttons').innerHTML=`<button onclick="window.renderTicketPage(${currentPage-1})" ${currentPage===0?'disabled':''}>◀</button><span style="padding:4px 12px; font-weight:600;">${currentPage+1} / ${totalPages||1}</span><button onclick="window.renderTicketPage(${currentPage+1})" ${currentPage>=totalPages-1?'disabled':''}>▶</button>`; 
    }
    
    window.renderTicketPage = function(page){ if(page>=0 && page<totalPages) renderPage(page); };
    renderPage(0); modal.style.display='block'; document.body.style.overflow='hidden';
}

export function openTicketDetail(ticketId, globalData) {
    const ticket=globalData.find(d=>String(d.id)===String(ticketId)); 
    if(!ticket){ alert('Chamado não encontrado.'); return; }
    
    document.getElementById('ticket-detail-title').innerText=`Chamado #${ticket.id}`;
    document.getElementById('ticket-detail-content').innerHTML=`<div class="detail-grid"><div class="detail-item"><span class="label">ID</span><span class="value mono">${ticket.id}</span></div><div class="detail-item"><span class="label">Título</span><span class="value">${ticket.titulo}</span></div><div class="detail-item"><span class="label">Cliente / Entidade</span><span class="value">${cleanEntityName(ticket.entidade)}</span></div><div class="detail-item"><span class="label">Tipo</span><span class="value">${ticket.tipo}</span></div><div class="detail-item"><span class="label">Categoria</span><span class="value">${ticket.categoria}</span></div><div class="detail-item"><span class="label">Data Abertura</span><span class="value mono">${ticket.dataAbertura?.dia}/${ticket.dataAbertura?.mes}/${ticket.dataAbertura?.ano}</span></div><div class="detail-item"><span class="label">Data Solução</span><span class="value mono">${ticket.dataSolucao?`${ticket.dataSolucao.dia}/${ticket.dataSolucao.mes}/${ticket.dataSolucao.ano}`:'ABERTO'}</span></div><div class="detail-item"><span class="label">Técnico</span><span class="value">${ticket.tecnico||'N/A'}</span></div><div class="detail-item"><span class="label">Equipe</span><span class="value">${ticket.equipe}</span></div><div class="detail-item"><span class="label">Requerente</span><span class="value">${ticket.requerente}</span></div><div class="detail-item"><span class="label">Status</span><span class="value">${ticket.status||'—'}</span></div><div class="detail-item"><span class="label">Duração (horas)</span><span class="value mono">${(ticket.duracao||0).toFixed(2)}h</span></div><div class="detail-item"><span class="label">CSAT</span><span class="value">${ticket.csat!==null?`⭐ ${ticket.csat}`:'Não avaliado'}</span></div><div class="detail-item"><span class="label">SLA</span><span class="value">${ticket.isBacklog?'BACKLOG':(ticket.withinSLA===true?'✅ DENTRO':'❌ FORA')}</span></div></div>`;
    document.getElementById('modal-ticket-detail').style.display='block'; document.body.style.overflow='hidden';
}

export function openClientUniversalModal(clientKey, globalData) {
    activeModalClientKey = clientKey;
    const clientRows = globalData.filter(d=>d.entidade===clientKey);
    const total = clientRows.length; 
    const nonBacklogRows = clientRows.filter(d=>!d.isBacklog);
    const dentro = nonBacklogRows.filter(d=>d.withinSLA===true).length;
    const sla = nonBacklogRows.length>0?((dentro/nonBacklogRows.length)*100).toFixed(1):"100.0";
    
    document.getElementById('modal-client-name').innerText=`VISÃO UNIVERSAL: ${cleanEntityName(clientKey)}`;
    
    document.getElementById('modal-client-teams-section').style.display='block';
    document.getElementById('modal-financial-section').style.display='none';
    
    const kpiContainer=document.getElementById('modal-client-kpis');
    kpiContainer.innerHTML=`<div class="kpi-card accent-blue"><div class="kpi-lbl">Total Atendidos</div><div class="kpi-val">${total}</div></div><div class="kpi-card accent-blue"><div class="kpi-lbl">SLA</div><div class="kpi-val">${sla}%</div></div>`;
    
    document.getElementById('modal-client-universal').style.display='block'; document.body.style.overflow='hidden';
}

function getPeriodLabel() { return "Período Analisado"; }
function addPeriodHeaderToExport(container){ const header=document.createElement('div'); header.className='export-period-header'; header.innerHTML=`<span class="period-label">📅 ${getPeriodLabel()}</span>`; container.prepend(header); header.style.display='block'; return header; }

export function exportPanelToJPG(panelId, filenameLabel) {
    const el=document.getElementById(panelId); if(!el) return; 
    const header=addPeriodHeaderToExport(el); const ignored=el.querySelectorAll('[data-html2canvas-ignore="true"]'); ignored.forEach(item=>item.removeAttribute('data-html2canvas-ignore'));
    const origHeight=el.style.height; const origOverflow=el.style.overflow; el.style.height='auto'; el.style.overflow='visible';
    
    html2canvas(el,{ allowTaint:true, useCORS:true, backgroundColor:'#eef3f6', scale:2 })
        .then(canvas=>{ 
            el.style.height=origHeight; el.style.overflow=origOverflow; ignored.forEach(item=>item.setAttribute('data-html2canvas-ignore','true')); if(header) header.remove(); 
            const a=document.createElement('a'); a.download=`INOVIT_${filenameLabel}.jpg`; a.href=canvas.toDataURL('image/jpeg',0.95); a.click(); 
        });
}

export function openExportPdfPopup(panelId, filenameLabel) {
    const el=document.getElementById(panelId); if(!el) return; 
    const header=addPeriodHeaderToExport(el); const ignored=el.querySelectorAll('[data-html2canvas-ignore="true"]'); ignored.forEach(item=>item.removeAttribute('data-html2canvas-ignore'));
    const origHeight=el.style.height; const origOverflow=el.style.overflow; el.style.height='auto'; el.style.overflow='visible';
    
    html2canvas(el,{ allowTaint:true, useCORS:true, backgroundColor:'#eef3f6', scale:2 })
        .then(canvas=>{ 
            el.style.height=origHeight; el.style.overflow=origOverflow; ignored.forEach(item=>item.setAttribute('data-html2canvas-ignore','true')); if(header) header.remove(); 
            const imgData=canvas.toDataURL('image/jpeg',0.95); const {jsPDF}=window.jspdf; const pdf=new jsPDF('p','mm','a4'); 
            const pageWidth=210; const imgWidth=pageWidth; const imgHeight=(canvas.height*imgWidth)/canvas.width; 
            pdf.addImage(imgData,'JPEG',0,0,imgWidth,imgHeight); pdf.save(`INOVIT_${filenameLabel}.pdf`); 
        });
}

export function exportCSV(currentFiltered) {
    if(currentFiltered.length===0){ alert('Não há dados filtrados para exportar.'); return; }
    const headers=['ID','Título','Entidade','Abertura','Tipo','Categoria','Técnico','Duração (h)','SLA','Status'];
    const rows=currentFiltered.map(d=>[d.id,d.titulo,d.entidade,`${d.dataAbertura?.dia}/${d.dataAbertura?.mes}/${d.dataAbertura?.ano}`,d.tipo,d.categoria,d.tecnico,(d.duracao||0).toFixed(2),d.isBacklog?'BACKLOG':(d.withinSLA?'DENTRO':'FORA'),d.status||'']);
    const csvContent=[headers.join(';'),...rows.map(r=>r.join(';'))].join('\n');
    const blob=new Blob([csvContent],{type:'text/csv;charset=utf-8;'}); const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`INOVIT_Export.csv`; link.click(); URL.revokeObjectURL(link.href);
}