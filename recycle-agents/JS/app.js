// ============================================================
//  RECYCLE AGENTS — app.js (com avatar no header)
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { AVATARES, renderAvatarHtml } from "./avatares.js";
// FIX: calcularNivel extraída para utils.js — eliminando a cópia duplicada
// que existia identicamente em app.js, perfil.js e ranking.js.
import { calcularNivel, avatarIdxPadrao } from "./utils.js";
import { buscarNaoLidas, buscarTodas, marcarTodasComoLidas } from "./notificacoes.js";

// ─── Redirecionar se não estiver logado ──────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  iniciarDashboard(user);
});

// ─── Dicas educativas ────────────────────────────────────────
const DICAS = [
  "Uma tonelada de papel reciclado salva até 17 árvores e economiza 26.000 litros de água.",
  "O alumínio pode ser reciclado infinitas vezes sem perder qualidade.",
  "Reciclar vidro economiza 30% da energia necessária para produzi-lo do zero.",
  "O plástico leva até 400 anos para se decompor na natureza.",
  "Uma garrafa PET reciclada pode virar uma camiseta de fibra sintética.",
  "O Brasil é um dos maiores recicladores de latas de alumínio do mundo.",
  "Separar o lixo corretamente aumenta em até 60% a eficiência da reciclagem.",
  "Pilhas e baterias devem ser descartadas em pontos específicos — nunca no lixo comum.",
  "Cada quilo de plástico reciclado evita a emissão de 1,5 kg de CO₂ na atmosfera.",
  "A produção de papel reciclado usa 70% menos água que o papel virgem.",
  "Reciclar uma lata de alumínio economiza energia suficiente para uma TV rodar por 3 horas.",
  "O vidro é 100% reciclável e pode ser reprocessado indefinidamente sem perda de qualidade.",
  "Lave as embalagens antes de reciclar — resíduos de alimento contaminam o processo.",
  "Caixas de pizza com gordura não podem ser recicladas — separe a parte limpa da suja.",
  "Papel higiênico, guardanapo e papel toalha usados não são recicláveis.",
  "Latas de spray vazias são recicláveis como metal — mas jamais perfure ou queime.",
  "A Suécia recicla tanto que importa lixo de outros países para suas usinas de energia.",
  "O Japão transforma resíduos eletrônicos em medalhas olímpicas.",
  "O plástico tipo 1 (PET) e tipo 2 (PEAD) são os mais aceitos nas coletas seletivas brasileiras.",
  "O Brasil gera cerca de 80 milhões de toneladas de resíduos sólidos por ano.",
];

// ─── Atualizar UI do XP ──────────────────────────────────────
function atualizarXP(xp) {
  const { nivel, xpNoNivel, xpProximo, porcentagem } = calcularNivel(xp);
  document.getElementById("xpAtual").textContent     = xp.toLocaleString("pt-BR");
  document.getElementById("nivelAtual").textContent  = nivel;
  document.getElementById("xpProgresso").textContent = `${xpNoNivel} / ${xpProximo} XP`;
  document.getElementById("xpPct").textContent       = `${porcentagem}%`;
  setTimeout(() => {
    document.getElementById("xpBarFill").style.width = `${porcentagem}%`;
  }, 300);
}

// ─── Atualizar missões no dashboard ──────────────────────────
function atualizarMissoes(dados) {
  const itensDia    = dados.itensDia    || 0;
  const plasticoDia = dados.plasticoDia || 0;

  const pct1 = Math.min((itensDia / 3) * 100, 100);
  document.getElementById("missao1Fill").style.width = `${pct1}%`;
  if (pct1 >= 100) document.getElementById("missao1").classList.add("completa");

  const pct2 = Math.min(plasticoDia * 100, 100);
  document.getElementById("missao2Fill").style.width = `${pct2}%`;
  if (pct2 >= 100) document.getElementById("missao2").classList.add("completa");
}

// ─── Renderizar avatar no header ─────────────────────────────
function renderizarAvatarHeader(avatarIdx) {
  const btn = document.querySelector(".header-avatar");
  if (!btn) return;
  btn.innerHTML = renderAvatarHtml(avatarIdx, 40);
}

// ─── Iniciar dashboard ───────────────────────────────────────
function iniciarDashboard(user) {
  const nome = user.displayName || "Agente";
  document.getElementById("nomeUsuario").textContent = nome.split(" ")[0];

  const dicaAleatoria = DICAS[Math.floor(Math.random() * DICAS.length)];
  document.getElementById("dicaTexto").textContent = dicaAleatoria;

  const ref = doc(db, "usuarios", user.uid);
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const dados = snap.data();

    // Usa avatarIdxPadrao de utils.js para manter consistência
    const avatarIdx = typeof dados.avatarIdx === "number"
      ? dados.avatarIdx
      : avatarIdxPadrao(user.uid, AVATARES.length);
    renderizarAvatarHeader(avatarIdx);

    atualizarXP(dados.xp || 0);
    document.getElementById("totalItens").textContent       = dados.itensReciclados  || 0;
    document.getElementById("missoesCompletas").textContent = dados.missoesCompletas || 0;
    atualizarMissoes(dados);
  });

  // Inicia sistema de notificações
  iniciarNotificacoes(user.uid);
}

// ─── Sistema de notificações ──────────────────────────────────
async function iniciarNotificacoes(uid) {
  const badge     = document.getElementById("notifBadge");
  const btnNotif  = document.getElementById("btnNotificacoes");
  const overlay   = document.getElementById("notifOverlay");
  const lista     = document.getElementById("notifLista");
  const btnMarcar = document.getElementById("btnMarcarLidas");

  if (!btnNotif) return;

  // Carregar contagem inicial
  async function atualizarBadge() {
    const naoLidas = await buscarNaoLidas(uid);
    if (naoLidas.length > 0) {
      badge.textContent   = naoLidas.length > 9 ? "9+" : naoLidas.length;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  // Renderizar lista de notificações
  async function renderizarNotificacoes() {
    const todas = await buscarTodas(uid);
    if (todas.length === 0) {
      lista.innerHTML = `<div class="notif-vazia">Nenhuma notificação ainda.</div>`;
      return;
    }

    lista.innerHTML = todas.map(n => `
      <div class="notif-item ${n.lida ? "lida" : "nao-lida"}" data-tipo="${n.tipo}">
        <div class="notif-item-icon">
          ${n.tipo === "aprovado" ? "✅" : "❌"}
        </div>
        <div class="notif-item-conteudo">
          <div class="notif-item-titulo">${n.titulo}</div>
          <div class="notif-item-msg">${n.mensagem}</div>
          <div class="notif-item-data">${formatarDataNotif(n.timestamp)}</div>
        </div>
      </div>
    `).join("");
  }

  // Abrir/fechar painel
  btnNotif.addEventListener("click", async () => {
    const aberto = overlay.style.display !== "none";
    if (aberto) {
      overlay.style.display = "none";
    } else {
      overlay.style.display = "flex";
      await renderizarNotificacoes();
    }
  });

  // Fechar ao clicar fora
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });

  // Marcar todas como lidas
  btnMarcar?.addEventListener("click", async () => {
    await marcarTodasComoLidas(uid);
    await atualizarBadge();
    await renderizarNotificacoes();
  });

  await atualizarBadge();
}

function formatarDataNotif(timestamp) {
  if (!timestamp) return "";
  const d   = new Date(timestamp);
  const ago = Date.now() - timestamp;
  if (ago < 60000)    return "agora";
  if (ago < 3600000)  return `${Math.floor(ago / 60000)}min atrás`;
  if (ago < 86400000) return `${Math.floor(ago / 3600000)}h atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}