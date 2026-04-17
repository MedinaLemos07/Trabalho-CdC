// ============================================================
//  RECYCLE AGENTS — ligas.js v2
//  Sistema de ligas com escudos SVG
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  collection, doc, getDocs, getDoc, updateDoc,
  query, where, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Escudos SVG por liga ─────────────────────────────────────
export const ESCUDOS = {
  sucata: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 4 L76 18 L76 52 Q76 74 40 86 Q4 74 4 52 L4 18 Z" fill="#2a1a0a" stroke="#cd7f32" stroke-width="3"/>
    <path d="M40 12 L68 23 L68 50 Q68 68 40 78 Q12 68 12 50 L12 23 Z" fill="#1a0f05" stroke="#a0601e" stroke-width="1.5"/>
    <text x="40" y="52" text-anchor="middle" font-size="28" fill="#cd7f32">⛏</text>
    <text x="40" y="70" text-anchor="middle" font-family="monospace" font-size="8" fill="#a0601e" letter-spacing="1">SUCATA</text>
  </svg>`,

  reciclador: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 4 L76 18 L76 52 Q76 74 40 86 Q4 74 4 52 L4 18 Z" fill="#0a1a0a" stroke="#c0c0c0" stroke-width="3"/>
    <path d="M40 12 L68 23 L68 50 Q68 68 40 78 Q12 68 12 50 L12 23 Z" fill="#050f05" stroke="#909090" stroke-width="1.5"/>
    <text x="40" y="52" text-anchor="middle" font-size="26" fill="#c0c0c0">♻</text>
    <text x="40" y="70" text-anchor="middle" font-family="monospace" font-size="6.5" fill="#909090" letter-spacing="1">RECICLADOR</text>
  </svg>`,

  guardiao: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 4 L76 18 L76 52 Q76 74 40 86 Q4 74 4 52 L4 18 Z" fill="#1a1a00" stroke="#ffd700" stroke-width="3"/>
    <path d="M40 12 L68 23 L68 50 Q68 68 40 78 Q12 68 12 50 L12 23 Z" fill="#0f0f00" stroke="#c8a800" stroke-width="1.5"/>
    <text x="40" y="52" text-anchor="middle" font-size="26" fill="#ffd700">🌿</text>
    <text x="40" y="70" text-anchor="middle" font-family="monospace" font-size="7" fill="#c8a800" letter-spacing="1">GUARDIÃO</text>
  </svg>`,

  agente_eco: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 4 L76 18 L76 52 Q76 74 40 86 Q4 74 4 52 L4 18 Z" fill="#001a2a" stroke="#00d4ff" stroke-width="3"/>
    <path d="M40 12 L68 23 L68 50 Q68 68 40 78 Q12 68 12 50 L12 23 Z" fill="#000f1a" stroke="#009dbd" stroke-width="1.5"/>
    <text x="40" y="52" text-anchor="middle" font-size="26" fill="#00d4ff">🌊</text>
    <text x="40" y="70" text-anchor="middle" font-family="monospace" font-size="6.5" fill="#009dbd" letter-spacing="1">AGENTE ECO</text>
  </svg>`,

  lenda_verde: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 4 L76 18 L76 52 Q76 74 40 86 Q4 74 4 52 L4 18 Z" fill="#001a08" stroke="#00ff6a" stroke-width="3.5"/>
    <path d="M40 12 L68 23 L68 50 Q68 68 40 78 Q12 68 12 50 L12 23 Z" fill="#000f04" stroke="#00c44f" stroke-width="2"/>
    <path d="M40 4 L76 18 L76 52 Q76 74 40 86 Q4 74 4 52 L4 18 Z" fill="none" stroke="rgba(0,255,106,0.3)" stroke-width="6"/>
    <text x="40" y="52" text-anchor="middle" font-size="26" fill="#00ff6a">🌍</text>
    <text x="40" y="70" text-anchor="middle" font-family="monospace" font-size="6" fill="#00c44f" letter-spacing="1">LENDA VERDE</text>
  </svg>`,
};

// ─── Config das ligas ─────────────────────────────────────────
export const LIGAS = {
  sucata:      { nome:"Sucata",      cor:"#cd7f32", ordem:1 },
  reciclador:  { nome:"Reciclador",  cor:"#c0c0c0", ordem:2 },
  guardiao:    { nome:"Guardião",    cor:"#ffd700", ordem:3 },
  agente_eco:  { nome:"Agente Eco",  cor:"#00d4ff", ordem:4 },
  lenda_verde: { nome:"Lenda Verde", cor:"#00ff6a", ordem:5 },
};

export const ORDEM_LIGAS = ["sucata","reciclador","guardiao","agente_eco","lenda_verde"];

// ─── Obter liga do usuário ────────────────────────────────────
export async function obterLigaUsuario(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return "sucata";
  return snap.data().liga || "sucata";
}

// ─── Buscar participantes da liga ─────────────────────────────
export async function buscarParticipantesDaLiga(liga) {
  const lista = [];
  const usersSnap = await getDocs(query(collection(db,"usuarios"), where("liga","==",liga)));
  usersSnap.docs.forEach((d, i) => {
    const data = d.data();
    if (!data) return; // pular docs corrompidos
    lista.push({
      id: d.id,
      nome: data.nome || "Agente",
      xpSemana: data.xpSemana || 0,
      tipo: "usuario",
      avatarIdx: typeof data.avatarIdx === "number" ? data.avatarIdx : (i % 12),
    });
  });
  const botsSnap = await getDocs(query(collection(db,"bots"), where("liga","==",liga)));
  botsSnap.docs.forEach((d, i) => lista.push({
    id: d.id, nome: d.data().nome || "Agente",
    xpSemana: d.data().xpSemana || 0, tipo:"bot",
    avatarIdx: typeof d.data().avatarIdx === "number" ? d.data().avatarIdx : (i % 12),
  }));
  return lista.sort((a,b) => b.xpSemana - a.xpSemana);
}

// ─── Processar fim de semana ──────────────────────────────────
export async function processarFimDeSemana() {
  const { rotacionarNomesBots } = await import("./bots.js");
  const batch = writeBatch(db);
  for (const ligaAtual of ORDEM_LIGAS) {
    const participantes = await buscarParticipantesDaLiga(ligaAtual);
    const total = participantes.length;
    if (total === 0) continue;
    const ligaAbaixo = ORDEM_LIGAS[ORDEM_LIGAS.indexOf(ligaAtual) - 1] || null;
    const ligaAcima  = ORDEM_LIGAS[ORDEM_LIGAS.indexOf(ligaAtual) + 1] || null;
    participantes.forEach((p, i) => {
      const pos = i + 1;
      let novaLiga = ligaAtual;
      if (ligaAcima  && pos <= 3)            novaLiga = ligaAcima;
      if (ligaAbaixo && pos > total - 3)     novaLiga = ligaAbaixo;
      const col = p.tipo === "usuario" ? "usuarios" : "bots";
      batch.update(doc(db, col, p.id), {
        liga: novaLiga, xpSemana: 0,
        ...(p.tipo === "usuario" ? { xpSemanaAnterior: p.xpSemana } : {}),
      });
    });
  }
  await batch.commit();
  await rotacionarNomesBots();
  console.log("[Ligas] Reset semanal processado");
}

// ─── Verificar reset semanal ──────────────────────────────────
export async function verificarResetSemanal() {
  const controleRef  = doc(db, "sistema", "controle_semanal");
  const controleSnap = await getDoc(controleRef);
  const agora = new Date();
  if (agora.getDay() !== 0 || agora.getHours() < 23) return false;
  const ultimoReset = controleSnap.data()?.ultimoReset?.toDate?.();
  if (ultimoReset && (agora - ultimoReset) / 86400000 < 6) return false;
  await processarFimDeSemana();
  const b = writeBatch(db);
  b.set(doc(db,"sistema","controle_semanal"), { ultimoReset: serverTimestamp() });
  await b.commit();
  return true;
}