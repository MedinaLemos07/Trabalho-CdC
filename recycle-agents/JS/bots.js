// ============================================================
//  RECYCLE AGENTS — bots.js v2
//  Nomes mistos (reais + gamers) com rotação aleatória semanal
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  collection, doc, getDocs, setDoc, updateDoc,
  serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Pool de nomes (reais + gamers misturados) ────────────────
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

// ─── Embaralhar array (Fisher-Yates) ──────────────────────────
function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Estrutura base dos bots (35 bots, 7 por liga) ────────────
const BOTS_BASE = [
  { id:"bot_s1", liga:"sucata",      personalidade:"preguicoso", xpBase:10 },
  { id:"bot_s2", liga:"sucata",      personalidade:"medio",      xpBase:10 },
  { id:"bot_s3", liga:"sucata",      personalidade:"preguicoso", xpBase:5  },
  { id:"bot_s4", liga:"sucata",      personalidade:"medio",      xpBase:10 },
  { id:"bot_s5", liga:"sucata",      personalidade:"ativo",      xpBase:15 },
  { id:"bot_s6", liga:"sucata",      personalidade:"preguicoso", xpBase:5  },
  { id:"bot_s7", liga:"sucata",      personalidade:"medio",      xpBase:10 },

  { id:"bot_r1", liga:"reciclador",  personalidade:"medio",      xpBase:20 },
  { id:"bot_r2", liga:"reciclador",  personalidade:"ativo",      xpBase:25 },
  { id:"bot_r3", liga:"reciclador",  personalidade:"medio",      xpBase:20 },
  { id:"bot_r4", liga:"reciclador",  personalidade:"preguicoso", xpBase:15 },
  { id:"bot_r5", liga:"reciclador",  personalidade:"ativo",      xpBase:30 },
  { id:"bot_r6", liga:"reciclador",  personalidade:"medio",      xpBase:20 },
  { id:"bot_r7", liga:"reciclador",  personalidade:"preguicoso", xpBase:15 },

  { id:"bot_g1", liga:"guardiao",    personalidade:"ativo",      xpBase:30 },
  { id:"bot_g2", liga:"guardiao",    personalidade:"medio",      xpBase:30 },
  { id:"bot_g3", liga:"guardiao",    personalidade:"ativo",      xpBase:35 },
  { id:"bot_g4", liga:"guardiao",    personalidade:"medio",      xpBase:30 },
  { id:"bot_g5", liga:"guardiao",    personalidade:"ativo",      xpBase:40 },
  { id:"bot_g6", liga:"guardiao",    personalidade:"preguicoso", xpBase:20 },
  { id:"bot_g7", liga:"guardiao",    personalidade:"medio",      xpBase:25 },

  { id:"bot_e1", liga:"agente_eco",  personalidade:"ativo",      xpBase:45 },
  { id:"bot_e2", liga:"agente_eco",  personalidade:"ativo",      xpBase:50 },
  { id:"bot_e3", liga:"agente_eco",  personalidade:"medio",      xpBase:40 },
  { id:"bot_e4", liga:"agente_eco",  personalidade:"ativo",      xpBase:50 },
  { id:"bot_e5", liga:"agente_eco",  personalidade:"medio",      xpBase:40 },
  { id:"bot_e6", liga:"agente_eco",  personalidade:"preguicoso", xpBase:35 },
  { id:"bot_e7", liga:"agente_eco",  personalidade:"ativo",      xpBase:55 },

  { id:"bot_l1", liga:"lenda_verde", personalidade:"ativo",      xpBase:65 },
  { id:"bot_l2", liga:"lenda_verde", personalidade:"ativo",      xpBase:70 },
  { id:"bot_l3", liga:"lenda_verde", personalidade:"medio",      xpBase:60 },
  { id:"bot_l4", liga:"lenda_verde", personalidade:"ativo",      xpBase:75 },
  { id:"bot_l5", liga:"lenda_verde", personalidade:"medio",      xpBase:60 },
  { id:"bot_l6", liga:"lenda_verde", personalidade:"ativo",      xpBase:70 },
  { id:"bot_l7", liga:"lenda_verde", personalidade:"preguicoso", xpBase:50 },
];

// ─── Calcular XP diário ───────────────────────────────────────
export function calcularXPDiario(bot) {
  const dia = new Date().getDay();
  const fds = dia === 0 || dia === 6;
  const chance = { ativo:0.10, medio:0.25, preguicoso:0.40 }[bot.personalidade] || 0.25;
  if (Math.random() < chance) return 0;

  // Multiplica por um número inteiro aleatório de 1 a 4 para garantir múltiplo de 5
  const multiplicador = Math.floor(Math.random() * 4) + 1;
  let xp = bot.xpBase * multiplicador;

  // Bônus de fim de semana: soma mais 5
  if (fds && bot.personalidade === "ativo") xp += 5;

  // Garante sempre múltiplo de 5, mínimo 5
  xp = Math.max(5, Math.round(xp / 5) * 5);
  return xp;
}

// ─── Inicializar bots (com nomes aleatórios) ──────────────────
export async function inicializarBots() {
  const snap = await getDocs(collection(db, "bots"));
  if (!snap.empty) return;

  const nomesEmbaralhados = embaralhar(POOL_NOMES);
  for (let i = 0; i < BOTS_BASE.length; i++) {
    const bot = BOTS_BASE[i];
    const avatarSeed  = Math.random().toString(36).substring(2, 10);
    const avatarStyle = ["adventurer","avataaars","big-ears","bottts","fun-emoji","lorelei","micah","open-peeps","personas","pixel-art"][Math.floor(Math.random()*10)];
    await setDoc(doc(db, "bots", bot.id), {
      ...bot,
      nome:         nomesEmbaralhados[i % nomesEmbaralhados.length],
      xpSemana:     0,
      xpTotal:      0,
      avatarSeed,
      avatarStyle,
      ultimoUpdate: null,
      criadoEm:     serverTimestamp(),
    });
  }
  console.log("[Bots] Inicializados com nomes aleatórios");
}

// ─── Rotacionar nomes semanalmente ────────────────────────────
export async function rotacionarNomesBots() {
  const snap = await getDocs(collection(db, "bots"));
  const nomesEmbaralhados = embaralhar(POOL_NOMES);
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i++) {
    await updateDoc(doc(db, "bots", docs[i].id), {
      nome: nomesEmbaralhados[i % nomesEmbaralhados.length],
    });
  }
  console.log("[Bots] Nomes rotacionados para nova semana");
}

// ─── Atualizar XP diário dos bots ────────────────────────────
export async function atualizarBotsXP() {
  const hoje = new Date().toISOString().split("T")[0];
  const snap = await getDocs(collection(db, "bots"));
  for (const docSnap of snap.docs) {
    const bot = docSnap.data();
    const ultimoUpdate = bot.ultimoUpdate?.toDate?.()?.toISOString().split("T")[0];
    if (ultimoUpdate === hoje) continue;
    const xpGanho = calcularXPDiario(bot);
    await updateDoc(doc(db, "bots", docSnap.id), {
      xpSemana:    (bot.xpSemana || 0) + (xpGanho),
      xpTotal:     (bot.xpTotal  || 0) + (xpGanho),
      ultimoUpdate: serverTimestamp(),
    });
  }
}

// ─── Buscar bots de uma liga ──────────────────────────────────
export async function buscarBotsDaLiga(liga) {
  const snap = await getDocs(collection(db, "bots"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(b => b.liga === liga)
    .sort((a, b) => (b.xpSemana || 0) - (a.xpSemana || 0));
}