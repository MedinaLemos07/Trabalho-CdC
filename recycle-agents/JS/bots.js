// ============================================================
//  RECYCLE AGENTS — bots.js v5
//  Bots são âncoras por liga — divisaoId salvo no Firestore
//  Cada divisão tem bots fixos + até 5 usuários reais
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  collection, doc, getDocs, setDoc, updateDoc,
  serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { AVATARES } from "./avatares.js";
import { diasParaReset } from "./utils.js";

const XP_MATERIAIS = [5, 10, 15, 20];

function gerarXPCoerente(nScans) {
  let total = 0;
  for (let i = 0; i < nScans; i++) {
    total += XP_MATERIAIS[Math.floor(Math.random() * XP_MATERIAIS.length)];
  }
  return total;
}

export const POOL_NOMES = [
  "Pedro Henrique","AnaClara_23","ShadowBR","LucasXtreme","Mariana Alves",
  "BrunoC_11","NightWolf","Julia Martins","GabrielRush","RafaMendes22",
  "SilentFox","Camila Rocha","FelipeZone","Gustavo_13","DarkPlayer",
  "Larissa Costa","JoãoVictor_21","NeoHunter","Beatriz Souza","DiegoBlaze",
  "IronCore","Amanda Silva","Thiago_88","PixelWarrior","Fernanda Lima",
  "EduardoMax","QuickStrike","Juliana Ribeiro","MatheusPlay","Andre_01",
  "GhostLine","Bruna Mendes","ViniciusRun","RedFalcon","Carlos Eduardo",
  "TurboX","Ana Clara","LucasGamer99","DeltaForce","Rafael Martins",
  "BlazeRunner","MariPlay","Rodrigo Nunes","FrostByte","GustavoForce",
  "LariZone","DanielCraft","Eduardo_77","AlphaZone","Renato Teixeira",
  "PedroShadow","BiaGamer","Marcelo Santos","JoãoHunter","Gabriel Souza",
  "CamilaXP","DiegoRibeiro7","ShadowLine","JulianaXP","MatheusBR10",
  "SilentStrike","Bruno Carvalho","AmandaPlay","Felipe Almeida","IronHunter",
  "LucasG_77","FernandaX","Vinicius Melo","GhostRunner","RafaStrike",
  "NeoStrike","LarissaXP","Eduardo Gomes","DarkFox","PedroH27",
  "MarianaXP","Gustavo Rocha","PixelStrike","AnaZone","João Victor",
  "BlazeCore","Daniel Pereira","TurboStrike","CamilaPlay","QuickHunter",
  "JulianaForce","RodrigoXP","NightStrike","BeatrizXP","CarlosM_22",
  "AlphaHunter","Diego Fernandes","FrostHunter","AndreVolt","AmandaZone",
  "BrunoXP","Rafael_99","SilentRunner","ViniciusX","Matheus Oliveira","GhostStrike",
];

function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SCANS_POR_DIA = {
  ativo:      { min: 3, max: 6 },
  medio:      { min: 1, max: 3 },
  preguicoso: { min: 0, max: 2 },
};

