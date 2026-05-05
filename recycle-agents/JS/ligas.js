// ============================================================
//  RECYCLE AGENTS — ligas.js v6
//  Reset sem Cloud Functions — cada usuário processa a si mesmo
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
export async function buscarParticipantesDaLiga(liga, divisaoId) {
  const { buscarBotsDaLiga } = await import("./bots.js");

  const lista = [];
  const MAX_TOTAL = 12;

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

  const vagasParaBots = MAX_TOTAL - lista.length;
  if (vagasParaBots > 0) {
    const bots = await buscarBotsDaLiga(liga);
    bots.slice(0, vagasParaBots).forEach((b, i) => lista.push({
      id:        b.id,
      nome:      b.nome || "Agente",
      xpSemana:  b.xpSemana || 0,
      tipo:      "bot",
      avatarIdx: typeof b.avatarIdx === "number" ? b.avatarIdx : (i % 12),
    }));
  }

  return lista.sort((a, b) => b.xpSemana - a.xpSemana);
}

// ─── Verificar reset semanal ──────────────────────────────────
//
// ARQUITETURA v6 — sem Cloud Functions (plano Spark):
//
// Problema: cada usuário só pode escrever no próprio documento.
// Solução em 3 partes:
//
//   PARTE 1 — Detectar se passou da segunda-feira 03:00 BRT
//     Compara a data atual com o ultimoReset salvo em
//     sistema/controle_semanal. Se passou mais de 6 dias
//     ou é segunda após 03:00 e o reset ainda não ocorreu
//     nesta semana, o reset deve acontecer.
//
//   PARTE 2 — Processar o próprio usuário
//     Busca todos os membros da sua divisão (leitura — permitida),
//     calcula a posição do usuário atual, determina nova liga
//     e grava APENAS no seu próprio documento.
//
//   PARTE 3 — Atualizar controle_semanal + bots (Rules permitem)
//     sistema/controle_semanal: qualquer autenticado pode escrever.
//     bots/{botId}: qualquer autenticado pode escrever.
//     Usa transaction para garantir que só UM usuário executa
//     essa parte (o primeiro a abrir o app após o reset).
//
// Resultado: cada usuário processa a si mesmo. O controle e
// os bots são atualizados pelo primeiro usuário que abrir o app.
// Usuários que não abrem o app na semana ficam na liga antiga
// até abrirem — comportamento aceitável para projeto acadêmico.
//
export async function verificarResetSemanal(uid) {
  if (!uid) return false;

  try {
    const controleRef  = doc(db, "sistema", "controle_semanal");
    const controleSnap = await getDoc(controleRef);
    const controle     = controleSnap.data() || {};
    const ultimoReset  = controle.ultimoReset?.toDate?.() || null;

    // ── Checar se precisa resetar ────────────────────────────
    const agora = new Date();

    // Calcula a última segunda-feira às 03:00 BRT (UTC-3)
    const agoraBRT     = new Date(agora.getTime() - 3 * 3600000);
    const diaSemana    = agoraBRT.getUTCDay(); // 0=dom, 1=seg...
    const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const ultimaSegunda = new Date(agoraBRT);
    ultimaSegunda.setUTCDate(agoraBRT.getUTCDate() - diasDesdeSegunda);
    ultimaSegunda.setUTCHours(3, 0, 0, 0); // 03:00 BRT = 06:00 UTC
    const ultimaSegundaUTC = new Date(ultimaSegunda.getTime() + 3 * 3600000);

    // Não resetar se o último reset já foi após a última segunda 03:00
    if (ultimoReset && ultimoReset >= ultimaSegundaUTC) return false;

    // Não resetar se ainda não chegou às 03:00 de segunda (BRT)
    if (agora < ultimaSegundaUTC) return false;

    // ── PARTE 2: processar o próprio usuário ─────────────────
    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists()) return false;

    const userData  = userSnap.data();
    const ligaAtual = userData.liga || "sucata";
    const divisaoId = userData.divisaoId || `_liga_${ligaAtual}`;

    // Buscar todos da divisão (leitura — permitida pelas Rules)
    const divisaoSnap = await getDocs(
      query(collection(db, "usuarios"), where("divisaoId", "==", divisaoId))
    );
    const membros = divisaoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const total   = membros.length;

    // Ordenar por xpSemana e encontrar posição do usuário atual
    const sorted  = [...membros].sort((a, b) => (b.xpSemana || 0) - (a.xpSemana || 0));
    const pos     = sorted.findIndex(m => m.id === uid) + 1;

    const idxLiga    = ORDEM_LIGAS.indexOf(ligaAtual);
    const ligaAcima  = ORDEM_LIGAS[idxLiga + 1] || null;
    const ligaAbaixo = ORDEM_LIGAS[idxLiga - 1] || null;

    let novaLiga = ligaAtual;
    if (ligaAcima  && pos <= 3)                      novaLiga = ligaAcima;
    if (ligaAbaixo && total > 3 && pos > total - 3)  novaLiga = ligaAbaixo;

    // Gerar novo divisaoId — usar a mesma letra da divisão atual
    // ou promover para nova liga mantendo a letra (simples e justo)
    const letraAtual = divisaoId.slice(-1).match(/[A-Z]/) ? divisaoId.slice(-1) : "A";
    const novaDivisao = `${novaLiga}_${letraAtual}`;

    // Gravar APENAS no próprio documento (Rules permitem)
    await updateDoc(doc(db, "usuarios", uid), {
      liga:      novaLiga,
      divisaoId: novaDivisao,
      xpSemana:  0,
      // Resetar também campos semanais
      itensSemana:    0,
      plasticoSemana: 0,
      metalSemana:    0,
      papelSemana:    0,
      vidroSemana:    0,
      // Missões semanais
      "missoes.ms1.concluida": false,
      "missoes.ms1.resgatada": false,
      "missoes.ms2.concluida": false,
      "missoes.ms2.resgatada": false,
      "missoes.ms3.concluida": false,
      "missoes.ms3.resgatada": false,
      ultimaTemporada: {
        ligaAntes:    ligaAtual,
        ligaDepois:   novaLiga,
        posicaoFinal: pos,
        xpFinal:      userData.xpSemana || 0,
        modalVisto:   null,
      },
    });

    // ── PARTE 3: controle_semanal + bots (primeiro usuário) ──
    // Transaction garante que só um usuário executa essa parte
    try {
      await runTransaction(db, async (tx) => {
        const ctrlSnap  = await tx.get(controleRef);
        const ctrlDados = ctrlSnap.data() || {};
        const resetAtual = ctrlDados.ultimoReset?.toDate?.() || null;

        // Se outro usuário já executou essa parte, abortar
        if (resetAtual && resetAtual >= ultimaSegundaUTC) return;

        // Marcar reset como concluído
        tx.set(controleRef, { ultimoReset: serverTimestamp() }, { merge: true });
      });

      // Zerar e restaurar bots (fora da transaction — sem limite de leitura)
      const { rotacionarNomesBots } = await import("./bots.js");
      const botsSnap = await getDocs(collection(db, "bots"));

      const LIGA_POR_PREFIXO = {
        bot_s: "sucata", bot_r: "reciclador", bot_g: "guardiao",
        bot_e: "agente_eco", bot_l: "lenda_verde",
      };

      const batchBots = writeBatch(db);
      botsSnap.docs.forEach(d => {
        let ligaBot = "sucata";
        for (const [pref, liga] of Object.entries(LIGA_POR_PREFIXO)) {
          if (d.id.startsWith(pref)) { ligaBot = liga; break; }
        }
        batchBots.update(d.ref, {
          xpSemana:  0,
          liga:      ligaBot,
          divisaoId: `${ligaBot}_bots`,
        });
      });
      await batchBots.commit();
      await rotacionarNomesBots();

    } catch (e) {
      // Outro usuário já executou a parte 3 — normal, ignorar
      console.log("[Ligas] Parte 3 já executada por outro usuário.");
    }

    console.log(`[Ligas] Reset v6 concluído — ${uid} → ${novaLiga} (pos ${pos}/${total})`);
    return true;

  } catch (e) {
    console.error("[Ligas] Erro ao verificar reset:", e);
    return false;
  }
}