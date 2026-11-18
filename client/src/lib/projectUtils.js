export const ENV_COLORS = {
  development: 'bg-sky-400',
  staging: 'bg-amber-400',
  production: 'bg-alert',
};

export function envDotColor(name) {
  return ENV_COLORS[name] || 'bg-mist';
}

export function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2M6.6 6.8C4 8.4 2 12 2 12s4 7 11 7c2 0 3.7-.5 5.1-1.2M17.9 17.4C20.4 15.8 22 12 22 12s-1.6-2.9-4.3-4.9M9.9 5.2C10.6 5.1 11.3 5 12 5c7 0 11 7 11 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function parseEnvText(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const eq = line.indexOf('=');
      if (eq === -1) return null;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return key ? { key, value } : null;
    })
    .filter(Boolean);
}

export function toEnvFormat(variables) {
  return variables.map((v) => `${v.key}=${v.value}`).join('\n');
}

export function csvEscape(value) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsvFormat(variables) {
  const header = 'key,value,protected';
  const rows = variables.map((v) => `${csvEscape(v.key)},${csvEscape(v.value)},${v.is_secret !== false}`);
  return [header, ...rows].join('\n');
}

export function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const PRESET_EXPIRY = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '24 hours', minutes: 1440 },
  { label: '7 days', minutes: 10080 },
];