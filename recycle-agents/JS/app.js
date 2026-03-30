// ============================================================
//  RECYCLE AGENTS — app.js
//  Lógica do Dashboard (home.html)
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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
  // ♻️ Reciclagem geral
  "Uma tonelada de papel reciclado salva até 17 árvores e economiza 26.000 litros de água.",
  "O alumínio pode ser reciclado infinitas vezes sem perder qualidade.",
  "Reciclar vidro economiza 30% da energia necessária para produzi-lo do zero.",
  "O plástico leva até 400 anos para se decompor na natureza.",
  "Uma garrafa PET reciclada pode virar uma camiseta de fibra sintética.",
  "O Brasil é um dos maiores recicladores de latas de alumínio do mundo.",
  "Separar o lixo corretamente aumenta em até 60% a eficiência da reciclagem.",
  "Pilhas e baterias devem ser descartadas em pontos específicos — nunca no lixo comum.",

  // 🌍 Impacto ambiental
  "Cada quilo de plástico reciclado evita a emissão de 1,5 kg de CO₂ na atmosfera.",
  "A produção de papel reciclado usa 70% menos água que o papel virgem.",
  "Reciclar uma lata de alumínio economiza energia suficiente para uma TV rodar por 3 horas.",
  "O vidro é 100% reciclável e pode ser reprocessado indefinidamente sem perda de qualidade.",
  "Cerca de 80% do lixo eletrônico do mundo vai parar em países em desenvolvimento.",
  "Um único litro de óleo de cozinha descartado no esgoto contamina até 1 milhão de litros de água.",
  "A reciclagem de papel reduz em 74% a poluição do ar comparado à produção convencional.",
  "Embalagens Tetra Pak são recicláveis — papel, alumínio e plástico são separados no processo.",

  // 💡 Dicas práticas
  "Lave as embalagens antes de reciclar — resíduos de alimento contaminam o processo.",
  "Caixas de pizza com gordura não podem ser recicladas — separe a parte limpa da suja.",
  "Papel higiênico, guardanapo e papel toalha usados não são recicláveis.",
  "Isopor (EPS) é reciclável, mas poucos pontos de coleta aceitam — procure um específico.",
  "Tampinhas plásticas podem ser recicladas separadamente em campanhas solidárias.",
  "Frascos de cosméticos vazios e limpos são recicláveis como plástico.",
  "Papel carbono, fotografias e papéis plastificados não são recicláveis.",
  "Latas de spray vazias são recicláveis como metal — mas jamais perfure ou queime.",

  // 🌱 Curiosidades
  "A Suécia recicla tanto que importa lixo de outros países para suas usinas de energia.",
  "O Japão transforma resíduos eletrônicos em medalhas olímpicas — as de Tóquio 2020 foram feitas assim.",
  "Um jornal demora 6 semanas para se tornar papel reciclado pronto para uso.",
  "A Alemanha recicla cerca de 65% de todo o lixo gerado — uma das maiores taxas do mundo.",
  "O plástico tipo 1 (PET) e tipo 2 (PEAD) são os mais aceitos nas coletas seletivas brasileiras.",
  "Reciclar uma tonelada de plástico economiza o equivalente a 1.000 litros de petróleo.",
  "O Brasil gera cerca de 80 milhões de toneladas de resíduos sólidos por ano.",
];

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

    atualizarXP(dados.xp || 0);
    document.getElementById("totalItens").textContent       = dados.itensReciclados  || 0;
    document.getElementById("missoesCompletas").textContent = dados.missoesCompletas || 0;
    atualizarMissoes(dados);
  });
}



