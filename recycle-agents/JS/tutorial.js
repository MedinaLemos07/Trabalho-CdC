// ============================================================
//  RECYCLE AGENTS — tutorial.js
//  Tour Guiado com Spotlight na home.html
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
// Definição dos passos do tour
// ─────────────────────────────────────────────────────────────
const PASSOS = [
  {
    alvo: ".xp-card",
    posicao: "bottom",
    icone: "⚡",
    titulo: "XP e Nível",
    desc: "Aqui você acompanha seu XP total e nível atual. Cada item reciclado soma pontos — Papel +5, Plástico +10, Vidro +15 e Metal +20 XP."
  },
  {
    alvo: ".stats-row",
    posicao: "bottom",
    icone: "📊",
    titulo: "Suas Estatísticas",
    desc: "Veja quantos itens você já reciclou e quantas missões completou. Esses números crescem a cada scan realizado."
  },
  {
    alvo: ".scanner-btn-wrap",
    posicao: "top",
    icone: "📷",
    titulo: "Scanner de Itens",
    desc: "Seu principal equipamento! Aponte a câmera para o código de barras de qualquer embalagem. O sistema identifica o material e concede XP automaticamente."
  },
  {
    alvo: ".section",
    posicao: "top",
    icone: "⚔️",
    titulo: "Missões do Dia",
    desc: "Todo dia surgem novos desafios. Complete-os para ganhar XP bônus e manter sua sequência ativa. Não deixe o streak cair!"
  },
  {
    alvo: ".navbar",
    posicao: "top",
    icone: "🧭",
    titulo: "Navegação",
    desc: "Use a barra inferior para navegar: Scanner para reciclar, Missões para seus desafios, Ranking para competir e Perfil para ver sua evolução."
  },
];

// ─────────────────────────────────────────────────────────────
// Estado do tour
// ─────────────────────────────────────────────────────────────
let stepAtual     = 0;
let usuarioUID    = null;
let elementoAtual = null;

// ─────────────────────────────────────────────────────────────
// VERIFICAÇÃO DE AUTENTICAÇÃO E TUTORIAL
// ─────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  usuarioUID = user.uid;

  const snap = await getDoc(doc(db, "usuarios", user.uid));

  // ✅ CORRIGIDO: redireciona para home se tutorial já foi feito
  if (snap.exists() && snap.data().tutorialCompleto === true) {
    window.location.href = "home.html";
    return;
  }

  // Preenche nome na tela
  const nome  = user.displayName || "Agente";
  const elNome = document.getElementById("nomeUsuario");
  if (elNome) elNome.textContent = nome.split(" ")[0];

  // Cria os elementos e já registra os listeners dentro da função
  criarElementosTour();
});

// ─────────────────────────────────────────────────────────────
// Cria os elementos do tour no DOM
// ─────────────────────────────────────────────────────────────
function criarElementosTour() {
  // Tela de boas-vindas
  const welcome = document.createElement("div");
  welcome.className = "tour-welcome";
  welcome.id = "tourWelcome";
  welcome.innerHTML = `
    <div class="tour-welcome-icon">♻️</div>
    <h1>BEM-VINDO, AGENTE</h1>
    <p>Antes de começar sua missão, deixa eu te mostrar como tudo funciona aqui no Recycle Agents.</p>
    <div class="tour-welcome-btns">
      <button class="tour-btn-comecar" id="tourBtnComecar">⚡ Iniciar Tour</button>
      <button class="tour-btn-skip-all" id="tourBtnSkipAll">Pular tutorial</button>
    </div>
  `;
  document.body.appendChild(welcome);

  // Spotlight
  const spotlight = document.createElement("div");
  spotlight.className = "tour-spotlight";
  spotlight.id = "tourSpotlight";
  document.body.appendChild(spotlight);

  // Balão de dica
  const balao = document.createElement("div");
  balao.className = "tour-balao";
  balao.id = "tourBalao";
  balao.innerHTML = `
    <div class="tour-step-num" id="tourStepNum">PASSO 1 / ${PASSOS.length}</div>
    <span class="tour-icone" id="tourIcone"></span>
    <div class="tour-titulo" id="tourTitulo"></div>
    <p class="tour-desc" id="tourDesc"></p>
    <div class="tour-progress-wrap">
      <div class="tour-progress-bar">
        <div class="tour-progress-fill" id="tourProgressFill" style="width: 0%"></div>
      </div>
      <span class="tour-progress-label" id="tourProgressLabel">0%</span>
    </div>
    <div class="tour-btns">
      <button class="tour-btn-pular" id="tourBtnPular">Pular</button>
      <button class="tour-btn-proximo" id="tourBtnProximo">Próximo →</button>
    </div>
  `;
  document.body.appendChild(balao);

  // Tela final
  const fim = document.createElement("div");
  fim.className = "tour-fim";
  fim.id = "tourFim";
  fim.innerHTML = `
    <div class="tour-fim-icon">🚀</div>
    <h2>BRIEFING CONCLUÍDO</h2>
    <p>Você está pronto, Agente. O planeta conta com cada scan seu. Boa sorte!</p>
    <button class="tour-fim-btn" id="tourBtnFim">🏠 Começar agora</button>
  `;
  document.body.appendChild(fim);

  // ✅ CORRIGIDO: listeners registrados APÓS elementos existirem no DOM
  document.getElementById("tourBtnComecar").addEventListener("click", iniciarTour);
  document.getElementById("tourBtnSkipAll").addEventListener("click", pularTour);
  document.getElementById("tourBtnProximo").addEventListener("click", avancarPasso);
  document.getElementById("tourBtnPular").addEventListener("click", pularTour);
  document.getElementById("tourBtnFim").addEventListener("click", () => {
    window.location.href = "home.html";
  });
}

