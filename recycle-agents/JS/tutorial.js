// ============================================================
//  RECYCLE AGENTS — tutorial.js  v2.1
//  Tour Guiado Multi-Tela | Persiste estado via sessionStorage
//
//  FLUXO:
//  tutorial.html → home.html (passos 0-3) → scanner.html (4-5)
//                → missoes.html (6-7)     → ranking.html (8-9)
//                → home.html (tela final)
//
//  ISOLADO: não toca em nenhuma lógica fora do tutorial.
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
// ─────────────────────────────────────────────────────────────
// Chave de estado no sessionStorage
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "recycle_tour_state";

// ─────────────────────────────────────────────────────────────
// Definição completa dos passos por página
// ─────────────────────────────────────────────────────────────
const TOUR_CONFIG = {
  "home.html": {
    label: "🏠 Dashboard",
    passos: [
      {
        alvo: ".xp-card",
        posicao: "bottom",
        icone: "⚡",
        titulo: "SEU XP E NÍVEL",
        desc: "Aqui fica seu painel de progresso. Cada item reciclado soma XP — <b>Papel +5</b>, <b>Plástico +10</b>, <b>Vidro +15</b> e <b>Metal +20 XP</b>. Suba de nível reciclando mais!"
      },
      {
        alvo: ".stats-row",
        posicao: "bottom",
        icone: "📊",
        titulo: "SUAS ESTATÍSTICAS",
        desc: "Seus números em tempo real: total de itens reciclados e missões concluídas. Quanto mais você recicla, mais crescem."
      },
      {
        alvo: ".scanner-btn-wrap",
        posicao: "top",
        icone: "📷",
        titulo: "ESCANEAR ITEM",
        desc: "Seu principal equipamento! Aponte a câmera para o <b>código de barras</b> de qualquer embalagem e ganhe XP na hora."
      },
      {
        alvo: ".section",
        posicao: "top",
        icone: "⚔️",
        titulo: "MISSÕES DO DIA",
        desc: "Todo dia surgem novos desafios. Complete-os para ganhar XP bônus. Não deixe o <b>streak cair</b> — sequências têm recompensas especiais!"
      },
    ]
  },

  "scanner.html": {
    label: "📷 Scanner",
    passos: [
      {
        alvo: ".viewfinder-wrap",
        posicao: "bottom",
        icone: "🎯",
        titulo: "ÁREA DE SCAN",
        desc: "Posicione o <b>código de barras</b> dentro da moldura verde. O sistema lê automaticamente e identifica o material do item."
      },
      {
        alvo: ".scanner-actions",
        posicao: "top",
        icone: "📤",
        titulo: "SEM CÓDIGO DE BARRAS?",
        desc: "Se o item não tem código, clique aqui para enviar uma foto para <b>análise manual</b>. Nossa equipe classifica e você ainda ganha XP!"
      },
    ]
  },

  "missoes.html": {
    label: "⚔️ Missões",
    passos: [
      {
        alvo: ".missoes-tabs",
        posicao: "bottom",
        icone: "📅",
        titulo: "DIÁRIAS E SEMANAIS",
        desc: "<b>Diárias</b> renovam todo dia à meia-noite — são mais fáceis e rápidas. <b>Semanais</b> são maiores e valem muito mais XP. Tente completar as duas!"
      },
      {
        alvo: "#md1",
        posicao: "bottom",
        icone: "🏆",
        titulo: "COMO FUNCIONAM",
        desc: "Cada missão tem um <b>objetivo</b>, uma barra de progresso e uma recompensa em XP. Complete o objetivo e o XP é creditado automaticamente."
      },
    ]
  },

  "ranking.html": {
    label: "🏆 Ranking",
    passos: [
      {
        alvo: ".escudos-wrap",
        posicao: "bottom",
        icone: "🛡️",
        titulo: "SISTEMA DE LIGAS",
        desc: "Existem <b>5 ligas</b>: Sucata, Reciclador, Guardião, Agente Eco e Lenda Verde. Termine no top da sua liga para <b>subir</b> — ou fique no bottom e <b>desça</b>!"
      },
      {
        alvo: ".ranking-container",
        posicao: "top",
        icone: "📈",
        titulo: "RANKING SEMANAL",
        desc: "O ranking reseta toda semana. Acumule o máximo de XP possível para dominar sua liga e subir de divisão. <b>Você está pronto, Agente!</b>"
      },
    ]
  }
};

