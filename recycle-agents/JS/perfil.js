// ============================================================
//  RECYCLE AGENTS — perfil.js
//  Lógica da tela de perfil
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, onSnapshot, collection, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Títulos por nível ───────────────────────────────────────
const TITULOS = [
  "Recruta", "Agente", "Reciclador", "Guardião",
  "Especialista", "Veterano", "Elite", "Mestre",
  "Campeão", "Lenda"
];

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
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

// ─── Buscar posição no ranking ───────────────────────────────
async function buscarPosicaoRanking(uid) {
  try {
    const q    = query(collection(db, "usuarios"), orderBy("xp", "desc"));
    const snap = await getDocs(q);
    const pos  = snap.docs.findIndex(d => d.id === uid);
    return pos >= 0 ? `#${pos + 1}` : "#—";
  } catch {
    return "#—";
  }
}

// ─── Carregar perfil ─────────────────────────────────────────
async function carregarPerfil(user) {
  document.getElementById("perfilNome").textContent  = user.displayName?.split(" ")[0] || "Agente";
  document.getElementById("perfilEmail").textContent = user.email || "—";

  const pos = await buscarPosicaoRanking(user.uid);
  document.getElementById("perfilRanking").textContent = pos;

  const ref = doc(db, "usuarios", user.uid);
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();

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

// ─── Logout ──────────────────────────────────────────────────
document.getElementById("btnLogout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ─── FAQ ─────────────────────────────────────────────────────
const overlay   = document.getElementById("faqOverlay");
const btnAjuda  = document.getElementById("btnAjuda");
const btnFechar = document.getElementById("faqFechar");

btnAjuda.addEventListener("click", () => {
  overlay.classList.add("show");
});

btnFechar.addEventListener("click", () => {
  overlay.classList.remove("show");
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("show");
});

document.querySelectorAll(".faq-card").forEach(card => {
  card.querySelector(".faq-pergunta").addEventListener("click", () => {
    const estaAberto = card.classList.contains("aberto");
    document.querySelectorAll(".faq-card").forEach(c => c.classList.remove("aberto"));
    if (!estaAberto) card.classList.add("aberto");
  });
});