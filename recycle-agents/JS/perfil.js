// ============================================================
//  RECYCLE AGENTS — perfil.js (final)
//  Avatar temático eco + picker visual
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { AVATARES, renderAvatarHtml, listarAvatares } from "./avatares.js";

// ─── Títulos por nível ────────────────────────────────────────
const TITULOS = ["Recruta","Agente","Reciclador","Guardião","Especialista","Veterano","Elite","Mestre","Campeão","Lenda"];

let usuarioUID = "";
let avatarAtual = 0;
let avatarTemp  = 0;

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioUID = user.uid;
  carregarPerfil(user);
});

// ─── Calcular nível ───────────────────────────────────────────
function calcularNivel(xp) {
  let nivel = 1, xpNecessario = 100, xpAcumulado = 0;
  while (xp >= xpAcumulado + xpNecessario) {
    xpAcumulado += xpNecessario;
    nivel++;
    xpNecessario = nivel * 100;
  }
  const xpNoNivel   = xp - xpAcumulado;
  const porcentagem = Math.floor((xpNoNivel / xpNecessario) * 100);
  return { nivel, xpNoNivel, xpProximo: xpNecessario, porcentagem };
}

// ─── Buscar posição no ranking (usa xpSemana + liga, igual ao ranking.js) ────
async function buscarPosicaoRanking(uid) {
  try {
    const { buscarParticipantesDaLiga, obterLigaUsuario } = await import("./ligas.js");
    const liga = await obterLigaUsuario(uid);
    const participantes = await buscarParticipantesDaLiga(liga);
    const pos = participantes.findIndex(p => p.tipo === "usuario" && p.id === uid);
    return pos >= 0 ? `#${pos + 1}` : "#—";
  } catch { return "#—"; }
}

// ─── Renderizar avatar no perfil ─────────────────────────────
function renderizarAvatarPerfil(indice) {
  const el = document.getElementById("perfilAvatar");
  if (!el) return;
  el.innerHTML = `
    <div class="perfil-avatar-wrap">
      ${renderAvatarHtml(indice, 88)}
      <button class="avatar-edit-btn" id="btnAbrirPicker" aria-label="Trocar avatar">
        <svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </button>
    </div>
  `;
  // Listener adicionado apenas uma vez aqui, dentro do renderizar
  document.getElementById("btnAbrirPicker")?.addEventListener("click", abrirPicker);
}

// ─── Abrir picker de avatar ───────────────────────────────────
function abrirPicker() {
  avatarTemp = avatarAtual;
  const overlay = document.getElementById("avatarPickerOverlay");
  if (!overlay) return;

  const grid = document.getElementById("avatarPickerGrid");
  grid.innerHTML = "";
  listarAvatares().forEach((av, i) => {
    const div = document.createElement("div");
    div.className = `avatar-option${i === avatarAtual ? " selecionado" : ""}`;
    div.dataset.idx = i;
    div.innerHTML = `
      ${renderAvatarHtml(i, 48)}
      <span class="avatar-option-nome">${av.nome}</span>
    `;
    div.addEventListener("click", () => {
      document.querySelectorAll(".avatar-option").forEach(o => o.classList.remove("selecionado"));
      div.classList.add("selecionado");
      avatarTemp = i;
    });
    grid.appendChild(div);
  });

  overlay.classList.add("show");
}

// ─── Confirmar seleção de avatar ──────────────────────────────
async function confirmarAvatar() {
  if (avatarTemp === avatarAtual) {
    fecharPicker();
    return;
  }

  avatarAtual = avatarTemp;

  const avatarEl = document.querySelector(".perfil-avatar-wrap .eco-avatar");
  if (avatarEl) {
    avatarEl.classList.add("swapping");
    setTimeout(() => avatarEl.classList.remove("swapping"), 500);
  }

  renderizarAvatarPerfil(avatarAtual);
  fecharPicker();

  try {
    await updateDoc(doc(db, "usuarios", usuarioUID), { avatarIdx: avatarAtual });
  } catch (e) {
    console.warn("Erro ao salvar avatar:", e);
  }
}

function fecharPicker() {
  document.getElementById("avatarPickerOverlay")?.classList.remove("show");
}

// ─── Carregar perfil ──────────────────────────────────────────
async function carregarPerfil(user) {
  document.getElementById("perfilNome").textContent  = user.displayName?.split(" ")[0] || "Agente";
  document.getElementById("perfilEmail").textContent = user.email || "—";

  // Busca posição real do ranking (usa xpSemana + liga)
  const pos = await buscarPosicaoRanking(user.uid);
  document.getElementById("perfilRanking").textContent = pos;

  const ref = doc(db, "usuarios", user.uid);
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();

    // Avatar — sem addEventListener extra aqui (renderizarAvatarPerfil já cuida disso)
    avatarAtual = typeof d.avatarIdx === "number" ? d.avatarIdx : Math.abs(
      user.uid.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
    ) % AVATARES.length;
    renderizarAvatarPerfil(avatarAtual);

    // XP
    const xp = d.xp || 0;
    const { nivel, xpNoNivel, xpProximo, porcentagem } = calcularNivel(xp);
    const titulo = TITULOS[Math.min(nivel - 1, TITULOS.length - 1)];

    document.getElementById("perfilXP").textContent      = xp.toLocaleString("pt-BR");
    document.getElementById("perfilNivel").textContent   = nivel;
    document.getElementById("perfilTitulo").textContent  = titulo;
    document.getElementById("perfilXPProg").textContent  = `${xpNoNivel} / ${xpProximo} XP`;
    document.getElementById("perfilXPPct").textContent   = `${porcentagem}%`;
    document.getElementById("perfilXPMeta").textContent  = `${xpProximo - xpNoNivel} XP para o próximo nível`;
    document.getElementById("perfilItens").textContent   = d.itensReciclados  || 0;
    document.getElementById("perfilMissoes").textContent = d.missoesCompletas || 0;
    document.getElementById("perfilStreak").textContent  = d.streak           || 0;

    setTimeout(() => {
      document.getElementById("perfilXPBar").style.width = `${porcentagem}%`;
    }, 300);
  });
}

// ─── Logout ───────────────────────────────────────────────────
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ─── Picker eventos ───────────────────────────────────────────
document.getElementById("avatarPickerConfirm")?.addEventListener("click", confirmarAvatar);
document.getElementById("avatarPickerCancel")?.addEventListener("click",  fecharPicker);
document.getElementById("avatarPickerOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "avatarPickerOverlay") fecharPicker();
});

// ─── FAQ ──────────────────────────────────────────────────────
const overlay   = document.getElementById("faqOverlay");
const btnAjuda  = document.getElementById("btnAjuda");
const btnFechar = document.getElementById("faqFechar");

btnAjuda?.addEventListener("click",  () => overlay.classList.add("show"));
btnFechar?.addEventListener("click", () => overlay.classList.remove("show"));
overlay?.addEventListener("click",   (e) => { if (e.target === overlay) overlay.classList.remove("show"); });

document.querySelectorAll(".faq-card").forEach(card => {
  card.querySelector(".faq-pergunta")?.addEventListener("click", () => {
    const aberto = card.classList.contains("aberto");
    document.querySelectorAll(".faq-card").forEach(c => c.classList.remove("aberto"));
    if (!aberto) card.classList.add("aberto");
  });
});