// ─────────────────────────────────────────────────────────────
// Detecta a página atual pelo pathname
// ─────────────────────────────────────────────────────────────
function getPaginaAtual() {
  const path = window.location.pathname;
  for (const key of Object.keys(TOUR_CONFIG)) {
    if (path.endsWith(key)) return key;
  }
  if (path.endsWith("tutorial.html")) return "tutorial.html";
  return null;
}

// ─────────────────────────────────────────────────────────────
// Estado persistido no sessionStorage
// ─────────────────────────────────────────────────────────────
function getEstado() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { stepGlobal: 0, ativo: false };
  } catch {
    return { stepGlobal: 0, ativo: false };
  }
}

function salvarEstado(estado) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {}
}

function limparEstado() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// Ordem das páginas e helpers de navegação
// ─────────────────────────────────────────────────────────────
const ORDEM_PAGINAS = ["home.html", "scanner.html", "missoes.html", "ranking.html"];

function getProximaPagina(paginaAtual) {
  const idx = ORDEM_PAGINAS.indexOf(paginaAtual);
  return idx >= 0 && idx < ORDEM_PAGINAS.length - 1
    ? ORDEM_PAGINAS[idx + 1]
    : null;
}

function calcularStepGlobal(pagina, stepLocal) {
  let total = 0;
  for (const p of ORDEM_PAGINAS) {
    if (p === pagina) return total + stepLocal;
    total += TOUR_CONFIG[p].passos.length;
  }
  return total + stepLocal;
}

function getTotalPassos() {
  return ORDEM_PAGINAS.reduce((acc, p) => acc + TOUR_CONFIG[p].passos.length, 0);
}

// ─────────────────────────────────────────────────────────────
// Variáveis de estado local
// ─────────────────────────────────────────────────────────────
let usuarioUID    = null;
let elementoAtual = null;
let stepLocal     = 0;
let paginaAtual   = null;
let passosAtual   = [];

// ─────────────────────────────────────────────────────────────
// PONTO DE ENTRADA
// Lê sessionStorage IMEDIATAMENTE — sem esperar Firebase
// para não conflitar com o onAuthStateChanged do app.js
// ─────────────────────────────────────────────────────────────
const _estadoImediato = getEstado();
const _paginaImediata = getPaginaAtual();

if (_paginaImediata !== "tutorial.html" && _estadoImediato.ativo) {

  // ── Tour ativo em uma das páginas reais ─────────────────────
  paginaAtual = _paginaImediata;
  passosAtual = TOUR_CONFIG[paginaAtual]?.passos || [];

  // Calcula stepLocal a partir do stepGlobal salvo
  let globalInicio = 0;
  for (const p of ORDEM_PAGINAS) {
    if (p === paginaAtual) break;
    globalInicio += TOUR_CONFIG[p].passos.length;
  }
  stepLocal = Math.max(0, _estadoImediato.stepGlobal - globalInicio);
  if (stepLocal >= passosAtual.length) stepLocal = 0;

  // Captura UID em background (necessário apenas para pular/finalizar)
  onAuthStateChanged(auth, (user) => {
    if (user) usuarioUID = user.uid;
  });

  // Inicia o tour após o DOM estar completamente pronto
  function iniciarTourNaPagina() {
    criarElementosTour();
    criarIndicadorPagina();
    setTimeout(() => mostrarPasso(stepLocal), 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarTourNaPagina);
  } else {
    iniciarTourNaPagina();
  }

} else if (_paginaImediata === "tutorial.html") {

  // ── Página de boas-vindas — precisa do auth para checar Firestore ──
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    usuarioUID  = user.uid;
    paginaAtual = "tutorial.html";

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists() && snap.data().tutorialCompleto === true) {
      window.location.href = "home.html";
      return;
    }

    const nome   = user.displayName || "Agente";
    const elNome = document.getElementById("nomeUsuario");
    if (elNome) elNome.textContent = nome.split(" ")[0];

    criarTelaBemVindo();
  });
}

