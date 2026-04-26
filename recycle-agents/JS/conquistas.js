// ============================================================
//  RECYCLE AGENTS — conquistas.js
//  Sistema de badges/conquistas — verificação e desbloqueio
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  doc, getDoc, setDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Definição de todas as conquistas ────────────────────────
export const CONQUISTAS = [

  // 🌱 Início
  { id: "primeiro_scan",     categoria: "inicio",  icone: "🌱", nome: "Primeira Reciclagem",   desc: "Escaneie seu primeiro item reciclável.",          condicao: d => (d.itensReciclados  || 0) >= 1   },
  { id: "tutorial_completo", categoria: "inicio",  icone: "🎓", nome: "Agente Treinado",        desc: "Complete o tutorial do Recycle Agents.",          condicao: d => d.tutorialCompleto === true        },
  { id: "primeira_analise",  categoria: "inicio",  icone: "📤", nome: "Colaborador",            desc: "Envie sua primeira análise manual.",              condicao: d => (d.analisesEnviadas || 0) >= 1   },
  { id: "perfil_completo",   categoria: "inicio",  icone: "✨", nome: "Identidade Forjada",     desc: "Escolha seu avatar no perfil.",                   condicao: d => typeof d.avatarIdx === "number"   },

  // 🔥 Streaks
  { id: "streak_3",   categoria: "streak", icone: "🔥", nome: "Em Chamas",          desc: "Mantenha um streak de 3 dias.",    condicao: d => (d.melhorStreak || d.streak || 0) >= 3  },
  { id: "streak_7",   categoria: "streak", icone: "⚡", nome: "Semana Perfeita",     desc: "Mantenha um streak de 7 dias.",    condicao: d => (d.melhorStreak || d.streak || 0) >= 7  },
  { id: "streak_14",  categoria: "streak", icone: "💎", nome: "Imparável",           desc: "Mantenha um streak de 14 dias.",   condicao: d => (d.melhorStreak || d.streak || 0) >= 14 },
  { id: "streak_30",  categoria: "streak", icone: "👑", nome: "Lenda Viva",          desc: "Mantenha um streak de 30 dias.",   condicao: d => (d.melhorStreak || d.streak || 0) >= 30 },

  // ♻️ Volume
  { id: "itens_10",  categoria: "volume", icone: "♻️", nome: "Reciclador Iniciante", desc: "Recicle 10 itens.",   condicao: d => (d.itensReciclados || 0) >= 10  },
  { id: "itens_50",  categoria: "volume", icone: "🌿", nome: "Guardião Verde",       desc: "Recicle 50 itens.",   condicao: d => (d.itensReciclados || 0) >= 50  },
  { id: "itens_100", categoria: "volume", icone: "🌍", nome: "Herói do Planeta",     desc: "Recicle 100 itens.",  condicao: d => (d.itensReciclados || 0) >= 100 },
  { id: "itens_500", categoria: "volume", icone: "🚀", nome: "Força da Natureza",    desc: "Recicle 500 itens.",  condicao: d => (d.itensReciclados || 0) >= 500 },

  // 🏆 Liga
  { id: "liga_reciclador", categoria: "liga", icone: "🥈", nome: "Promovido: Reciclador", desc: "Alcance a liga Reciclador.",   condicao: d => _ligaIdx(d) >= 1 },
  { id: "liga_guardiao",   categoria: "liga", icone: "🥇", nome: "Promovido: Guardião",   desc: "Alcance a liga Guardião.",     condicao: d => _ligaIdx(d) >= 2 },
  { id: "liga_agente_eco", categoria: "liga", icone: "💚", nome: "Promovido: Agente Eco", desc: "Alcance a liga Agente Eco.",   condicao: d => _ligaIdx(d) >= 3 },
  { id: "liga_lenda",      categoria: "liga", icone: "🌟", nome: "Promovido: Lenda Verde",desc: "Alcance a liga Lenda Verde.",  condicao: d => _ligaIdx(d) >= 4 },
];

// ─── Ordem das ligas ─────────────────────────────────────────
const LIGAS_ORDEM = ["sucata", "reciclador", "guardiao", "agente_eco", "lenda_verde"];
function _ligaIdx(dados) {
  const liga = (dados.liga || "sucata").toLowerCase().replace(/\s/g, "_");
  return LIGAS_ORDEM.indexOf(liga);
}

// ─── Verificar e desbloquear conquistas ──────────────────────
// Retorna array com os IDs das conquistas recém-desbloqueadas
export async function verificarConquistas(uid, dadosUsuario) {
  try {
    // Buscar conquistas já desbloqueadas
    const conquistasRef  = collection(db, "usuarios", uid, "conquistas");
    const conquistasSnap = await getDocs(conquistasRef);
    const jaDesbloqueadas = new Set(conquistasSnap.docs.map(d => d.id));

    const novas = [];

    for (const c of CONQUISTAS) {
      if (jaDesbloqueadas.has(c.id)) continue;
      if (!c.condicao(dadosUsuario))  continue;

      // Desbloquear
      await setDoc(doc(db, "usuarios", uid, "conquistas", c.id), {
        desbloqueadaEm: Date.now(),
        nome:           c.nome,
        icone:          c.icone,
      });

      novas.push(c);
    }

    return novas;
  } catch (e) {
    console.error("[Conquistas] Erro ao verificar:", e);
    return [];
  }
}

// ─── Buscar conquistas para exibir no perfil ─────────────────
export async function buscarConquistas(uid) {
  try {
    const snap = await getDocs(collection(db, "usuarios", uid, "conquistas"));
    const desbloqueadas = new Map();
    snap.docs.forEach(d => desbloqueadas.set(d.id, d.data().desbloqueadaEm));

    return CONQUISTAS.map(c => ({
      ...c,
      desbloqueada:   desbloqueadas.has(c.id),
      desbloqueadaEm: desbloqueadas.get(c.id) || null,
    }));
  } catch (e) {
    console.error("[Conquistas] Erro ao buscar:", e);
    return CONQUISTAS.map(c => ({ ...c, desbloqueada: false, desbloqueadaEm: null }));
  }
}