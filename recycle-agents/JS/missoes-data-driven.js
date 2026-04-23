// ============================================================
//  RECYCLE AGENTS — missoes.js
//  Lógica das missões diárias e semanais.
//  As missões são definidas em missoes-config.js — para
//  adicionar, remover ou alterar missões, edite apenas aquele
//  arquivo. Este módulo é genérico e não precisa ser alterado.
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, onSnapshot, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { MISSOES } from "./missoes-config.js";

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  gerarListasMissoes();
  ouvirMissoes(user.uid);
});

// ─── Trocar aba diária/semanal ────────────────────────────────
window.trocarTab = function(tipo) {
  document.getElementById("listaDiaria").style.display  = tipo === "diaria"  ? "flex" : "none";
  document.getElementById("listaSemanal").style.display = tipo === "semanal" ? "flex" : "none";
  document.getElementById("tabDiaria").classList.toggle("active",  tipo === "diaria");
  document.getElementById("tabSemanal").classList.toggle("active", tipo === "semanal");
};

// ─── Gerar cards de missões dinamicamente ────────────────────
// Lê MISSOES de missoes-config.js e popula as listas no HTML.
// Os containers #listaDiaria e #listaSemanal precisam existir no HTML.
function gerarListasMissoes() {
  const listaDiaria  = document.getElementById("listaDiaria");
  const listaSemanal = document.getElementById("listaSemanal");
  if (!listaDiaria || !listaSemanal) return;

  listaDiaria.innerHTML  = "";
  listaSemanal.innerHTML = "";

  MISSOES.diarias.forEach(m => {
    listaDiaria.appendChild(criarCardMissao(m));
  });

  MISSOES.semanais.forEach(m => {
    listaSemanal.appendChild(criarCardMissao(m));
  });
}

// ─── Criar card HTML de uma missão ───────────────────────────
function criarCardMissao(missao) {
  const div = document.createElement("div");
  div.className = "missao-card";
  div.id        = missao.id;
  div.innerHTML = `
    <span class="missao-card-icon">${missao.iconSvg}</span>
    <div class="missao-card-body">
      <div class="missao-card-nome">${missao.nome}</div>
      <div class="missao-card-desc">${missao.desc}</div>
      <div class="xp-bar" style="margin-bottom:8px">
        <div class="xp-bar-fill" id="${missao.id}Bar" style="width:0%"></div>
      </div>
      <div class="missao-card-footer">
        <span class="missao-card-progresso" id="${missao.id}Prog">0 / ${missao.meta}</span>
        <span class="missao-card-xp">+${missao.xp} XP</span>
      </div>
    </div>
  `;
  return div;
}

// ─── Calcular valor atual de uma missão ──────────────────────
// Missões com campo "_tiposUnicos" precisam de cálculo especial.
function valorAtual(missao, dados) {
  if (missao.campo === "_tiposUnicos") {
    return [
      (dados.papelSemana    || 0) > 0,
      (dados.plasticoSemana || 0) > 0,
      (dados.vidroSemana    || 0) > 0,
      (dados.metalSemana    || 0) > 0,
    ].filter(Boolean).length;
  }
  return dados[missao.campo] || 0;
}

// ─── Atualizar barra e progresso de uma missão ───────────────
// FIX: registra missoesCompletas no Firestore quando a missão
// chega a 100% pela primeira vez (classe "completa" ainda ausente).
function atualizarMissao(missao, atual, uid) {
  const pct  = Math.min((atual / missao.meta) * 100, 100);
  const bar  = document.getElementById(`${missao.id}Bar`);
  const prog = document.getElementById(`${missao.id}Prog`);
  const card = document.getElementById(missao.id);

  if (bar)  bar.style.width  = `${pct}%`;
  if (prog) prog.textContent = `${atual} / ${missao.meta}`;

  const jaEraCompleta = card?.classList.contains("completa");

  if (pct >= 100 && !jaEraCompleta && uid) {
    card?.classList.add("completa");
    updateDoc(doc(db, "usuarios", uid), {
      missoesCompletas: increment(1),
    }).catch(e => console.error("[Missões] Erro ao incrementar missoesCompletas:", e));
  } else if (pct >= 100) {
    card?.classList.add("completa");
  }
}

// ─── Ouvir dados do Firestore ────────────────────────────────
function ouvirMissoes(uid) {
  const ref = doc(db, "usuarios", uid);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();

    // Atualiza todas as missões dinamicamente a partir da config
    [...MISSOES.diarias, ...MISSOES.semanais].forEach(missao => {
      atualizarMissao(missao, valorAtual(missao, d), uid);
    });
  });
}