// ============================================================
//  RECYCLE AGENTS — avatares.js
//  Sistema de avatares temáticos SVG inline
//  Sem CDN, sem API, funciona 100% offline
// ============================================================

// 12 avatares temáticos de reciclagem — SVG com tema cyberpunk/neon
export const AVATARES = [
  {
    id: "recycle",
    nome: "Símbolo Verde",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00ff6a" stroke-width="2.5"/>
      <g stroke="#00ff6a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 18 L48 30 L32 30 Z"/>
        <path d="M30 30 Q20 34 22 44 Q24 54 34 56 L30 50 L40 50"/>
        <path d="M50 30 Q60 34 58 44 Q56 54 46 56 L50 50 L40 50"/>
        <line x1="40" y1="18" x2="40" y2="14"/>
        <line x1="30" y1="50" x2="26" y2="58"/>
        <line x1="50" y1="50" x2="54" y2="58"/>
      </g>
      <circle cx="40" cy="40" r="4" fill="#00ff6a" opacity="0.6"/>
      <circle cx="40" cy="40" r="38" fill="none" stroke="#00ff6a" stroke-width="1" opacity="0.3"/>
    </svg>`
  },
  {
    id: "garrafa",
    nome: "Garrafa PET",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00c44f" stroke-width="2.5"/>
      <g fill="none" stroke="#00ff6a" stroke-width="2.5" stroke-linecap="round">
        <rect x="35" y="16" width="10" height="6" rx="2" fill="#00ff6a" fill-opacity="0.3"/>
        <path d="M33 22 Q28 26 28 32 L28 58 Q28 62 40 62 Q52 62 52 58 L52 32 Q52 26 47 22 Z" fill="#00ff6a" fill-opacity="0.1"/>
        <path d="M28 38 L52 38"/>
        <path d="M29 46 L51 46"/>
        <path d="M30 52 L50 52"/>
        <ellipse cx="40" cy="32" rx="10" ry="4" fill="#00ff6a" fill-opacity="0.15"/>
      </g>
    </svg>`
  },
  {
    id: "latinha",
    nome: "Latinha",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00d4ff" stroke-width="2.5"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="40" cy="24" rx="14" ry="4" fill="#00d4ff" fill-opacity="0.2" stroke="#00d4ff" stroke-width="2"/>
        <path d="M26 24 L26 58" stroke="#00d4ff" stroke-width="2"/>
        <path d="M54 24 L54 58" stroke="#00d4ff" stroke-width="2"/>
        <ellipse cx="40" cy="58" rx="14" ry="4" fill="#00d4ff" fill-opacity="0.15" stroke="#00d4ff" stroke-width="2"/>
        <rect x="26" y="24" width="28" height="34" fill="#00d4ff" fill-opacity="0.07"/>
        <line x1="32" y1="24" x2="32" y2="58" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>
        <line x1="40" y1="24" x2="40" y2="58" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>
        <line x1="48" y1="24" x2="48" y2="58" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>
        <path d="M36 18 L36 22 Q40 20 44 22 L44 18" stroke="#00d4ff" stroke-width="2.5" fill="none"/>
      </g>
    </svg>`
  },
  {
    id: "papel",
    nome: "Papel",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#ffd700" stroke-width="2.5"/>
      <g stroke-linecap="round" stroke-linejoin="round">
        <path d="M24 18 L50 18 L58 26 L58 62 L24 62 Z" fill="#ffd700" fill-opacity="0.08" stroke="#ffd700" stroke-width="2"/>
        <path d="M50 18 L50 26 L58 26" fill="none" stroke="#ffd700" stroke-width="2"/>
        <line x1="30" y1="34" x2="52" y2="34" stroke="#ffd700" stroke-width="2"/>
        <line x1="30" y1="40" x2="52" y2="40" stroke="#ffd700" stroke-width="2"/>
        <line x1="30" y1="46" x2="52" y2="46" stroke="#ffd700" stroke-width="2"/>
        <line x1="30" y1="52" x2="44" y2="52" stroke="#ffd700" stroke-width="2"/>
        <path d="M28 22 Q24 30 28 34 Q32 22 28 22" fill="#ffd700" fill-opacity="0.3" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: "vidro",
    nome: "Vidro",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#a78bfa" stroke-width="2.5"/>
      <g fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round">
        <path d="M33 16 L47 16 L47 22 Q52 24 54 30 L54 56 Q54 62 40 62 Q26 62 26 56 L26 30 Q28 24 33 22 Z" fill="#a78bfa" fill-opacity="0.08"/>
        <line x1="33" y1="16" x2="33" y2="22"/>
        <line x1="47" y1="16" x2="47" y2="22"/>
        <path d="M28 36 Q34 32 40 36 Q46 40 52 36"/>
        <path d="M28 44 Q34 40 40 44 Q46 48 52 44"/>
        <ellipse cx="36" cy="26" rx="4" ry="2" fill="#a78bfa" fill-opacity="0.4" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: "folha",
    nome: "Folha Verde",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00ff6a" stroke-width="2.5"/>
      <g fill="none" stroke="#00ff6a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 62 Q26 50 24 36 Q22 22 40 18 Q58 22 56 36 Q54 50 40 62 Z" fill="#00ff6a" fill-opacity="0.1"/>
        <path d="M40 62 L40 30"/>
        <path d="M40 40 Q34 35 28 36"/>
        <path d="M40 34 Q46 29 52 30"/>
        <path d="M40 50 Q34 46 30 48"/>
      </g>
    </svg>`
  },
  {
    id: "planeta",
    nome: "Planeta Eco",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00ff6a" stroke-width="2.5"/>
      <circle cx="40" cy="40" r="22" fill="none" stroke="#00ff6a" stroke-width="2"/>
      <ellipse cx="40" cy="40" rx="22" ry="8" fill="none" stroke="#00ff6a" stroke-width="1.5" opacity="0.6"/>
      <line x1="40" y1="18" x2="40" y2="62" stroke="#00ff6a" stroke-width="1.5" opacity="0.5"/>
      <path d="M30 22 Q36 28 30 34 Q24 28 30 22" fill="#00ff6a" fill-opacity="0.3" stroke="none"/>
      <path d="M48 44 Q54 48 50 54 Q44 50 48 44" fill="#00ff6a" fill-opacity="0.2" stroke="none"/>
      <circle cx="40" cy="40" r="3" fill="#00ff6a" opacity="0.8"/>
      <circle cx="40" cy="40" r="22" fill="none" stroke="#00ff6a" stroke-width="0.5" opacity="0.3"/>
    </svg>`
  },
  {
    id: "engrenagem",
    nome: "Eco Tech",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00c44f" stroke-width="2.5"/>
      <g stroke="#00ff6a" stroke-width="2" fill="none" stroke-linecap="round">
        <path d="M40 22 L43 16 L37 16 L40 22"/>
        <path d="M40 58 L43 64 L37 64 L40 58"/>
        <path d="M22 40 L16 43 L16 37 L22 40"/>
        <path d="M58 40 L64 43 L64 37 L58 40"/>
        <path d="M26 26 L21 20 L26 20 L26 26"/>
        <path d="M54 54 L59 60 L54 60 L54 54"/>
        <path d="M26 54 L21 60 L26 60 L26 54"/>
        <path d="M54 26 L59 20 L54 20 L54 26"/>
        <circle cx="40" cy="40" r="16" stroke="#00ff6a" stroke-width="2"/>
        <circle cx="40" cy="40" r="8" fill="#00ff6a" fill-opacity="0.15"/>
        <circle cx="40" cy="40" r="4" fill="#00ff6a" fill-opacity="0.5" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: "gota",
    nome: "Gota Pura",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00d4ff" stroke-width="2.5"/>
      <g stroke="#00d4ff" stroke-width="2.5" fill="none" stroke-linecap="round">
        <path d="M40 16 Q56 32 56 46 Q56 60 40 62 Q24 60 24 46 Q24 32 40 16 Z" fill="#00d4ff" fill-opacity="0.1"/>
        <path d="M32 50 Q36 56 40 56"/>
        <path d="M34 38 Q38 34 40 34"/>
        <ellipse cx="44" cy="30" rx="3" ry="5" fill="#00d4ff" fill-opacity="0.3" stroke="none" transform="rotate(-20 44 30)"/>
      </g>
    </svg>`
  },
  {
    id: "sol",
    nome: "Energia Solar",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#ff9500" stroke-width="2.5"/>
      <g stroke="#ff9500" stroke-width="2.5" fill="none" stroke-linecap="round">
        <circle cx="40" cy="40" r="14" fill="#ff9500" fill-opacity="0.15"/>
        <line x1="40" y1="16" x2="40" y2="22"/>
        <line x1="40" y1="58" x2="40" y2="64"/>
        <line x1="16" y1="40" x2="22" y2="40"/>
        <line x1="58" y1="40" x2="64" y2="40"/>
        <line x1="23" y1="23" x2="27" y2="27"/>
        <line x1="53" y1="53" x2="57" y2="57"/>
        <line x1="57" y1="23" x2="53" y2="27"/>
        <line x1="27" y1="53" x2="23" y2="57"/>
        <circle cx="40" cy="40" r="8" fill="#ff9500" fill-opacity="0.4"/>
        <circle cx="40" cy="40" r="4" fill="#ff9500" fill-opacity="0.8" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: "vento",
    nome: "Energia Eólica",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00ff6a" stroke-width="2.5"/>
      <g stroke="#00ff6a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <line x1="40" y1="28" x2="40" y2="64"/>
        <path d="M40 28 Q34 20 26 22 Q30 30 40 28"/>
        <path d="M40 28 Q50 18 56 24 Q52 32 40 28"/>
        <path d="M40 38 Q32 44 30 52 Q38 50 40 38"/>
        <circle cx="40" cy="28" r="3" fill="#00ff6a" fill-opacity="0.8" stroke="none"/>
      </g>
    </svg>`
  },
  {
    id: "estrela",
    nome: "Eco Star",
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="38" fill="#0a1a0a" stroke="#00ff6a" stroke-width="2.5"/>
      <g stroke="#00ff6a" stroke-width="2" fill="none">
        <path d="M40 16 L44 34 L62 34 L48 44 L54 62 L40 52 L26 62 L32 44 L18 34 L36 34 Z" fill="#00ff6a" fill-opacity="0.12" stroke-linejoin="round"/>
        <circle cx="40" cy="40" r="6" fill="#00ff6a" fill-opacity="0.4" stroke="none"/>
      </g>
    </svg>`
  }
];

// ─── Pegar avatar por índice (baseado no seed) ────────────────
export function getAvatar(seed) {
  if (!seed && seed !== 0) return AVATARES[0];
  // Se for número, usar diretamente como índice
  if (typeof seed === "number") return AVATARES[seed % AVATARES.length];
  // Se for string, converter para índice determinístico
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return AVATARES[Math.abs(hash) % AVATARES.length];
}

// ─── Renderizar avatar como HTML (círculo com SVG interno) ────
export function renderAvatarHtml(seed, size = 40) {
  const av = getAvatar(seed);
  return `<div class="eco-avatar" style="width:${size}px;height:${size}px" data-avatar="${av.id}" title="${av.nome}">
    ${av.svg}
  </div>`;
}

// ─── Lista de todos os avatares (para seleção) ────────────────
export function listarAvatares() {
  return AVATARES;
}