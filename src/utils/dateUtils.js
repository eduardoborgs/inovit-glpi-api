export function parseDate(dateString) {
    if (!dateString) return null;
    let d = new Date(dateString.replace(' ', 'T'));
    if (isNaN(d.getTime())) return null;
    return { 
        dia: String(d.getDate()).padStart(2,'0'), 
        mes: String(d.getMonth()+1).padStart(2,'0'), 
        ano: d.getFullYear(), 
        dateObj: d 
    };
}