// ============================================================
//  RECYCLE AGENTS — perfil.js
//  Avatar temático eco + picker visual + modal subida de nível
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, onSnapshot, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { AVATARES, renderAvatarHtml, listarAvatares } from "./avatares.js";
import { calcularNivel, TITULOS, avatarIdxPadrao } from "./utils.js";
import { buscarConquistas, verificarConquistas, CONQUISTAS } from "./conquistas.js";

let usuarioUID          = "";
let avatarAtual         = 0;
let avatarTemp          = 0;
let avatarJaRenderizado = false;
let nivelAnterior       = null;
let unsubscribePerfil   = null;

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioUID = user.uid;
  carregarPerfil(user);
});

// ─── Verificar admin via Firestore ────────────────────────────
async function verificarAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

// ─── Mostrar botão admin se for admin ─────────────────────────
async function configurarBotaoAdmin(uid) {
  const isAdmin  = await verificarAdmin(uid);
  const btnAdmin = document.getElementById("btnAdminPanel");
  if (!btnAdmin) return;

  if (isAdmin) {
    btnAdmin.style.display = "flex";
    btnAdmin.addEventListener("click", () => {
      window.location.href = "admin.html";
    });
  } else {
    btnAdmin.style.display = "none";
  }
}

// ─── Buscar posição no ranking ────────────────────────────────
async function buscarPosicaoRanking(uid) {
  try {
    const { buscarParticipantesDaLiga, obterLigaUsuario } = await import("./ligas.js");
    const liga          = await obterLigaUsuario(uid);
    const participantes = await buscarParticipantesDaLiga(liga);
    const pos           = participantes.findIndex(p => p.tipo === "usuario" && p.id === uid);
    return pos >= 0 ? `#${pos + 1}` : "#—";
  } catch (e) {
    console.error("[Perfil] Erro ao buscar posição no ranking:", e);
    return "#—";
  }
}

// ─── Renderizar avatar no perfil ──────────────────────────────
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
  if (avatarTemp === avatarAtual) { fecharPicker(); return; }

  avatarAtual = avatarTemp;

  const avatarEl = document.querySelector(".perfil-avatar-wrap .eco-avatar");
  if (avatarEl) {
    avatarEl.classList.add("swapping");
    setTimeout(() => avatarEl.classList.remove("swapping"), 500);
  }

  avatarJaRenderizado = false;
  renderizarAvatarPerfil(avatarAtual);
  avatarJaRenderizado = true;
  fecharPicker();

  try {
    await updateDoc(doc(db, "usuarios", usuarioUID), { avatarIdx: avatarAtual });
  } catch (e) {
    console.error("[Perfil] Erro ao salvar avatar:", e);
  }
}

function fecharPicker() {
  document.getElementById("avatarPickerOverlay")?.classList.remove("show");
}

