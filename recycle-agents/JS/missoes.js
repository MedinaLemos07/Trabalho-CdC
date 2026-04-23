// ============================================================
//  RECYCLE AGENTS — missoes.js
//  Lógica das missões diárias e semanais com sistema de resgate.
//  Reset diário e semanal feito no front-end (plano Spark).
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, onSnapshot, updateDoc, increment, getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { MISSOES } from "./missoes-config.js";

// ─── UID global ───────────────────────────────────────────────
let _uid = null;

// ─── Expor trocarTab no window ANTES do auth ─────────────────
window.trocarTab = function (tipo) {
  const listaDiaria  = document.getElementById("listaDiaria");
  const listaSemanal = document.getElementById("listaSemanal");
  const tabDiaria    = document.getElementById("tabDiaria");
  const tabSemanal   = document.getElementById("tabSemanal");

  if (listaDiaria)  listaDiaria.style.display  = tipo === "diaria"  ? "flex" : "none";
  if (listaSemanal) listaSemanal.style.display = tipo === "semanal" ? "flex" : "none";
  if (tabDiaria)    tabDiaria.classList.toggle("active",  tipo === "diaria");
  if (tabSemanal)   tabSemanal.classList.toggle("active", tipo === "semanal");
};

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  _uid = user.uid;
  gerarListasMissoes();
  await verificarEResetar(_uid);
  ouvirMissoes(_uid);
});

// ─── Pegar segunda-feira da semana atual (YYYY-MM-DD) ─────────
function getSegundaAtual() {
  const hoje = new Date();
  const dia  = hoje.getDay();
  const diff = (dia === 0 ? -6 : 1 - dia);
  const seg  = new Date(hoje);
  seg.setDate(hoje.getDate() + diff);
  return seg.toISOString().split("T")[0];
}

// ─── Verificar e resetar missões e streak se necessário ───────
async function verificarEResetar(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return;

  const dados   = snap.data();
  const hoje    = new Date().toISOString().split("T")[0];
  const ontem   = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const segunda = getSegundaAtual();
  const update  = {};

  // ── Reset diário ──────────────────────────────────────────
  if ((dados.ultimoResetDiario || "") !== hoje) {
    update.itensDia    = 0;
    update.plasticoDia = 0;
    update.metalDia    = 0;
    update.papelDia    = 0;
    update.vidroDia    = 0;
    update.ultimoResetDiario = hoje;

    MISSOES.diarias.forEach((m) => {
      update[`missoes.${m.id}.concluida`] = false;
      update[`missoes.${m.id}.resgatada`] = false;
    });

    console.log("[Missões] Reset diário aplicado.");
  }

  // ── Reset semanal ─────────────────────────────────────────
  if ((dados.ultimoResetSemanal || "") !== segunda) {
    update.itensSemana    = 0;
    update.plasticoSemana = 0;
    update.metalSemana    = 0;
    update.papelSemana    = 0;
    update.vidroSemana    = 0;
    update.xpSemana       = 0;
    update.ultimoResetSemanal = segunda;

    MISSOES.semanais.forEach((m) => {
      update[`missoes.${m.id}.concluida`] = false;
      update[`missoes.${m.id}.resgatada`] = false;
    });

    console.log("[Missões] Reset semanal aplicado.");
  }

  // ── Reset streak ──────────────────────────────────────────
  // Zera o streak se o último scan não foi hoje nem ontem
  const ultimoScan = dados.ultimoScanDia || "";
  if (ultimoScan !== hoje && ultimoScan !== ontem && ultimoScan !== "") {
    update.streak = 0;
    console.log("[Missões] Streak zerado por inatividade.");
  }

  if (Object.keys(update).length > 0) {
    await updateDoc(userRef, update);
  }
}

// ─── Gerar cards de missões dinamicamente ────────────────────
function gerarListasMissoes() {
  const listaDiaria  = document.getElementById("listaDiaria");
  const listaSemanal = document.getElementById("listaSemanal");
  if (!listaDiaria || !listaSemanal) return;

  listaDiaria.innerHTML  = "";
  listaSemanal.innerHTML = "";

  MISSOES.diarias.forEach(m  => listaDiaria.appendChild(criarCardMissao(m)));
  MISSOES.semanais.forEach(m => listaSemanal.appendChild(criarCardMissao(m)));
}