// ─────────────────────────────────────────────────────────────
// TELA DE BOAS-VINDAS (tutorial.html)
// ─────────────────────────────────────────────────────────────
function criarTelaBemVindo() {
  const welcome = document.createElement("div");
  welcome.className = "tour-welcome";
  welcome.id = "tourWelcome";
  welcome.innerHTML = `
    <div class="tour-welcome-badge">♻️ Recycle Agents</div>
    <div class="tour-welcome-icon">🌍</div>
    <h1>BEM-VINDO,<br><span>AGENTE</span></h1>
    <p class="tour-welcome-sub">Antes de começar sua missão, vamos te mostrar como usar o sistema.</p>
    <div class="tour-welcome-chips">
      <span class="tour-chip">🏠 Dashboard</span>
      <span class="tour-chip">📷 Scanner</span>
      <span class="tour-chip">⚔️ Missões</span>
      <span class="tour-chip">🏆 Ranking</span>
    </div>
    <div class="tour-welcome-btns">
      <button class="tour-btn-comecar" id="tourBtnComecar">⚡ Iniciar Tour</button>
      <button class="tour-btn-skip-all" id="tourBtnSkipAll">Pular tutorial</button>
    </div>
  `;
  document.body.appendChild(welcome);

  document.getElementById("tourBtnComecar").addEventListener("click", () => {
    salvarEstado({ stepGlobal: 0, ativo: true });
    welcome.style.opacity    = "0";
    welcome.style.transition = "opacity 0.4s ease";
    setTimeout(() => {
      window.location.href = "home.html";
    }, 400);
  });

  document.getElementById("tourBtnSkipAll").addEventListener("click", pularTourCompleto);
}

