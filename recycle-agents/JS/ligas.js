// ============================================================
//  RECYCLE AGENTS — ligas.js v5
//  buscarParticipantesDaLiga: usuários por divisão + bots por liga
//  processarFimDeSemana: reagrupa usuários reais na nova liga
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  collection, doc, getDocs, getDoc, updateDoc,
  query, where, writeBatch, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

export const LIGAS = {
  sucata:      { nome:"Sucata",      cor:"#cd7f32", ordem:1 },
  reciclador:  { nome:"Reciclador",  cor:"#c0c0c0", ordem:2 },
  guardiao:    { nome:"Guardião",    cor:"#ffd700", ordem:3 },
  agente_eco:  { nome:"Agente Eco",  cor:"#00d4ff", ordem:4 },
  lenda_verde: { nome:"Lenda Verde", cor:"#00ff6a", ordem:5 },
};

export const ORDEM_LIGAS = ["sucata","reciclador","guardiao","agente_eco","lenda_verde"];

const MAX_USUARIOS_POR_DIVISAO = 5;

export async function obterLigaUsuario(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return "sucata";
  return snap.data().liga || "sucata";
}

export async function obterDivisaoUsuario(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return snap.data().divisaoId || null;
}

// ─── Buscar participantes da liga do usuário ──────────────────
//
// ARQUITETURA v5 — separação clara entre usuários e bots:
//
// Usuários reais: buscados por divisaoId (cada um compete só
//   com quem está na sua divisão)
//
// Bots: buscados por liga (são âncoras globais por liga,
//   não têm divisão de usuário — existem para completar o ranking)
//
// Regra de preenchimento:
//   - Se divisão tem menos de 12 participantes totais,
//     completar com bots da mesma liga
//   - Bots aparecem até o máximo de 12 total
//   - Prioridade sempre para usuários reais
//
export async function buscarParticipantesDaLiga(liga, divisaoId) {
  const { buscarBotsDaLiga } = await import("./bots.js");

  const lista = [];
  const MAX_TOTAL = 12;

  // 1. Usuários reais da divisão
  if (divisaoId) {
    const usersSnap = await getDocs(
      query(collection(db, "usuarios"), where("divisaoId", "==", divisaoId))
    );
    usersSnap.docs.forEach((d, i) => {
      const data = d.data();
      if (!data) return;
      lista.push({
        id:        d.id,
        nome:      data.nome || "Agente",
        xpSemana:  data.xpSemana || 0,
        tipo:      "usuario",
        avatarIdx: typeof data.avatarIdx === "number" ? data.avatarIdx : (i % 12),
      });
    });
  } else {
    // Fallback: usuário antigo sem divisaoId — busca por liga
    const usersSnap = await getDocs(
      query(collection(db, "usuarios"), where("liga", "==", liga))
    );
    usersSnap.docs.forEach((d, i) => {
      const data = d.data();
      if (!data) return;
      lista.push({
        id:        d.id,
        nome:      data.nome || "Agente",
        xpSemana:  data.xpSemana || 0,
        tipo:      "usuario",
        avatarIdx: typeof data.avatarIdx === "number" ? data.avatarIdx : (i % 12),
      });
    });
  }

  // 2. Completar com bots da liga até MAX_TOTAL
  const vagasParaBots = MAX_TOTAL - lista.length;
  if (vagasParaBots > 0) {
    const bots = await buscarBotsDaLiga(liga);
    const botsParaAdicionar = bots.slice(0, vagasParaBots);
    botsParaAdicionar.forEach((b, i) => lista.push({
      id:        b.id,
      nome:      b.nome || "Agente",
      xpSemana:  b.xpSemana || 0,
      tipo:      "bot",
      avatarIdx: typeof b.avatarIdx === "number" ? b.avatarIdx : (i % 12),
    }));
  }

  return lista.sort((a, b) => b.xpSemana - a.xpSemana);
}

