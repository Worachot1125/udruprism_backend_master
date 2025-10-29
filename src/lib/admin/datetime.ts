// lib/admin/datetime.ts
export const dtFmtTH = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function parseDbDate(v?: string | null): Date | null {
  if (!v) return null;

  if (/Z$/.test(v) || /[+-]\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(v)) {
    const d = new Date(v.replace(" ", "T") + "Z"); 
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export const formatDateTime = (iso?: string | null) => {
  const d = parseDbDate(iso);
  if (!d) return "-";
  return dtFmtTH.format(d); 
};


export function toLocalInputValue(v?: string | null) {
  const d = parseDbDate(v) ?? new Date(); // แปลงแบบเดียวกัน
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16); 
  return local;
}