export const BOTS_BASE = [
  { id:"bot_s1", liga:"sucata",      personalidade:"preguicoso" },
  { id:"bot_s2", liga:"sucata",      personalidade:"medio"      },
  { id:"bot_s3", liga:"sucata",      personalidade:"preguicoso" },
  { id:"bot_s4", liga:"sucata",      personalidade:"medio"      },
  { id:"bot_s5", liga:"sucata",      personalidade:"ativo"      },
  { id:"bot_s6", liga:"sucata",      personalidade:"preguicoso" },
  { id:"bot_s7", liga:"sucata",      personalidade:"medio"      },
  { id:"bot_r1", liga:"reciclador",  personalidade:"medio"      },
  { id:"bot_r2", liga:"reciclador",  personalidade:"ativo"      },
  { id:"bot_r3", liga:"reciclador",  personalidade:"medio"      },
  { id:"bot_r4", liga:"reciclador",  personalidade:"preguicoso" },
  { id:"bot_r5", liga:"reciclador",  personalidade:"ativo"      },
  { id:"bot_r6", liga:"reciclador",  personalidade:"medio"      },
  { id:"bot_r7", liga:"reciclador",  personalidade:"preguicoso" },
  { id:"bot_g1", liga:"guardiao",    personalidade:"ativo"      },
  { id:"bot_g2", liga:"guardiao",    personalidade:"medio"      },
  { id:"bot_g3", liga:"guardiao",    personalidade:"ativo"      },
  { id:"bot_g4", liga:"guardiao",    personalidade:"medio"      },
  { id:"bot_g5", liga:"guardiao",    personalidade:"ativo"      },
  { id:"bot_g6", liga:"guardiao",    personalidade:"preguicoso" },
  { id:"bot_g7", liga:"guardiao",    personalidade:"medio"      },
  { id:"bot_e1", liga:"agente_eco",  personalidade:"ativo"      },
  { id:"bot_e2", liga:"agente_eco",  personalidade:"ativo"      },
  { id:"bot_e3", liga:"agente_eco",  personalidade:"medio"      },
  { id:"bot_e4", liga:"agente_eco",  personalidade:"ativo"      },
  { id:"bot_e5", liga:"agente_eco",  personalidade:"medio"      },
  { id:"bot_e6", liga:"agente_eco",  personalidade:"preguicoso" },
  { id:"bot_e7", liga:"agente_eco",  personalidade:"ativo"      },
  { id:"bot_l1", liga:"lenda_verde", personalidade:"ativo"      },
  { id:"bot_l2", liga:"lenda_verde", personalidade:"ativo"      },
  { id:"bot_l3", liga:"lenda_verde", personalidade:"medio"      },
  { id:"bot_l4", liga:"lenda_verde", personalidade:"ativo"      },
  { id:"bot_l5", liga:"lenda_verde", personalidade:"medio"      },
  { id:"bot_l6", liga:"lenda_verde", personalidade:"ativo"      },
  { id:"bot_l7", liga:"lenda_verde", personalidade:"preguicoso" },
];

