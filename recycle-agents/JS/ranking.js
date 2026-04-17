// ============================================================
//  RECYCLE AGENTS — ranking.js (final)
//  Avatar temático eco, sem tag BOT, sem duplicata de função
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { LIGAS, ORDEM_LIGAS, ESCUDOS, buscarParticipantesDaLiga, obterLigaUsuario, verificarResetSemanal } from "./ligas.js";
import { inicializarBots, atualizarBotsXP } from "./bots.js";
import { renderAvatarHtml } from "./avatares.js";

let usuarioAtual    = null;
let ligaAtual       = "sucata";

// ─── Auth ──────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;

  await inicializarBots();
  await atualizarBotsXP();
  await verificarResetSemanal();

  ligaAtual = await obterLigaUsuario(user.uid);

  renderizarEscudos();
  await carregarRanking();
});

// ─── Escudos estilo Duolingo ──────────────────────────────────
function renderizarEscudos() {
  const container = document.getElementById("escudosLigas");
  if (!container) return;
  container.innerHTML = "";

  ORDEM_LIGAS.forEach(ligaId => {
    const info  = LIGAS[ligaId];
    const ativa = ligaId === ligaAtual;
    const div   = document.createElement("div");
    div.className = `escudo-item${ativa ? " ativa" : " bloqueada"}`;
    div.innerHTML = `
      <div class="escudo-svg${ativa ? " escudo-ativo" : ""}"
           style="filter:${ativa ? "none" : "grayscale(1) brightness(0.3)"}">
        ${ESCUDOS[ligaId]}
      </div>
      <span class="escudo-nome" style="color:${ativa ? info.cor : "rgba(255,255,255,0.18)"}">
        ${ativa ? info.nome : "🔒"}
      </span>
    `;
    container.appendChild(div);
  });
}

// ─── Dias para reset (próxima segunda) ───────────────────────
function diasParaReset() {
  const d = new Date().getDay();
  return d === 0 ? 1 : (8 - d) % 7 || 7;
}

