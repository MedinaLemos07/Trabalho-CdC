// ============================================================
//  RECYCLE AGENTS — ranking.js v5
//  Base: v4 real — fix: obterDivisaoUsuario no import estático
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  LIGAS, ORDEM_LIGAS, ESCUDOS,
  buscarParticipantesDaLiga, obterLigaUsuario,
  obterDivisaoUsuario, verificarResetSemanal
} from "./ligas.js";
import { inicializarBots, atualizarBotsXP, migrarBotsLegados } from "./bots.js";
import { renderAvatarHtml } from "./avatares.js";
import { diasParaReset } from "./utils.js";

let usuarioAtual = null;
let ligaAtual    = "sucata";
let divisaoAtual = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;

  try { await inicializarBots();        } catch (e) { console.error("[Ranking] inicializarBots:", e); }
  try { await migrarBotsLegados();      } catch (e) { console.error("[Ranking] migrarBotsLegados:", e); }
  try { await atualizarBotsXPSeLimpo(); } catch (e) { console.error("[Ranking] atualizarBotsXP:", e); }
  try { await verificarResetSemanal();  } catch (e) { console.error("[Ranking] verificarResetSemanal:", e); }

  try {
    ligaAtual    = await obterLigaUsuario(user.uid);
    divisaoAtual = await obterDivisaoUsuario(user.uid);
  } catch (e) {
    console.error("[Ranking] obterLiga/Divisao:", e);
    ligaAtual    = "sucata";
    divisaoAtual = null;
  }

  try { await exibirModalResultadoSeNecessario(user.uid); } catch (e) {
    console.error("[Ranking] exibirModal:", e);
  }

  renderizarEscudos();
  await carregarRanking();
});

async function atualizarBotsXPSeLimpo() {
  const hoje   = new Date().toISOString().split("T")[0];
  const ultima = localStorage.getItem("ra_botsXpUpdate_v5");
  if (ultima === hoje) return;
  await atualizarBotsXP();
  localStorage.setItem("ra_botsXpUpdate_v5", hoje);
}

// ─── Modal pós-temporada ──────────────────────────────────────
async function exibirModalResultadoSeNecessario(uid) {
  const semanaAtual = obterChaveSemana();
  const userDoc     = await getDoc(doc(db, "usuarios", uid));
  if (!userDoc.exists()) return;

  const data       = userDoc.data();
  const ultimaTemp = data.ultimaTemporada;
  if (!ultimaTemp) return;
  if (ultimaTemp.modalVisto === semanaAtual) return;

  const { ligaAntes, ligaDepois, posicaoFinal, xpFinal } = ultimaTemp;
  if (!ligaAntes || !ligaDepois) return;

  const idxAntes  = ORDEM_LIGAS.indexOf(ligaAntes);
  const idxDepois = ORDEM_LIGAS.indexOf(ligaDepois);
  const subiu     = idxDepois > idxAntes;
  const desceu    = idxDepois < idxAntes;

  let html = "";
  if (subiu) {
    html = `<div class="modal-resultado modal-subiu">
      <div class="modal-res-ligas">
        <div class="modal-res-liga"><div class="modal-res-escudo">${ESCUDOS[ligaAntes]}</div><span style="color:${LIGAS[ligaAntes].cor}">${LIGAS[ligaAntes].nome}</span></div>
        <div class="modal-res-seta">🚀</div>
        <div class="modal-res-liga modal-res-liga-nova"><div class="modal-res-escudo modal-res-escudo-glow">${ESCUDOS[ligaDepois]}</div><span style="color:${LIGAS[ligaDepois].cor}">${LIGAS[ligaDepois].nome}</span></div>
      </div>
      <div class="modal-res-stats">
        <div class="modal-res-stat"><span>Posição final</span><strong>#${posicaoFinal}</strong></div>
        <div class="modal-res-stat"><span>XP acumulado</span><strong>${xpFinal} XP</strong></div>
      </div>
      <p class="modal-res-msg modal-msg-subiu">🌟 Você subiu para ${LIGAS[ligaDepois].nome}!</p>
    </div>`;
  } else if (desceu) {
    html = `<div class="modal-resultado modal-desceu">
      <div class="modal-res-ligas">
        <div class="modal-res-liga"><div class="modal-res-escudo">${ESCUDOS[ligaAntes]}</div><span style="color:${LIGAS[ligaAntes].cor}">${LIGAS[ligaAntes].nome}</span></div>
        <div class="modal-res-seta modal-seta-down">⬇️</div>
        <div class="modal-res-liga"><div class="modal-res-escudo">${ESCUDOS[ligaDepois]}</div><span style="color:${LIGAS[ligaDepois].cor}">${LIGAS[ligaDepois].nome}</span></div>
      </div>
      <div class="modal-res-stats">
        <div class="modal-res-stat"><span>Posição final</span><strong>#${posicaoFinal}</strong></div>
        <div class="modal-res-stat"><span>XP acumulado</span><strong>${xpFinal} XP</strong></div>
      </div>
      <p class="modal-res-msg modal-msg-desceu">💪 Recicle mais e volte para ${LIGAS[ligaAntes].nome}!</p>
    </div>`;
  } else {
    html = `<div class="modal-resultado modal-ficou">
      <div class="modal-res-ligas modal-res-ligas-centro">
        <div class="modal-res-liga"><div class="modal-res-escudo modal-res-escudo-glow">${ESCUDOS[ligaDepois]}</div><span style="color:${LIGAS[ligaDepois].cor}">${LIGAS[ligaDepois].nome}</span></div>
      </div>
      <div class="modal-res-stats">
        <div class="modal-res-stat"><span>Posição final</span><strong>#${posicaoFinal}</strong></div>
        <div class="modal-res-stat"><span>XP acumulado</span><strong>${xpFinal} XP</strong></div>
      </div>
      <p class="modal-res-msg modal-msg-ficou">🔒 Você manteve sua posição em ${LIGAS[ligaDepois].nome}.</p>
    </div>`;
  }

  await Swal.fire({
    title: "Resultado da Temporada", html,
    confirmButtonText: "Continuar",
    customClass: { popup: "swal-ranking-popup", title: "swal-ranking-title", confirmButton: "swal-ranking-btn" },
    background: "#0a1a0f", color: "#e0ffe8",
    allowOutsideClick: false,
  });

  await updateDoc(doc(db, "usuarios", uid), { "ultimaTemporada.modalVisto": semanaAtual });
}

