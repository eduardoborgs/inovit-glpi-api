export function cleanEntityName(n) { 
    if(!n) return "Inovit"; 
    if(n.includes(">")) return n.split(">")[1].trim(); 
    return n.trim(); 
}

export function escapeStr(s) { 
    if(!s) return ""; 
    return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;'); 
}