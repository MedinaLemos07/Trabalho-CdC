// ============================================================
//  RECYCLE AGENTS — missoes.js
//  Lógica das missões diárias e semanais
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  ouvirMissoes(user.uid);
});

// ─── Trocar no tab diária/semanal ───────────────────────────────
window.trocarTab = function(tipo) {
  document.getElementById("listaDiaria").style.display  = tipo === "diaria"  ? "flex" : "none";
  document.getElementById("listaSemanal").style.display = tipo === "semanal" ? "flex" : "none";
  document.getElementById("tabDiaria").classList.toggle("active", tipo === "diaria");
  document.getElementById("tabSemanal").classList.toggle("active", tipo === "semanal");
};

//talvez n funcione na hora de trocar pro semanal, mas tem la//

// ─── Atualizar barra e progresso ─────────────────────────────
function atualizarMissao(id, atual, meta) {
  const pct = Math.min((atual / meta) * 100, 100);
  const bar  = document.getElementById(`${id}Bar`);
  const prog = document.getElementById(`${id}Prog`);
  if (bar)  bar.style.width = `${pct}%`;
  if (prog) prog.textContent = `${atual} / ${meta}`;
  if (pct >= 100) document.getElementById(id)?.classList.add("completa");
}

// ─── Ouvir dados do Firestore ────────────────────────────────
function ouvirMissoes(uid) {
  const ref = doc(db, "usuarios", uid);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();

    const itensDia    = d.itensDia     || 0;
    const plasticoDia = d.plasticoDia  || 0;
    const metalDia    = d.metalDia     || 0;
    const itensSemana = d.itensSemana  || 0;
    const streak      = d.streak       || 0;

    // Tipos únicos reciclados na semana
    const tiposUnicos = [
      d.papelSemana    > 0,
      d.plasticoSemana > 0,
      d.vidroSemana    > 0,
      d.metalSemana    > 0,
    ].filter(Boolean).length;

    // Diárias
    atualizarMissao("md1", itensDia,    3);
    atualizarMissao("md2", plasticoDia, 1);
    atualizarMissao("md3", metalDia,    1);

    // Semanais
    atualizarMissao("ms1", itensSemana, 10);
    atualizarMissao("ms2", tiposUnicos, 4);
    atualizarMissao("ms3", streak,      3);
  });
}
    // aqui eu me consagrei pprt,
    //  23 minutos pra fazer e mais uns 10 arrumando a praga da autenticacao com o db q ainda n existe//
        //oq esse streak ta fazendo ai man, por isso o botao dos semanais n pega prr    // no semanal talvez quebre o streak pq n aprendi a resetar ele, mas ta la pra mostrar que eu tentei fazer algo mais complexo, se der ruim deu ruim e ja era.===