function obterChaveSemana() {
  const now       = new Date();
  const startYear = new Date(now.getFullYear(), 0, 1);
  const weekNum   = Math.ceil(((now - startYear) / 86400000 + startYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

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
      </span>`;
    container.appendChild(div);
  });
}

async function carregarRanking() {
  const container = document.getElementById("rankingContainer");
  if (!container) return;

  container.innerHTML = `<div class="ranking-loading"><span class="spin-icon">⟳</span> Carregando...</div>`;

  let participantesRaw = [];
  try {
    participantesRaw = await buscarParticipantesDaLiga(ligaAtual, divisaoAtual);
  } catch (e) {
    console.error("[Ranking] buscarParticipantes:", e);
    container.innerHTML = `<div class="ranking-loading">⚠️ Erro ao carregar. Tente recarregar a página.</div>`;
    return;
  }

  const participantes = participantesRaw.filter(p => p && p.nome);
  const info          = LIGAS[ligaAtual];
  const total         = participantes.length;
  const nUp           = Math.min(3, total);
  const nDown         = Math.min(3, total);
  const dias          = diasParaReset();

  const ligaAcima  = ORDEM_LIGAS[ORDEM_LIGAS.indexOf(ligaAtual) + 1];
  const ligaAbaixo = ORDEM_LIGAS[ORDEM_LIGAS.indexOf(ligaAtual) - 1];

  const posUsuario = participantes.findIndex(
    p => p.tipo === "usuario" && p.id === usuarioAtual?.uid
  );

  function zona(pos) {
    if (pos <= nUp)          return "up";
    if (!ligaAbaixo)         return "mid";
    if (pos > total - nDown) return "down";
    return "mid";
  }

  const descUp   = ligaAcima  ? `Sobe para ${LIGAS[ligaAcima].nome}`  : "Permanece no topo";
  const descDown = ligaAbaixo ? `Desce para ${LIGAS[ligaAbaixo].nome}` : "Fica na liga";

  let html = `
    <div class="reset-timer">
      <svg class="lucide" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Reset em <strong>${dias} dia${dias !== 1 ? "s" : ""}</strong> — Top 3 sobem, últimos 3 descem
    </div>`;

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

  if (posUsuario >= 0) {
    const z          = zona(posUsuario + 1);
    const nomeAcima  = ligaAcima  ? LIGAS[ligaAcima].nome  : "o topo";
    const nomeAbaixo = ligaAbaixo ? LIGAS[ligaAbaixo].nome : info.nome;
    const statusMsg  = {
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