// ─── Carregar perfil ──────────────────────────────────────────
async function carregarPerfil(user) {
  if (unsubscribePerfil) {
    unsubscribePerfil();
    unsubscribePerfil = null;
  }

  nivelAnterior       = null;
  avatarJaRenderizado = false;

  document.getElementById("perfilNome").textContent  = user.displayName?.split(" ")[0] || "Agente";
  document.getElementById("perfilEmail").textContent = user.email || "—";

  buscarPosicaoRanking(user.uid).then(pos => {
    document.getElementById("perfilRanking").textContent = pos;
  });

  configurarBotaoAdmin(user.uid);

  // ── Skeleton enquanto dados carregam ──────────────────────
  const xpBar = document.getElementById("perfilXPBar");
  if (xpBar) xpBar.style.width = "0%";

  const skeletonIds = [
    "perfilXP", "perfilNivel", "perfilTitulo",
    "perfilXPProg", "perfilXPPct", "perfilXPMeta",
    "perfilItens", "perfilMissoes", "perfilStreak",
  ];
  skeletonIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.dataset.original = el.textContent;
      el.textContent      = "";
      el.classList.add("skeleton");
      el.style.borderRadius = "4px";
      el.style.minWidth     = "48px";
      el.style.minHeight    = "14px";
      el.style.display      = "inline-block";
    }
  });

  const ref = doc(db, "usuarios", user.uid);

  unsubscribePerfil = onSnapshot(ref, async (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();

    // ── Remover skeleton ao receber dados ─────────────────────
    skeletonIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("skeleton");
        el.style.minWidth  = "";
        el.style.minHeight = "";
        el.style.display   = "";
      }
    });

    // ── Avatar ────────────────────────────────────────────────
    const novoIdx = typeof d.avatarIdx === "number"
      ? d.avatarIdx
      : avatarIdxPadrao(user.uid, AVATARES.length);

    if (!avatarJaRenderizado || novoIdx !== avatarAtual) {
      avatarAtual         = novoIdx;
      avatarJaRenderizado = true;
      renderizarAvatarPerfil(avatarAtual);
    }

    // ── XP e nível ────────────────────────────────────────────
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

    // ── Estatísticas detalhadas ───────────────────────────────
    atualizarStatsDetalhados(d);

    setTimeout(() => {
      document.getElementById("perfilXPBar").style.width = `${porcentagem}%`;
    }, 300);

    // ── Detectar subida de nível ──────────────────────────────
    if (nivelAnterior === null) {
      nivelAnterior = nivel;
    } else if (nivel > nivelAnterior) {
      await exibirModalSubidaNivel(nivelAnterior, nivel, titulo, xp);
      nivelAnterior = nivel;
    } else {
      nivelAnterior = nivel;
    }

    // ── Conquistas ────────────────────────────────────────────
    // Verificar e desbloquear conquistas novas, depois renderizar
    const novas = await verificarConquistas(user.uid, d);
    await renderizarConquistas(user.uid);
    if (novas.length > 0) exibirToastConquista(novas[0]);
  });
}

// ─── Estatísticas detalhadas por material e recordes ─────────
function atualizarStatsDetalhados(d) {
  // ── Breakdown por material ────────────────────────────────
  const materiais = {
    papel:    d.papel    || 0,
    plastico: d.plastico || 0,
    vidro:    d.vidro    || 0,
    metal:    d.metal    || 0,
  };

  const totalMateriais = Object.values(materiais).reduce((a, b) => a + b, 0);

  for (const [mat, val] of Object.entries(materiais)) {
    const pct = totalMateriais > 0 ? Math.round((val / totalMateriais) * 100) : 0;
    const bar = document.getElementById(`bar${mat.charAt(0).toUpperCase() + mat.slice(1)}`);
    const num = document.getElementById(`num${mat.charAt(0).toUpperCase() + mat.slice(1)}`);
    if (bar) setTimeout(() => { bar.style.width = `${pct}%`; }, 300);
    if (num) num.textContent = val;
  }

  // ── Recordes pessoais ─────────────────────────────────────
  const melhorStreak   = Math.max(d.melhorStreak || 0, d.streak || 0);
  const melhorXPSemana = d.melhorXPSemana || d.xpSemana || 0;

  const el = id => document.getElementById(id);
  if (el("recordeStreak"))    el("recordeStreak").textContent    = melhorStreak;
  if (el("recordeXPSemana"))  el("recordeXPSemana").textContent  = melhorXPSemana.toLocaleString("pt-BR");
  if (el("recordeAnalises"))  el("recordeAnalises").textContent  = d.analisesEnviadas  || 0;
  if (el("recordeAprovadas")) el("recordeAprovadas").textContent = d.analisesAprovadas || 0;
}

