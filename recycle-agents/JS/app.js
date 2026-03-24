
javascript
// ============================================================
//  RECYCLE AGENTS — app.js
//  Lógica do Dashboard (home.html)
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Redirecionar se não estiver logado ──────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  iniciarDashboard(usr);
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
];

// ─── Calcular nível a partir do XP ───────────────────────────
function calcularNivel(xp) {
  let nivel = 1;
  let xpNecessario = 100;
  let xpAcumulado = 0;

  while (xp >= xpAcumulado + xpNecessario) {
    xpAcumulado += xpNecessario;
    nivel++;
    xpNecessario = nivel * 100;
  }

  const xpNoNivel   = xp - xpAcumulado;
  const xpProximo   = xpNecessario;
  const porcentagem = Math.floor((xpNoNivel / xpProximo) * 100);

  return { nivel, xpNoNivel, xpProximo, porcentagem };
}

// ─── Atualizar UI do XP ──────────────────────────────────────
function atualizarXP(xp) {
  const { nivel, xpNoNivel, xpProximo, porcentagem } = calcularNivel(xp);

  document.getElementById("xpAtual").textContent      = xp.toLocaleString("pt-BR");
  document.getElementById("nivelAtual").textContent   = nivel;
  document.getElementById("xpProgresso").textContent  = `${xpNoNivel} / ${xpProximo} XP`;
  document.getElementById("xpPct").textContent        = `${porcentagem}%`;

  setTimeout(() => {
    document.getElementById("xpBarFill").style.width = `${porcentagem}%`;
  }, 300);
}

// ─── Atualizar missões ───────────────────────────────────────
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

// ─── Iniciar dashboard ───────────────────────────────────────
function iniciarDashboard(user) {
  const nome = user.displayName || "Agente";
  document.getElementById("nomeUsuario").textContent = nome.split(" ")[0];

  const diaDoAno = Math.floor(Date.now() / 86400000);
  const dica = DICAS[diaDoAno % DICAS.length];
  document.getElementById("dicaTexto").textContent = dica;

  const ref = doc(db, "usuarios", user.uid);
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const dados = snap.data();

    atualizarXP(dados.xp || 0);
    document.getElementById("totalItens").textContent       = dados.itensReciclados  || 0;
    document.getElementById("missoesCompletas").textContent = dados.missoesCompletas || 0;
    atualizarMissoes(dados);
  });
}