// ─────────────────────────────────────────────────────────────
// Posiciona o spotlight no elemento alvo
// ─────────────────────────────────────────────────────────────
function posicionarSpotlight(el) {
  const rect = el.getBoundingClientRect();
  const pad  = 8;
  const rx   = (rect.width  / 2) + pad;
  const ry   = (rect.height / 2) + pad;
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;

  const spotlight = document.getElementById("tourSpotlight");
  const mask = `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}px ${cy}px, transparent 100%, black 100%)`;
  spotlight.style.webkitMaskImage = mask;
  spotlight.style.maskImage       = mask;
}

// ─────────────────────────────────────────────────────────────
// Posiciona o balão perto do elemento
// ─────────────────────────────────────────────────────────────
function posicionarBalao(el, posicao) {
  const balao  = document.getElementById("tourBalao");
  const rect   = el.getBoundingClientRect();
  const bW     = balao.offsetWidth  || 320;
  const bH     = balao.offsetHeight || 240;
  const margin = 16;

  let top, left;

  if (posicao === "bottom") {
    top  = rect.bottom + margin;
    left = rect.left + rect.width / 2 - bW / 2;
  } else {
    top  = rect.top - bH - margin;
    left = rect.left + rect.width / 2 - bW / 2;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth  - bW - margin));
  top  = Math.max(margin, Math.min(top,  window.innerHeight - bH - margin));

  balao.style.top  = `${top}px`;
  balao.style.left = `${left}px`;
  balao.setAttribute("data-arrow", posicao === "bottom" ? "top" : "bottom");
}

// ─────────────────────────────────────────────────────────────
// Mostra um passo do tour
// ─────────────────────────────────────────────────────────────
function mostrarPasso(index) {
  const passo = PASSOS[index];
  const el    = document.querySelector(passo.alvo);
  if (!el) { avancarPasso(); return; }

  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    elementoAtual = el;
    el.classList.add("tour-highlight");
    posicionarSpotlight(el);

    document.getElementById("tourStepNum").textContent   = `PASSO ${index + 1} / ${PASSOS.length}`;
    document.getElementById("tourIcone").textContent     = passo.icone;
    document.getElementById("tourTitulo").textContent    = passo.titulo;
    document.getElementById("tourDesc").textContent      = passo.desc;

    const pct = Math.round(((index + 1) / PASSOS.length) * 100);
    document.getElementById("tourProgressFill").style.width  = `${pct}%`;
    document.getElementById("tourProgressLabel").textContent  = `${pct}%`;

    const btnProximo = document.getElementById("tourBtnProximo");
    btnProximo.textContent = index === PASSOS.length - 1 ? "Concluir ✅" : "Próximo →";

    const balao = document.getElementById("tourBalao");
    balao.classList.remove("visivel");

    setTimeout(() => {
      posicionarBalao(el, passo.posicao);
      balao.classList.add("visivel");
    }, 100);

    document.getElementById("tourSpotlight").style.opacity = "1";

  }, 300);
}

// ─────────────────────────────────────────────────────────────
// Avança para o próximo passo
// ─────────────────────────────────────────────────────────────
function avancarPasso() {
  stepAtual++;
  if (stepAtual < PASSOS.length) {
    mostrarPasso(stepAtual);
  } else {
    finalizarTour();
  }
}

// ─────────────────────────────────────────────────────────────
// Finaliza o tour e salva no Firestore
// ─────────────────────────────────────────────────────────────
async function finalizarTour() {
  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");
  document.getElementById("tourSpotlight").style.opacity = "0";
  document.getElementById("tourBalao").classList.remove("visivel");

  if (usuarioUID) {
    try {
      await updateDoc(doc(db, "usuarios", usuarioUID), { tutorialCompleto: true });
    } catch (e) {
      console.error("Erro ao salvar tutorial:", e);
    }
  }

  setTimeout(() => {
    document.getElementById("tourFim").classList.add("ativo");
  }, 400);
}

// ─────────────────────────────────────────────────────────────
// Pula o tour e salva no Firestore
// ─────────────────────────────────────────────────────────────
async function pularTour() {
  if (elementoAtual) elementoAtual.classList.remove("tour-highlight");
  const sp = document.getElementById("tourSpotlight");
  if (sp) sp.style.opacity = "0";
  const bl = document.getElementById("tourBalao");
  if (bl) bl.classList.remove("visivel");
  const welcome = document.getElementById("tourWelcome");
  if (welcome) welcome.style.display = "none";

  if (usuarioUID) {
    try {
      await updateDoc(doc(db, "usuarios", usuarioUID), { tutorialCompleto: true });
    } catch (e) {
      console.error("Erro ao salvar tutorial:", e);
    }
  }

  window.location.href = "home.html";
}

// ─────────────────────────────────────────────────────────────
// Inicia o tour (fecha a tela de boas-vindas)
// ─────────────────────────────────────────────────────────────
function iniciarTour() {
  const welcome = document.getElementById("tourWelcome");
  welcome.style.opacity    = "0";
  welcome.style.transition = "opacity 0.4s ease";
  setTimeout(() => {
    welcome.style.display = "none";
    mostrarPasso(0);
  }, 400);
}