// ─── Renderizar grid de conquistas ────────────────────────────
async function renderizarConquistas(uid) {
  const grid      = document.getElementById("conquistasGrid");
  const contador  = document.getElementById("conquistasContador");
  if (!grid) return;

  const todas         = await buscarConquistas(uid);
  const desbloqueadas = todas.filter(c => c.desbloqueada).length;

  if (contador) contador.textContent = `${desbloqueadas} / ${todas.length}`;

  // Filtro ativo
  const filtroAtivo = document.querySelector(".conquista-filtro.ativo")?.dataset.cat || "todas";
  const filtradas   = filtroAtivo === "todas"
    ? todas
    : todas.filter(c => c.categoria === filtroAtivo);

  // Ordenar: desbloqueadas primeiro
  filtradas.sort((a, b) => {
    if (a.desbloqueada === b.desbloqueada) return 0;
    return a.desbloqueada ? -1 : 1;
  });

  grid.innerHTML = filtradas.map(c => `
    <div class="conquista-badge ${c.desbloqueada ? "desbloqueada" : "bloqueada"}"
         title="${c.nome}: ${c.desc}">
      <div class="conquista-icone">${c.desbloqueada ? c.icone : "🔒"}</div>
      <div class="conquista-nome">${c.nome}</div>
      ${c.desbloqueada
        ? `<div class="conquista-data">${formatarDataConquista(c.desbloqueadaEm)}</div>`
        : `<div class="conquista-desc">${c.desc}</div>`
      }
    </div>
  `).join("");

  // Eventos dos filtros
  document.querySelectorAll(".conquista-filtro").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".conquista-filtro").forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      renderizarConquistas(uid);
    };
  });
}

// ─── Toast de conquista desbloqueada ─────────────────────────
function exibirToastConquista(conquista) {
  const toast = document.createElement("div");
  toast.className = "conquista-toast";
  toast.innerHTML = `
    <div class="conquista-toast-icone">${conquista.icone}</div>
    <div class="conquista-toast-info">
      <div class="conquista-toast-titulo">Conquista desbloqueada!</div>
      <div class="conquista-toast-nome">${conquista.nome}</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("visivel"), 50);
  setTimeout(() => {
    toast.classList.remove("visivel");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ─── Formatar data de conquista ───────────────────────────────
function formatarDataConquista(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

// ─── Modal de subida de nível ─────────────────────────────────
async function exibirModalSubidaNivel(nivelAntigo, nivelNovo, titulo, xpTotal) {
  const html = `
    <div class="modal-resultado modal-subiu">
      <div class="modal-res-ligas">
        <div class="modal-res-liga">
          <div class="modal-nivel-badge modal-nivel-antigo">
            <span class="modal-nivel-num">${nivelAntigo}</span>
          </div>
          <span style="color:var(--text-muted);font-size:0.7rem;font-family:var(--font-display)">Nível anterior</span>
        </div>
        <div class="modal-res-seta">🚀</div>
        <div class="modal-res-liga modal-res-liga-nova">
          <div class="modal-nivel-badge modal-nivel-novo modal-res-escudo-glow">
            <span class="modal-nivel-num">${nivelNovo}</span>
          </div>
          <span style="color:var(--green-neon);font-size:0.7rem;font-weight:700;font-family:var(--font-display)">Nível atual</span>
        </div>
      </div>
      <div class="modal-res-stats">
        <div class="modal-res-stat"><span>Novo título</span><strong>${titulo}</strong></div>
        <div class="modal-res-stat"><span>XP total</span><strong>${xpTotal.toLocaleString("pt-BR")} XP</strong></div>
      </div>
      <p class="modal-res-msg modal-msg-subiu">
        ⚡ Você subiu para o nível ${nivelNovo} e ganhou o título <strong>${titulo}</strong>!
      </p>
    </div>`;

  await Swal.fire({
    title: "Subiu de Nível!", html,
    confirmButtonText: "Continuar",
    customClass: {
      popup:         "swal-ranking-popup",
      title:         "swal-ranking-title",
      confirmButton: "swal-ranking-btn",
    },
    background:        "#0a1a0f",
    color:             "#e0ffe8",
    showClass:  { popup: "animate__animated animate__fadeInDown animate__faster" },
    hideClass:  { popup: "animate__animated animate__fadeOutUp animate__faster" },
    allowOutsideClick: false,
  });
}

// ─── Logout ───────────────────────────────────────────────────
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  if (unsubscribePerfil) {
    unsubscribePerfil();
    unsubscribePerfil = null;
  }
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