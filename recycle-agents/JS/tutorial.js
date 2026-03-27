// ============================================================
//  RECYCLE AGENTS — tutorial.js
//  Tutorial guiado — libera card por card
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const TOTAL_CARDS = 6;
let cardAtual = 1;
let uid = null;

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  uid = user.uid;

  // Se já fez o tutorial, vai direto pro home
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (snap.exists() && snap.data().tutorialCompleto) {
    window.location.href = "home.html";
    return;
  }

  iniciarTutorial();
});

// ─── Iniciar ─────────────────────────────────────────────────
function iniciarTutorial() {
  renderizarDots();
  ativarCard(1);
  configurarBotoes();
}

// ─── Dots de progresso ───────────────────────────────────────
function renderizarDots() {
  const container = document.getElementById("tutorialProgress");
  container.innerHTML = "";
  for (let i = 1; i <= TOTAL_CARDS; i++) {
    const dot = document.createElement("div");
    dot.className = "progress-dot";
    dot.id = `dot${i}`;
    container.appendChild(dot);
  }
  atualizarDots();
}

function atualizarDots() {
  for (let i = 1; i <= TOTAL_CARDS; i++) {
    const dot = document.getElementById(`dot${i}`);
    dot.className = "progress-dot";
    if (i < cardAtual)  dot.classList.add("completo");
    if (i === cardAtual) dot.classList.add("ativo");
  }
}

// ─── Ativar card ─────────────────────────────────────────────
function ativarCard(num) {
  cardAtual = num;
  for (let i = 1; i <= TOTAL_CARDS; i++) {
    const card = document.getElementById(`card${i}`);
    card.classList.remove("ativo", "completo");
    if (i < num)  card.classList.add("completo");
    if (i === num) card.classList.add("ativo");
  }
  atualizarDots();

  // Scroll suave até o card ativo
  setTimeout(() => {
    document.getElementById(`card${num}`)
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
}

// ─── Configurar botões ───────────────────────────────────────
function configurarBotoes() {
  for (let i = 1; i <= TOTAL_CARDS; i++) {
    const btn = document.getElementById(`btn${i}`);
    if (!btn) continue;

    btn.addEventListener("click", (e) => {
      // Salva qual card completou no localStorage
      localStorage.setItem("tutorialCard", i);

      // Se for o último card, marcar tutorial completo
      if (i === TOTAL_CARDS) {
        e.preventDefault();
        concluirTutorial();
        return;
      }

      // Nos outros cards, deixa navegar normalmente
      // A página destino vai detectar e voltar pro tutorial
    });
  }
}

// ─── Verificar retorno de outra tela ─────────────────────────
// Chamado quando o usuário volta pro tutorial após visitar uma tela
const cardPendente = localStorage.getItem("tutorialCard");
if (cardPendente) {
  const numCompleto = parseInt(cardPendente);
  localStorage.removeItem("tutorialCard");

  // Espera o DOM carregar e avança pro próximo
  window.addEventListener("DOMContentLoaded", () => {
    // Marca os anteriores como completos e ativa o próximo
    const proximo = numCompleto + 1;
    if (proximo <= TOTAL_CARDS) {
      // onAuthStateChanged vai chamar iniciarTutorial
      // então guardamos qual card ativar
      window._tutorialProximo = proximo;
    }
  });
}

// ─── Iniciar com card certo ──────────────────────────────────
function iniciarTutorial() {
  renderizarDots();
  const inicio = window._tutorialProximo || 1;
  ativarCard(inicio);
  configurarBotoes();
  window._tutorialProximo = null;
}

// ─── Concluir tutorial ───────────────────────────────────────
async function concluirTutorial() {
  if (uid) {
    await updateDoc(doc(db, "usuarios", uid), {
      tutorialCompleto: true
    });
  }
  window.location.href = "home.html";
}