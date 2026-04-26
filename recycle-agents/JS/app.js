// ============================================================
//  RECYCLE AGENTS — app.js
//  v3.0 — notificações + histórico + enviados + streak msg
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { AVATARES, renderAvatarHtml } from "./avatares.js";
import { calcularNivel, avatarIdxPadrao } from "./utils.js";
import {
  buscarNaoLidas, buscarTodas, marcarTodasComoLidas,
  verificarNotificacoesAutomaticas, ICONES_NOTIF
} from "./notificacoes.js";

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

// ─── Ícones por tipo de notificação ──────────────────────────
const ICONE_POR_TIPO = {
  aprovado:            "✅",
  rejeitado:           "❌",
  nivel_up:            "⚡",
  streak_risco:        "🔥",
  streak_quebrado:     "💔",
  liga_subiu:          "🏆",
  liga_desceu:         "📉",
  rebaixamento_alerta: "⚠️",
  promocao_alerta:     "🎯",
  reset_liga:          "📅",
};

// ─── Ícones por material ──────────────────────────────────────
const ICONE_MATERIAL = {
  papel:        "📄",
  plastico:     "🧴",
  vidro:        "🍶",
  metal:        "🥫",
  desconhecido: "❓",
};

// ─── Status das análises enviadas ────────────────────────────
const STATUS_ENVIADO = {
  pendente:  { label: "Pendente",  classe: "enviado-pendente",  icone: "⏳" },
  aprovado:  { label: "Aprovado",  classe: "enviado-aprovado",  icone: "✅" },
  rejeitado: { label: "Rejeitado", classe: "enviado-rejeitado", icone: "❌" },
};

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

// ─── Mensagem motivacional de streak ─────────────────────────
function atualizarStreakMsg(streak) {
  const el    = document.getElementById("streakMsg");
  const icone = document.getElementById("streakMsgIcone");
  const texto = document.getElementById("streakMsgTexto");
  if (!el || !texto || !icone) return;

  let msg, icon;

  if (streak === 0) {
    el.style.display = "none";
    return;
  } else if (streak === 1) {
    icon = "🌱"; msg = "Primeiro dia de streak! Continue amanhã para manter a chama acesa.";
  } else if (streak < 3) {
    icon = "✨"; msg = `${streak} dias seguidos! Você está criando um hábito sustentável.`;
  } else if (streak < 7) {
    icon = "🔥"; msg = `${streak} dias em chamas! O planeta agradece cada reciclagem sua.`;
  } else if (streak === 7) {
    icon = "⚡"; msg = `Semana perfeita! 7 dias seguidos — você é um verdadeiro Agente Eco!`;
  } else if (streak < 14) {
    icon = "💪"; msg = `${streak} dias consecutivos! Sua dedicação está transformando o mundo.`;
  } else if (streak === 14) {
    icon = "💎"; msg = `14 dias imparável! Você já virou referência em reciclagem.`;
  } else if (streak < 30) {
    icon = "👑"; msg = `${streak} dias! Lenda em formação — continue e entre para a história.`;
  } else {
    icon = "🌍"; msg = `${streak} dias seguidos! Você é uma força da natureza. O planeta é seu!`;
  }

  icone.textContent = icon;
  texto.textContent = msg;
  el.style.display  = "flex";
  el.dataset.streak = streak;

  if (streak >= 30)      el.dataset.nivel = "lenda";
  else if (streak >= 14) el.dataset.nivel = "alto";
  else if (streak >= 7)  el.dataset.nivel = "medio";
  else                   el.dataset.nivel = "baixo";
}