// ─── Processar fim de semana ──────────────────────────────────
//
// ARQUITETURA v5 — reagrupamento de usuários reais:
//
// Problema anterior: usuários que subiam de liga ficavam com
// divisaoId da liga antiga. Na nova liga, apareciam sozinhos
// ou no ranking errado.
//
// Solução: ao processar o reset, para cada liga fazemos:
//   1. Buscar todos os usuários que vão CHEGAR nessa liga
//      (os que estavam na liga abaixo no Top 3)
//   2. Distribuir esses usuários em divisões de até 5 reais
//      (gerando novo divisaoId: "{liga}_{letra}")
//   3. Atualizar o documento do usuário com a nova liga e divisaoId
//   4. Salvar ultimaTemporada para o modal
//
// Bots não são tocados no reset — apenas têm xpSemana zerado.
//
export async function processarFimDeSemana() {
  const { rotacionarNomesBots, buscarBotsDaLiga } = await import("./bots.js");

  // ── 1. Coletar todos os usuários e calcular resultado ────────
  const usersSnap = await getDocs(collection(db, "usuarios"));
  const todos     = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Agrupar usuários por divisão atual
  const porDivisao = {};
  todos.forEach(u => {
    const div = u.divisaoId || `_liga_${u.liga || "sucata"}`;
    if (!porDivisao[div]) porDivisao[div] = [];
    porDivisao[div].push(u);
  });

  // Para cada divisão, calcular quem sobe, fica e desce
  // resultado: { uid: { novaLiga, posicaoFinal, xpFinal, ligaAntes } }
  const resultados = {};

  for (const [divisaoId, membros] of Object.entries(porDivisao)) {
    const sorted = [...membros].sort((a, b) => (b.xpSemana || 0) - (a.xpSemana || 0));
    const total  = sorted.length;

    sorted.forEach((u, i) => {
      const pos        = i + 1;
      const ligaAtual  = u.liga || "sucata";
      const idxLiga    = ORDEM_LIGAS.indexOf(ligaAtual);
      const ligaAcima  = ORDEM_LIGAS[idxLiga + 1] || null;
      const ligaAbaixo = ORDEM_LIGAS[idxLiga - 1] || null;

      let novaLiga = ligaAtual;
      if (ligaAcima  && pos <= 3)        novaLiga = ligaAcima;
      if (ligaAbaixo && pos > total - 3) novaLiga = ligaAbaixo;

      resultados[u.id] = {
        novaLiga,
        ligaAntes:    ligaAtual,
        posicaoFinal: pos,
        xpFinal:      u.xpSemana || 0,
      };
    });
  }

  // ── 2. Agrupar usuários por liga destino ─────────────────────
  // Usuários que vão para a mesma liga devem competir entre si
  const porLigaDestino = {};
  for (const [uid, res] of Object.entries(resultados)) {
    if (!porLigaDestino[res.novaLiga]) porLigaDestino[res.novaLiga] = [];
    porLigaDestino[res.novaLiga].push(uid);
  }

  // ── 3. Gerar divisões para cada liga destino ─────────────────
  // Distribuir usuários reais em grupos de até MAX_USUARIOS_POR_DIVISAO
  // Novos divisaoIds: "{liga}_A", "{liga}_B", ...
  const novosDivisaoIds = {}; // { uid: novoDivisaoId }

  for (const [liga, uids] of Object.entries(porLigaDestino)) {
    // Embaralha para misturar origens diferentes na mesma divisão
    const embaralhados = [...uids].sort(() => Math.random() - 0.5);

    let letraIdx   = 0;
    let contSlot   = 0;

    for (const uid of embaralhados) {
      if (contSlot >= MAX_USUARIOS_POR_DIVISAO) {
        letraIdx++;
        contSlot = 0;
      }
      const letra = String.fromCharCode(65 + letraIdx); // A, B, C...
      novosDivisaoIds[uid] = `${liga}_${letra}`;
      contSlot++;
    }
  }

  // ── 4. Atualizar controle de divisões no sistema ──────────────
  // Salvar qual foi a última letra usada em cada liga
  const letrasUsadas = {};
  for (const divisaoId of Object.values(novosDivisaoIds)) {
    const [liga, letra] = divisaoId.split("_").slice(0, 2).concat(
      divisaoId.split("_").slice(-1)
    );
    const ligaKey = divisaoId.replace(/_[A-Z]$/, "");
    const letraFinal = divisaoId.slice(-1);
    if (!letrasUsadas[ligaKey] || letraFinal > letrasUsadas[ligaKey]) {
      letrasUsadas[ligaKey] = letraFinal;
    }
  }

  const controleRef = doc(db, "sistema", "controle_semanal");
  const divisoesUpdate = {};
  for (const [ligaKey, ultima] of Object.entries(letrasUsadas)) {
    divisoesUpdate[`divisoes.${ligaKey}.ultima`] = ultima;
    divisoesUpdate[`divisoes.${ligaKey}.count`]  = 0;
  }

  // ── 5. Gravar tudo em batch ───────────────────────────────────
  const batch = writeBatch(db);

  for (const u of todos) {
    const res        = resultados[u.id];
    const novaDivisao = novosDivisaoIds[u.id] || u.divisaoId || `${res.novaLiga}_A`;

    batch.update(doc(db, "usuarios", u.id), {
      liga:      res.novaLiga,
      divisaoId: novaDivisao,
      xpSemana:  0,
      ultimaTemporada: {
        ligaAntes:    res.ligaAntes,
        ligaDepois:   res.novaLiga,
        posicaoFinal: res.posicaoFinal,
        xpFinal:      res.xpFinal,
        modalVisto:   null,
      },
    });
  }

  // Zerar XP dos bots (eles não mudam de liga)
  const botsSnap = await getDocs(collection(db, "bots"));
  botsSnap.docs.forEach(d => {
    batch.update(doc(db, "bots", d.id), { xpSemana: 0 });
  });

  await batch.commit();

  // Atualizar controle de divisões
  if (Object.keys(divisoesUpdate).length > 0) {
    await updateDoc(controleRef, divisoesUpdate);
  }

  await rotacionarNomesBots();
  console.log("[Ligas] Reset semanal v5 concluído — divisões reagrupadas");
}

// ─── Verificar reset semanal ──────────────────────────────────
export async function verificarResetSemanal() {
  const agora       = new Date();
  const controleRef = doc(db, "sistema", "controle_semanal");

  try {
    let deveResetar = false;

    await runTransaction(db, async (tx) => {
      const controleSnap = await tx.get(controleRef);
      const dados        = controleSnap.data() || {};
      const ultimoReset  = dados.ultimoReset?.toDate?.();
      const diasDesdeReset = ultimoReset ? (agora - ultimoReset) / 86400000 : 999;

      if (diasDesdeReset < 6) return;

      tx.set(controleRef, { ...dados, ultimoReset: serverTimestamp() }, { merge: true });
      deveResetar = true;
    });

    if (deveResetar) {
      await processarFimDeSemana();
      console.log("[Ligas] Reset concluído");
      return true;
    }
  } catch (e) {
    console.error("[Ligas] Erro ao verificar reset:", e);
  }

  return false;
}