// ─── Carregar ranking da liga ─────────────────────────────────
async function carregarRanking() {
  const container = document.getElementById("rankingContainer");
  if (!container) return;

  container.innerHTML = `<div class="ranking-loading">Carregando...</div>`;

  const participantesRaw = await buscarParticipantesDaLiga(ligaAtual);
  // Filtro de segurança: remover qualquer item undefined ou sem nome
  const participantes = participantesRaw.filter(p => p && p.nome);
  const info          = LIGAS[ligaAtual];
  const total         = participantes.length;
  const nUp           = Math.min(3, total);
  const nDown         = Math.min(3, total);
  const dias          = diasParaReset();

  const ligaAcima  = ORDEM_LIGAS[ORDEM_LIGAS.indexOf(ligaAtual) + 1];
  const ligaAbaixo = ORDEM_LIGAS[ORDEM_LIGAS.indexOf(ligaAtual) - 1];

  // Zona de cada posição — sem rebaixamento na liga mínima
  function zona(pos) {
    if (pos <= nUp)                   return "up";
    if (!ligaAbaixo)                  return "mid"; // liga mínima: ninguém desce
    if (pos > total - nDown)          return "down";
    return "mid";
  }

  const descUp   = ligaAcima  ? `Sobe para ${LIGAS[ligaAcima].nome}`  : "Permanece no topo";
  const descDown = ligaAbaixo ? `Desce para ${LIGAS[ligaAbaixo].nome}` : "Fica na liga";

  // ── Timer reset ─────────────────────────────────────────────
  let html = `
    <div class="reset-timer">
      <svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Reset em <strong>${dias} dia${dias !== 1 ? "s" : ""}</strong> — Top 3 sobem, últimos 3 descem
    </div>`;

  // ── Card explicativo ─────────────────────────────────────────
  html += `
    <div class="liga-explicacao">
      <div class="liga-exp-header">
        <div class="liga-exp-escudo">${ESCUDOS[ligaAtual]}</div>
        <div>
          <div class="liga-exp-nome" style="color:${info.cor}">${info.nome}</div>
          <div class="liga-exp-sub">${total} competidores esta semana</div>
        </div>
      </div>
      <div class="liga-zonas">
        <div class="zona-card zona-up">
          <div class="zona-card-icon">🚀</div>
          <div class="zona-card-titulo">PROMOÇÃO</div>
          <div class="zona-card-desc">Top ${nUp}<br><span>${descUp}</span></div>
        </div>
        <div class="zona-card zona-mid">
          <div class="zona-card-icon">🔒</div>
          <div class="zona-card-titulo">PERMANECE</div>
          <div class="zona-card-desc">Posições ${nUp + 1}–${ligaAbaixo ? total - nDown : total}<br><span>Fica na liga</span></div>
        </div>
        ${ligaAbaixo ? `
        <div class="zona-card zona-down">
          <div class="zona-card-icon">⬇️</div>
          <div class="zona-card-titulo">REBAIXAMENTO</div>
          <div class="zona-card-desc">Últimos ${nDown}<br><span>${descDown}</span></div>
        </div>` : ""}
      </div>
    </div>`;

  // ── Pódio ────────────────────────────────────────────────────
  if (total >= 3) {
    const top3       = participantes.slice(0, 3);
    const ordemPodio = [1, 0, 2];
    const classes    = ["segundo", "primeiro", "terceiro"];
    const medalhas   = ["🥈", "🥇", "🥉"];
    html += `<div class="podio">`;
    ordemPodio.forEach((idx, pv) => {
      const p = top3[idx];
      if (!p) return;
      const isVoce = p.tipo === "usuario" && p.id === usuarioAtual?.uid;
      const avIdx  = typeof p.avatarIdx === "number" ? p.avatarIdx : 0;
      html += `
        <div class="podio-item ${classes[pv]}${isVoce ? " podio-voce" : ""}">
          <div class="podio-coroa">${medalhas[pv]}</div>
          <div class="podio-avatar">${renderAvatarHtml(avIdx, 48)}</div>
          <div class="podio-nome">${p.nome}</div>
          <div class="podio-xp">${p.xpSemana} XP</div>
          <div class="podio-base"></div>
        </div>`;
    });
    html += `</div>`;
  }

  // ── Lista com separadores ────────────────────────────────────
  html += `<div class="ranking-lista">`;
  let zonaAtual = null;

  participantes.forEach((p, i) => {
    const pos    = i + 1;
    const z      = zona(pos);
    const isVoce = p.tipo === "usuario" && p.id === usuarioAtual?.uid;
    const avIdx  = typeof p.avatarIdx === "number" ? p.avatarIdx : 0;

    if (z !== zonaAtual) {
      const seps = {
        up:   { label: "🚀 Zona de Promoção",    cls: "sep-up"   },
        mid:  { label: "🔒 Zona Segura",          cls: "sep-mid"  },
        down: { label: "⬇️ Zona de Rebaixamento", cls: "sep-down" },
      };
      const s = seps[z];
      html += `
        <div class="zona-sep ${s.cls}">
          <div class="zona-sep-linha"></div>
          <span class="zona-sep-label">${s.label}</span>
          <div class="zona-sep-linha"></div>
        </div>`;
      zonaAtual = z;
    }

    const tagZona = {
      up:   `<span class="ztag ztag-up">▲ Sobe</span>`,
      mid:  `<span class="ztag ztag-mid">= Fica</span>`,
      down: `<span class="ztag ztag-down">▼ Desce</span>`,
    }[z];

    html += `
      <div class="ranking-item item-${z}${isVoce ? " voce" : ""}">
        <span class="r-pos">${pos}</span>
        <span class="r-avatar">${renderAvatarHtml(avIdx, 32)}</span>
        <div class="r-info">
          <div class="r-nome">${p.nome}</div>
          <div class="r-tags">
            ${tagZona}
            ${isVoce ? '<span class="tag-voce">você</span>' : ""}
          </div>
        </div>
        <span class="r-xp">${p.xpSemana} XP</span>
      </div>`;
  });
  html += `</div>`;

  // ── Status do usuário ────────────────────────────────────────
  const posUsuario = participantes.findIndex(p => p.tipo === "usuario" && p.id === usuarioAtual?.uid);
  if (posUsuario >= 0) {
    const z = zona(posUsuario + 1);
    // Proteção: ligaAbaixo pode ser undefined na liga mínima
    const nomeAcima  = ligaAcima  ? LIGAS[ligaAcima].nome  : "o topo";
    const nomeAbaixo = ligaAbaixo ? LIGAS[ligaAbaixo].nome : info.nome;
    const statusMsg = {
      up:   `🚀 Você vai subir para <strong>${nomeAcima}</strong>!`,
      mid:  `🔒 Você permanece na liga <strong>${info.nome}</strong>.`,
      down: `⬇️ Você será rebaixado para <strong>${nomeAbaixo}</strong>.`,
    }[z];
    html += `
      <div class="status-usuario status-${z}">
        <span>${statusMsg}</span>
        <strong class="status-pos">#${posUsuario + 1} / ${total}</strong>
      </div>`;
  }

  container.innerHTML = html;
}