// ─── Iniciar dashboard ───────────────────────────────────────
function iniciarDashboard(user) {
  const nome = user.displayName || "Agente";
  document.getElementById("nomeUsuario").textContent = nome.split(" ")[0];

  const dicaAleatoria = DICAS[Math.floor(Math.random() * DICAS.length)];
  document.getElementById("dicaTexto").textContent = dicaAleatoria;

  iniciarNotificacoes(user.uid);

  verificarNotificacoesAutomaticas(user.uid).then(() => {
    document.getElementById("btnNotificacoes")
      ?.dispatchEvent(new CustomEvent("_recarregarBadge"));
  });

  const ref = doc(db, "usuarios", user.uid);
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const dados = snap.data();

    const avatarIdx = typeof dados.avatarIdx === "number"
      ? dados.avatarIdx
      : avatarIdxPadrao(user.uid, AVATARES.length);
    renderizarAvatarHeader(avatarIdx);

    atualizarXP(dados.xp || 0);
    document.getElementById("totalItens").textContent       = dados.itensReciclados  || 0;
    document.getElementById("missoesCompletas").textContent = dados.missoesCompletas || 0;
    atualizarMissoes(dados);
    atualizarStreakMsg(dados.streak || 0);
  });
}

// ─── Sistema de notificações + histórico + enviados ──────────
async function iniciarNotificacoes(uid) {
  const badge     = document.getElementById("notifBadge");
  const btnNotif  = document.getElementById("btnNotificacoes");
  const overlay   = document.getElementById("notifOverlay");
  const btnMarcar = document.getElementById("btnMarcarLidas");

  if (!btnNotif) return;

  // ── Badge ─────────────────────────────────────────────────
  async function atualizarBadge() {
    const naoLidas = await buscarNaoLidas(uid);
    const total    = naoLidas.length;

    if (total > 0) {
      badge.textContent   = total > 9 ? "9+" : total;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    const abaBadge = document.getElementById("notifAbaBadge");
    if (abaBadge) {
      if (total > 0) {
        abaBadge.textContent   = total > 9 ? "9+" : total;
        abaBadge.style.display = "inline-flex";
      } else {
        abaBadge.style.display = "none";
      }
    }
  }

  // ── Renderizar notificações ───────────────────────────────
  async function renderizarNotificacoes() {
    const lista = document.getElementById("notifLista");
    if (!lista) return;
    lista.innerHTML = `<div class="notif-carregando">Carregando...</div>`;
    const todas = await buscarTodas(uid);

    if (todas.length === 0) {
      lista.innerHTML = `<div class="notif-vazia">Nenhuma notificação ainda.</div>`;
      return;
    }

    lista.innerHTML = todas.map(n => `
      <div class="notif-item ${n.lida ? "lida" : "nao-lida"}" data-tipo="${n.tipo}">
        <div class="notif-item-icon">${ICONE_POR_TIPO[n.tipo] || "🔔"}</div>
        <div class="notif-item-conteudo">
          <div class="notif-item-titulo">${n.titulo}</div>
          <div class="notif-item-msg">${n.mensagem}</div>
          <div class="notif-item-data">${formatarDataNotif(n.timestamp)}</div>
        </div>
        ${!n.lida ? `<div class="notif-item-dot"></div>` : ""}
      </div>
    `).join("");
  }

  // ── Renderizar histórico ──────────────────────────────────
  async function renderizarHistorico() {
    const lista = document.getElementById("historicoLista");
    if (!lista) return;
    lista.innerHTML = `<div class="notif-carregando">Carregando...</div>`;

    try {
      const q    = query(
        collection(db, "scans"),
        where("uid", "==", uid),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        lista.innerHTML = `<div class="notif-vazia">Nenhuma reciclagem registrada ainda.<br><span style="font-size:0.75rem;opacity:0.5">Escaneie seu primeiro item!</span></div>`;
        return;
      }

      lista.innerHTML = snap.docs.map(d => {
        const s        = d.data();
        const icone    = ICONE_MATERIAL[s.material] || "♻️";
        const material = s.material
          ? s.material.charAt(0).toUpperCase() + s.material.slice(1)
          : "Desconhecido";
        const nome     = s.nomeProduto || material;

        return `
          <div class="historico-item">
            <div class="historico-item-icon">${icone}</div>
            <div class="historico-item-info">
              <div class="historico-item-nome">${nome}</div>
              <div class="historico-item-meta">
                <span class="historico-badge historico-badge-${s.material || "desconhecido"}">${material}</span>
                <span class="historico-item-data">${formatarDataNotif(s.timestamp)}</span>
              </div>
            </div>
          </div>
        `;
      }).join("");

    } catch (e) {
      console.error("[Histórico]", e);
      lista.innerHTML = `<div class="notif-vazia">Erro ao carregar histórico.</div>`;
    }
  }

  // ── Renderizar enviados ───────────────────────────────────
  async function renderizarEnviados() {
    const lista = document.getElementById("enviadosLista");
    if (!lista) return;
    lista.innerHTML = `<div class="notif-carregando">Carregando...</div>`;

    try {
      const q    = query(
        collection(db, "analises_pendentes"),
        where("uid", "==", uid),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        lista.innerHTML = `<div class="notif-vazia">Nenhuma análise enviada ainda.<br><span style="font-size:0.75rem;opacity:0.5">Envie um item sem código de barras!</span></div>`;
        return;
      }

      lista.innerHTML = snap.docs.map(d => {
        const a        = d.data();
        const status   = STATUS_ENVIADO[a.status] || STATUS_ENVIADO.pendente;
        const icone    = ICONE_MATERIAL[a.material] || "♻️";
        const material = a.material
          ? a.material.charAt(0).toUpperCase() + a.material.slice(1)
          : "Desconhecido";
        const nome     = a.nomeProduto || material;

        return `
          <div class="enviado-item">
            <div class="historico-item-icon">${icone}</div>
            <div class="historico-item-info">
              <div class="historico-item-nome">${nome}</div>
              <div class="historico-item-meta">
                <span class="historico-badge historico-badge-${a.material || "desconhecido"}">${material}</span>
                <span class="enviado-status ${status.classe}">
                  ${status.icone} ${status.label}
                </span>
              </div>
              <div class="historico-item-data" style="margin-top:3px">${formatarDataNotif(a.timestamp)}</div>
            </div>
          </div>
        `;
      }).join("");

    } catch (e) {
      console.error("[Enviados]", e);
      lista.innerHTML = `<div class="notif-vazia">Erro ao carregar análises.</div>`;
    }
  }

  // ── Troca de abas ─────────────────────────────────────────
  function trocarAba(aba) {
    document.querySelectorAll(".notif-aba").forEach(b =>
      b.classList.toggle("ativa", b.dataset.aba === aba)
    );
    document.getElementById("conteudoNotif").style.display     = aba === "notif"     ? "flex" : "none";
    document.getElementById("conteudoHistorico").style.display = aba === "historico" ? "flex" : "none";
    document.getElementById("conteudoEnviados").style.display  = aba === "enviados"  ? "flex" : "none";

    if (aba === "notif")     renderizarNotificacoes();
    if (aba === "historico") renderizarHistorico();
    if (aba === "enviados")  renderizarEnviados();
  }

  // ── Eventos das abas ──────────────────────────────────────
  document.getElementById("abaNotif")?.addEventListener("click",     () => trocarAba("notif"));
  document.getElementById("abaHistorico")?.addEventListener("click", () => trocarAba("historico"));
  document.getElementById("abaEnviados")?.addEventListener("click",  () => trocarAba("enviados"));

  // ── Abrir/fechar painel ───────────────────────────────────
  btnNotif.addEventListener("click", () => {
    const aberto = overlay.style.display !== "none";
    if (aberto) {
      overlay.style.display = "none";
    } else {
      overlay.style.display = "flex";
      trocarAba("notif");
    }
  });

  // ── Fechar ao clicar fora ─────────────────────────────────
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });

  // ── Marcar todas como lidas ───────────────────────────────
  btnMarcar?.addEventListener("click", async () => {
    await marcarTodasComoLidas(uid);
    await atualizarBadge();
    await renderizarNotificacoes();
  });

  // ── Recarregar badge após verificação automática ──────────
  btnNotif.addEventListener("_recarregarBadge", atualizarBadge);

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