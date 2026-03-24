// ============================================================
//  RECYCLE AGENTS — ranking.js
//  Ranking global com bots + usuário real
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, query, orderBy, limit, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Bots para simular competição ────────────────────────────
const BOTS = [
  { nome: "EcoWarrior",   xp: 980,  bot: true },
  { nome: "GreenHero",    xp: 850,  bot: true },
  { nome: "RecyclePro",   xp: 740,  bot: true },
  { nome: "NatureSaver",  xp: 620,  bot: true },
  { nome: "EarthGuard",   xp: 510,  bot: true },
  { nome: "BioCrusher",   xp: 430,  bot: true },
  { nome: "PlanetFirst",  xp: 370,  bot: true },
  { nome: "CleanAgent",   xp: 290,  bot: true },
  { nome: "WasteSlayer",  xp: 210,  bot: true },
  { nome: "EcoRookie",    xp: 150,  bot: true },
  { nome: "GreenNewbie",  xp: 90,   bot: true },
  { nome: "RecycleKid",   xp: 50,   bot: true },
];

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  await carregarRanking(user);
});

// ─── Carregar ranking ────────────────────────────────────────
async function carregarRanking(user) {
  // Buscar usuários reais no Firestore
  const q = query(
    collection(db, "usuarios"),
    orderBy("xp", "desc"),
    limit(15)
  );
  const snap = await getDocs(q);

  const reais = snap.docs.map(d => ({
    uid:  d.id,
    nome: d.data().nome || "Agente",
    xp:   d.data().xp   || 0,
    bot:  false,
  }));

  // Juntar reais + bots e ordenar
  const todos = [...reais, ...BOTS]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 15);

  renderizarRanking(todos, user.uid);
}

// ─── Renderizar ──────────────────────────────────────────────
function renderizarRanking(lista, meuUid) {
  const podioEl = document.getElementById("podio");
  const listaEl = document.getElementById("rankingLista");

  podioEl.innerHTML = "";
  listaEl.innerHTML = "";

  const ordem = [1, 0, 2]; // 2º, 1º, 3º no pódio (visual)
  const classes = ["segundo", "primeiro", "terceiro"];
  const medalhas = ["🥈", "🥇", "🥉"];

  // Pódio (top 3)
  ordem.forEach((idx, posVisual) => {
    const item = lista[idx];
    if (!item) return;

    const isVoce = !item.bot && item.uid === meuUid;
    const div = document.createElement("div");
    div.className = `podio-item ${classes[posVisual]}`;
    div.innerHTML = `
      <div class="podio-avatar">${isVoce ? "🧑" : "🤖"}</div>
      <div class="podio-nome">${item.nome}${item.bot ? "" : isVoce ? " (você)" : ""}</div>
      <div class="podio-xp">${item.xp} XP</div>
      <div class="podio-base">${medalhas[posVisual]}</div>
    `;
    podioEl.appendChild(div);
  });

  // Lista 4º em diante
  lista.slice(3).forEach((item, i) => {
    const pos = i + 4;
    const isVoce = !item.bot && item.uid === meuUid;
    const div = document.createElement("div");
    div.className = `ranking-item${isVoce ? " voce" : ""}`;
    div.innerHTML = `
      <span class="ranking-pos">${pos}</span>
      <span class="ranking-avatar">${isVoce ? "🧑" : "🤖"}</span>
      <div class="ranking-info">
        <div class="ranking-nome">
          ${item.nome}
          ${isVoce ? '<span class="ranking-voce-tag">você</span>' : ""}
          ${item.bot ? '<span class="bot-tag">BOT</span>' : ""}
        </div>
      </div>
      <span class="ranking-xp">${item.xp} XP</span>
    `;
    listaEl.appendChild(div);
  });
}