// ─── XP por tempo de temporada ────────────────────────────────
export function calcularXPBotPorTempo(bot, diasRestantes) {
  const diasPassados = Math.max(0, 7 - diasRestantes);
  const faixa        = SCANS_POR_DIA[bot.personalidade] || SCANS_POR_DIA.medio;

  let xpTotal = 0;
  for (let d = 0; d < diasPassados; d++) {
    const chanceJogar = { ativo: 0.9, medio: 0.65, preguicoso: 0.35 }[bot.personalidade] || 0.65;
    if (Math.random() > chanceJogar) continue;
    const nScans = faixa.min + Math.floor(Math.random() * (faixa.max - faixa.min + 1));
    xpTotal += gerarXPCoerente(nScans);
  }

  const semente  = hashString(`${bot.id}_${obterChaveSemana()}`);
  const variacao = 1 + ((semente % 21) - 10) / 100;
  xpTotal = Math.round((xpTotal * variacao) / 5) * 5;
  return Math.max(0, xpTotal);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function obterChaveSemana() {
  const now         = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum     = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// ─── Inicializar bots no Firestore ────────────────────────────
// FIX v5: salva divisaoId = "{liga}_bots" no Firestore.
// Na v4 esse campo existia só no código — query por divisaoId
// nunca encontrava nenhum bot, deixando o ranking vazio.
//
// Bots não competem diretamente por divisaoId de usuário.
// A função buscarParticipantesDaLiga() busca usuários por divisaoId
// e bots por liga — mantendo os dois separados e corretos.
export async function inicializarBots() {
  const snap = await getDocs(collection(db, "bots"));
  if (!snap.empty) return;

  const nomesEmbaralhados = embaralhar(POOL_NOMES);
  const totalAvatares     = AVATARES.length;
  const diasRestantes     = diasParaReset();

  for (let i = 0; i < BOTS_BASE.length; i++) {
    const bot       = BOTS_BASE[i];
    const xpInicial = calcularXPBotPorTempo(bot, diasRestantes);

    await setDoc(doc(db, "bots", bot.id), {
      id:            bot.id,
      liga:          bot.liga,
      personalidade: bot.personalidade,
      divisaoId:     `${bot.liga}_bots`,
      nome:          nomesEmbaralhados[i % nomesEmbaralhados.length],
      xpSemana:      xpInicial,
      xpTotal:       xpInicial,
      avatarIdx:     Math.floor(Math.random() * totalAvatares),
      ultimoUpdate:  serverTimestamp(),
      criadoEm:      serverTimestamp(),
    });
  }

  console.log(`[Bots] Inicializados com divisaoId por liga`);
}

// ─── Migrar bots sem divisaoId correto ───────────────────────
export async function migrarBotsLegados() {
  const flagKey = "ra_botsMigrados_v5";
  if (localStorage.getItem(flagKey)) return;

  const snap          = await getDocs(collection(db, "bots"));
  const totalAvatares = AVATARES.length;
  const diasRestantes = diasParaReset();
  const promises      = [];

  snap.docs.forEach(docSnap => {
    const data    = docSnap.data();
    const botDef  = BOTS_BASE.find(b => b.id === docSnap.id) || { personalidade: "medio", liga: "sucata" };
    const updates = {};

    const divisaoEsperada = `${botDef.liga}_bots`;
    if (data.divisaoId !== divisaoEsperada) updates.divisaoId = divisaoEsperada;

    if (typeof data.avatarIdx !== "number") {
      updates.avatarIdx = Math.floor(Math.random() * totalAvatares);
    }

    if ((data.xpSemana === 0 || data.xpSemana === undefined) && diasRestantes < 6) {
      updates.xpSemana     = calcularXPBotPorTempo({ ...botDef, id: docSnap.id }, diasRestantes);
      updates.ultimoUpdate = serverTimestamp();
    }

    if (Object.keys(updates).length > 0) {
      promises.push(updateDoc(doc(db, "bots", docSnap.id), updates));
    }
  });

  if (promises.length > 0) {
    await Promise.all(promises);
    console.log(`[Bots] ${promises.length} bots migrados para v5`);
  }
  localStorage.setItem(flagKey, "1");
}

// ─── Atualizar XP diário ──────────────────────────────────────
export async function atualizarBotsXP() {
  const hoje          = new Date().toISOString().split("T")[0];
  const diasRestantes = diasParaReset();
  const snap          = await getDocs(collection(db, "bots"));
  const promises      = [];

  for (const docSnap of snap.docs) {
    const bot          = { id: docSnap.id, ...docSnap.data() };
    const ultimoUpdate = bot.ultimoUpdate?.toDate?.()?.toISOString().split("T")[0];
    if (ultimoUpdate === hoje) continue;

    const xpEsperado = calcularXPBotPorTempo(bot, diasRestantes);
    const xpAtual    = bot.xpSemana || 0;
    const novoXP     = Math.max(xpAtual, xpEsperado);

    promises.push(
      updateDoc(doc(db, "bots", docSnap.id), {
        xpSemana:     novoXP,
        xpTotal:      (bot.xpTotal || 0) + Math.max(0, novoXP - xpAtual),
        ultimoUpdate: serverTimestamp(),
      })
    );
  }

  if (promises.length > 0) await Promise.all(promises);
}

// ─── Buscar bots de uma liga ──────────────────────────────────
// Usado por buscarParticipantesDaLiga para completar divisões
// com menos de 12 participantes totais.
export async function buscarBotsDaLiga(liga) {
  const snap = await getDocs(
    query(collection(db, "bots"), where("liga", "==", liga))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data(), tipo: "bot" }))
    .sort((a, b) => (b.xpSemana || 0) - (a.xpSemana || 0));
}

// FIX: usar Promise.all para rodar todas as atualizações em paralelo
// em vez de sequencial (35 awaits em série → 1 await paralelo)
export async function rotacionarNomesBots() {
  const snap              = await getDocs(collection(db, "bots"));
  const nomesEmbaralhados = embaralhar(POOL_NOMES);
  const promises          = snap.docs.map((d, i) =>
    updateDoc(doc(db, "bots", d.id), {
      nome: nomesEmbaralhados[i % nomesEmbaralhados.length],
    })
  );
  await Promise.all(promises);
  console.log("[Bots] Nomes rotacionados");
}

export function calcularXPDiario(bot) {
  const faixa  = SCANS_POR_DIA[bot.personalidade] || SCANS_POR_DIA.medio;
  const chance = { ativo:0.10, medio:0.25, preguicoso:0.40 }[bot.personalidade] || 0.25;
  if (Math.random() < chance) return 0;
  const nScans = faixa.min + Math.floor(Math.random() * (faixa.max - faixa.min + 1));
  const xp     = gerarXPCoerente(nScans);
  return Math.round(xp / 5) * 5;
}