// ─────────────────────────────────────────────────────────────
// Cria elementos do tour injetados na página atual
// ─────────────────────────────────────────────────────────────
function criarElementosTour() {
  // Spotlight
  if (!document.getElementById("tourSpotlight")) {
    const sp = document.createElement("div");
    sp.className = "tour-spotlight";
    sp.id = "tourSpotlight";
    document.body.appendChild(sp);
  }

  // Balão
  if (!document.getElementById("tourBalao")) {
    const balao = document.createElement("div");
    balao.className = "tour-balao";
    balao.id = "tourBalao";
    balao.innerHTML = `
      <div class="tour-step-num" id="tourStepNum">PASSO 1 / ${getTotalPassos()}</div>
      <div class="tour-balao-header">
        <span class="tour-icone" id="tourIcone"></span>
        <div class="tour-titulo" id="tourTitulo"></div>
      </div>
      <p class="tour-desc" id="tourDesc"></p>
      <div class="tour-progress-wrap">
        <div class="tour-progress-bar">
          <div class="tour-progress-fill" id="tourProgressFill" style="width: 0%"></div>
        </div>
        <span class="tour-progress-label" id="tourProgressLabel">0%</span>
      </div>
      <div class="tour-btns">
        <button class="tour-btn-pular" id="tourBtnPular">Pular tudo</button>
        <button class="tour-btn-proximo" id="tourBtnProximo">Próximo →</button>
      </div>
    `;
    document.body.appendChild(balao);

    document.getElementById("tourBtnProximo").addEventListener("click", avancarPasso);
    document.getElementById("tourBtnPular").addEventListener("click", pularTourCompleto);
  }

  // Tela final — só na última página (ranking.html)
  if (paginaAtual === "ranking.html" && !document.getElementById("tourFim")) {
    const fim = document.createElement("div");
    fim.className = "tour-fim";
    fim.id = "tourFim";
    fim.innerHTML = `
      <div class="tour-confetti-wrap" id="tourConfetti"></div>
      <div class="tour-fim-icon">🚀</div>
      <div class="tour-fim-xp">⚡ +50 XP de bônus liberados</div>
      <h2>BRIEFING<br><span>CONCLUÍDO</span></h2>
      <p>Você está pronto, Agente. O planeta conta com cada scan seu. Boa sorte na missão!</p>
      <button class="tour-fim-btn" id="tourBtnFim">🏠 Começar agora</button>
    `;
    document.body.appendChild(fim);

    document.getElementById("tourBtnFim").addEventListener("click", () => {
      window.location.href = "home.html";
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Indicador de página (chip fixo no topo)
// ─────────────────────────────────────────────────────────────
function criarIndicadorPagina() {
  if (document.getElementById("tourPageIndicator")) return;
  const label = TOUR_CONFIG[paginaAtual]?.label || "";
  const el = document.createElement("div");
  el.className = "tour-page-indicator";
  el.id = "tourPageIndicator";
  el.innerHTML = `
    <div class="tour-page-dot"></div>
    <span class="tour-page-label">TOUR — ${label}</span>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("visivel"), 100);
}

// ─────────────────────────────────────────────────────────────
// Spotlight — abre o "buraco" no elemento via CSS custom props
// ─────────────────────────────────────────────────────────────
function posicionarSpotlight(el) {
  const sp = document.getElementById("tourSpotlight");
  if (!sp) return;
  const rect = el.getBoundingClientRect();
  const pad  = 12;

  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  const rx = rect.width  / 2 + pad;
  const ry = rect.height / 2 + pad;

  sp.style.setProperty("--spot-cx", `${cx}px`);
  sp.style.setProperty("--spot-cy", `${cy}px`);
  sp.style.setProperty("--spot-rx", `${rx}px`);
  sp.style.setProperty("--spot-ry", `${ry}px`);
  sp.style.opacity = "1";
  sp.classList.add("ativo");
}

// ─────────────────────────────────────────────────────────────
// Posiciona o balão próximo ao elemento, respeitando viewport
// ─────────────────────────────────────────────────────────────
function posicionarBalao(el, posicao) {
  const balao = document.getElementById("tourBalao");
  if (!balao) return;
  const rect   = el.getBoundingClientRect();
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;
  const bW     = Math.min(310, vw - 32);
  const bH     = balao.scrollHeight || 260;
  const margin = 12;

  let top, left;

  if (posicao === "bottom") {
    top = rect.bottom + margin;
    if (top + bH > vh - margin) {
      top = rect.top - bH - margin;
      posicao = "top";
    }
  } else {
    top = rect.top - bH - margin;
    if (top < margin) {
      top = rect.bottom + margin;
      posicao = "bottom";
    }
  }

  left = rect.left + rect.width / 2 - bW / 2;
  left = Math.max(margin, Math.min(left, vw - bW - margin));
  top  = Math.max(margin, Math.min(top,  vh - bH - margin));

  const arrowX        = (rect.left + rect.width / 2) - left;
  const arrowXClamped = Math.max(20, Math.min(arrowX, bW - 20));

  balao.style.width = `${bW}px`;
  balao.style.top   = `${top}px`;
  balao.style.left  = `${left}px`;
  balao.setAttribute("data-arrow", posicao === "bottom" ? "top" : "bottom");
  balao.style.setProperty("--arrow-offset", `${arrowXClamped}px`);
}

// ─────────────────────────────────────────────────────────────
// Exibe um passo do tour
// ─────────────────────────────────────────────────────────────
function mostrarPasso(index) {
  const passo = passosAtual[index];
  if (!passo) { avancarPasso(); return; }

  const el = document.querySelector(passo.alvo);
  if (!el) {
    // Elemento não encontrado — pula silenciosamente
    stepLocal++;
    if (stepLocal < passosAtual.length) mostrarPasso(stepLocal);
    else irProximaPagina();
    return;
  }

  // Remove highlight anterior
  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");

  // Scroll suave até o elemento
  el.scrollIntoView({ behavior: "smooth", block: "center" });

  const balao = document.getElementById("tourBalao");
  if (balao) balao.classList.remove("visivel");

  setTimeout(() => {
    elementoAtual = el;
    el.classList.add("tour-highlight");
    posicionarSpotlight(el);

    // Progresso global
    const globalStep = calcularStepGlobal(paginaAtual, index);
    const total      = getTotalPassos();
    const pct        = Math.round(((globalStep + 1) / total) * 100);

    document.getElementById("tourStepNum").textContent       = `PASSO ${globalStep + 1} / ${total}`;
    document.getElementById("tourIcone").textContent         = passo.icone;
    document.getElementById("tourTitulo").textContent        = passo.titulo;
    document.getElementById("tourDesc").innerHTML            = passo.desc;
    document.getElementById("tourProgressFill").style.width  = `${pct}%`;
    document.getElementById("tourProgressLabel").textContent  = `${pct}%`;

    // Texto do botão
    const isUltimoPasso  = index === passosAtual.length - 1;
    const isUltimaPagina = paginaAtual === ORDEM_PAGINAS[ORDEM_PAGINAS.length - 1];
    const btnProximo     = document.getElementById("tourBtnProximo");

    if (isUltimoPasso && isUltimaPagina) {
      btnProximo.textContent = "Concluir ✅";
    } else if (isUltimoPasso) {
      btnProximo.textContent = "Próxima tela →";
    } else {
      btnProximo.textContent = "Próximo →";
    }

    // Mostra balão
    setTimeout(() => {
      posicionarBalao(el, passo.posicao);
      if (balao) balao.classList.add("visivel");
    }, 80);

    // Salva estado
    salvarEstado({
      ativo: true,
      stepGlobal: calcularStepGlobal(paginaAtual, index)
    });

  }, 300);
}

// ─────────────────────────────────────────────────────────────
// Avança para o próximo passo ou próxima página
// ─────────────────────────────────────────────────────────────
function avancarPasso() {
  stepLocal++;
  if (stepLocal < passosAtual.length) {
    mostrarPasso(stepLocal);
  } else {
    irProximaPagina();
  }
}

// ─────────────────────────────────────────────────────────────
// Navega para a próxima página do tour
// ─────────────────────────────────────────────────────────────
function irProximaPagina() {
  const proxima = getProximaPagina(paginaAtual);

  if (!proxima) {
    finalizarTour();
    return;
  }

  // Oculta elementos visuais
  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");
  const sp = document.getElementById("tourSpotlight");
  if (sp) { sp.style.opacity = "0"; sp.classList.remove("ativo"); }
  const balao = document.getElementById("tourBalao");
  if (balao) balao.classList.remove("visivel");

  // Salva o stepGlobal do início da próxima página
  const stepGlobalProxima = calcularStepGlobal(proxima, 0);
  salvarEstado({ ativo: true, stepGlobal: stepGlobalProxima });

  // Overlay de transição
  const transicao = document.createElement("div");
  transicao.className = "tour-transicao";
  transicao.id = "tourTransicao";
  const labelProxima = TOUR_CONFIG[proxima]?.label || proxima;
  transicao.innerHTML = `
    <div class="tour-transicao-icon">${TOUR_CONFIG[proxima]?.passos[0]?.icone || "📍"}</div>
    <div class="tour-transicao-texto">Indo para ${labelProxima}</div>
    <div class="tour-dots"><span></span><span></span><span></span></div>
  `;
  document.body.appendChild(transicao);
  setTimeout(() => transicao.classList.add("ativo"), 50);
  setTimeout(() => { window.location.href = proxima; }, 900);
}

// ─────────────────────────────────────────────────────────────
// Finaliza o tour (última página concluída)
// ─────────────────────────────────────────────────────────────
async function finalizarTour() {
  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");
  const sp = document.getElementById("tourSpotlight");
  if (sp) { sp.style.opacity = "0"; sp.classList.remove("ativo"); }
  const balao = document.getElementById("tourBalao");
  if (balao) balao.classList.remove("visivel");
  const indicator = document.getElementById("tourPageIndicator");
  if (indicator) indicator.classList.remove("visivel");

  limparEstado();

  if (usuarioUID) {
    try {
      // FIX: creditar os +50 XP de bônus prometidos na tela final
      await updateDoc(doc(db, "usuarios", usuarioUID), {
        tutorialCompleto: true,
        xp:       increment(50),
        xpSemana: increment(50),
      });
    } catch (e) {
      console.error("Erro ao finalizar tutorial:", e);
    }
  }

  setTimeout(() => {
    const fim = document.getElementById("tourFim");
    if (fim) {
      fim.classList.add("ativo");
      dispararConfetti();
    }
  }, 400);
}

// ─────────────────────────────────────────────────────────────
// Pula o tour completamente
// ─────────────────────────────────────────────────────────────
async function pularTourCompleto() {
  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");
  const sp = document.getElementById("tourSpotlight");
  if (sp) { sp.style.opacity = "0"; sp.classList.remove("ativo"); }
  const balao = document.getElementById("tourBalao");
  if (balao) balao.classList.remove("visivel");

  limparEstado();

  if (usuarioUID) {
    try {
      await updateDoc(doc(db, "usuarios", usuarioUID), { tutorialCompleto: true });
    } catch (e) {
      console.error("Erro ao pular tutorial:", e);
    }
  }

  window.location.href = "home.html";
}

// ─────────────────────────────────────────────────────────────
// Animação de confetti (tela final)
// ─────────────────────────────────────────────────────────────
function dispararConfetti() {
  const wrap = document.getElementById("tourConfetti");
  if (!wrap) return;

  const cores = ["#00ff6a", "#00c44f", "#006628", "#ffffff", "#a0ffb8"];

  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div");
    p.className = "tour-confetti-particle";
    p.style.left              = `${Math.random() * 100}%`;
    p.style.background        = cores[Math.floor(Math.random() * cores.length)];
    p.style.width             = `${4 + Math.random() * 6}px`;
    p.style.height            = `${4 + Math.random() * 6}px`;
    p.style.borderRadius      = Math.random() > 0.5 ? "50%" : "2px";
    p.style.animationDuration = `${1.5 + Math.random() * 2}s`;
    p.style.animationDelay    = `${Math.random() * 0.8}s`;
    wrap.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}