// ─── Criar card HTML de uma missão ───────────────────────────
function criarCardMissao(missao) {
  const div = document.createElement("div");
  div.className = "missao-card";
  div.id        = missao.id;

  div.innerHTML =
    `<span class="missao-card-icon">${missao.iconSvg}</span>` +
    `<div class="missao-card-body">` +
      `<div class="missao-card-nome">${missao.nome}</div>` +
      `<div class="missao-card-desc">${missao.desc}</div>` +
      `<div class="xp-bar" style="margin-bottom:8px">` +
        `<div class="xp-bar-fill" id="${missao.id}Bar" style="width:0%"></div>` +
      `</div>` +
      `<div class="missao-card-footer">` +
        `<span class="missao-card-progresso" id="${missao.id}Prog">0 / ${missao.meta}</span>` +
        `<span class="missao-card-xp">+${missao.xp} XP</span>` +
      `</div>` +
      `<button class="missao-btn-resgatar estado-pendente" id="${missao.id}Btn" disabled>Pendente</button>` +
    `</div>`;

  return div;
}

// ─── Calcular valor atual de uma missão ──────────────────────
function valorAtual(missao, dados) {
  if (missao.campo === "_tiposUnicos") {
    let count = 0;
    if ((dados.papelSemana    || 0) > 0) count++;
    if ((dados.plasticoSemana || 0) > 0) count++;
    if ((dados.vidroSemana    || 0) > 0) count++;
    if ((dados.metalSemana    || 0) > 0) count++;
    return count;
  }
  return dados[missao.campo] || 0;
}

// ─── Atualizar card com estado vindo do Firestore ────────────
function atualizarMissao(missao, atual, estadoFirestore) {
  const pct  = Math.min((atual / missao.meta) * 100, 100);
  const bar  = document.getElementById(`${missao.id}Bar`);
  const prog = document.getElementById(`${missao.id}Prog`);
  const card = document.getElementById(missao.id);
  const btn  = document.getElementById(`${missao.id}Btn`);

  if (bar)  bar.style.width  = `${pct}%`;
  if (prog) prog.textContent = `${atual} / ${missao.meta}`;

  if (!btn || !card) return;

  const concluida = pct >= 100;
  const resgatada = estadoFirestore?.resgatada === true;

  btn.classList.remove("estado-pendente", "estado-resgatar", "estado-resgatado");

  if (resgatada) {
    btn.textContent = "Completado";
    btn.classList.add("estado-resgatado");
    btn.disabled = true;
    btn.onclick  = null;
    card.classList.add("completa");
  } else if (concluida) {
    btn.textContent = "Resgatar";
    btn.classList.add("estado-resgatar");
    btn.disabled = false;
    card.classList.remove("completa");
    btn.onclick = () => resgatarMissao(missao);
  } else {
    btn.textContent = "Pendente";
    btn.classList.add("estado-pendente");
    btn.disabled = true;
    btn.onclick  = null;
    card.classList.remove("completa");
  }
}

// ─── Resgatar missão ─────────────────────────────────────────
async function resgatarMissao(missao) {
  if (!_uid) return;

  const btn = document.getElementById(`${missao.id}Btn`);
  if (btn) {
    btn.disabled    = true;
    btn.textContent = "...";
  }

  const userRef = doc(db, "usuarios", _uid);

  try {
    await updateDoc(userRef, {
      xp:               increment(missao.xp),
      xpSemana:         increment(missao.xp),
      missoesCompletas: increment(1),
      [`missoes.${missao.id}.concluida`]: true,
      [`missoes.${missao.id}.resgatada`]: true,
    });

    if (window.Swal) {
      Swal.fire({
        icon:              "success",
        title:             `+${missao.xp} XP`,
        text:              `Missão "${missao.nome}" completada!`,
        background:        "#0d1117",
        color:             "#e6edf3",
        confirmButtonColor:"#00ff6a",
        timer:             2000,
        timerProgressBar:  true,
        showConfirmButton: false,
      });
    }
  } catch (e) {
    console.error("[Missões] Erro ao resgatar:", e);
    if (btn) {
      btn.disabled    = false;
      btn.textContent = "Resgatar";
    }
  }
}

// ─── Ouvir dados do Firestore ────────────────────────────────
function ouvirMissoes(uid) {
  const ref = doc(db, "usuarios", uid);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    const estadosMissoes = d.missoes || {};

    const todasMissoes = MISSOES.diarias.concat(MISSOES.semanais);
    for (let i = 0; i < todasMissoes.length; i++) {
      const m = todasMissoes[i];
      atualizarMissao(m, valorAtual(m, d), estadosMissoes[m.id]);
    }
  });
}