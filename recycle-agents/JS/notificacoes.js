// ============================================================
//  RECYCLE AGENTS — notificacoes.js  v2
//  Tipos suportados:
//    aprovado | rejeitado | nivel_up | streak_risco |
//    streak_quebrado | liga_subiu | liga_desceu |
//    rebaixamento_alerta | promocao_alerta | reset_liga
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  collection, addDoc, getDocs, updateDoc, setDoc,
  query, where, orderBy, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { calcularNivel, diasParaReset, TITULOS } from "./utils.js";
import { LIGAS, ORDEM_LIGAS, buscarParticipantesDaLiga } from "./ligas.js";

// ─── Ícones por tipo ──────────────────────────────────────────
export const ICONES_NOTIF = {
  aprovado:            "✅",
  rejeitado:           "❌",
  nivel_up:            "⚡",
  streak_risco:        "🔥",
  streak_quebrado:     "💔",
  liga_subiu:          "🏆",
  liga_desceu:         "📉",
  rebaixamento_alerta: "⚠️",
  promocao_alerta:     "🎯",
  reset_liga:          "📅",
};

// ─── Criar notificação para um usuário ───────────────────────
export async function criarNotificacao(uid, { tipo, titulo, mensagem, material }) {
  try {
    await addDoc(collection(db, "notificacoes", uid, "itens"), {
      tipo,
      titulo,
      mensagem,
      material:  material || null,
      icone:     ICONES_NOTIF[tipo] || "🔔",
      lida:      false,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.error("[Notificacoes] Erro ao criar:", e);
  }
}

// ─── Buscar notificações não lidas ────────────────────────────
export async function buscarNaoLidas(uid) {
  try {
    const q    = query(
      collection(db, "notificacoes", uid, "itens"),
      where("lida", "==", false),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Notificacoes] Erro ao buscar:", e);
    return [];
  }
}

// ─── Buscar todas as notificações (para painel) ───────────────
export async function buscarTodas(uid) {
  try {
    const q    = query(
      collection(db, "notificacoes", uid, "itens"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Notificacoes] Erro ao buscar todas:", e);
    return [];
  }
}

// ─── Marcar notificação como lida ────────────────────────────
export async function marcarComoLida(uid, notifId) {
  try {
    await updateDoc(doc(db, "notificacoes", uid, "itens", notifId), {
      lida: true,
    });
  } catch (e) {
    console.error("[Notificacoes] Erro ao marcar lida:", e);
  }
}

// ─── Marcar todas como lidas ──────────────────────────────────
export async function marcarTodasComoLidas(uid) {
  try {
    const naoLidas = await buscarNaoLidas(uid);
    await Promise.all(naoLidas.map(n => marcarComoLida(uid, n.id)));
  } catch (e) {
    console.error("[Notificacoes] Erro ao marcar todas:", e);
  }
}

// ============================================================
//  VERIFICAÇÕES AUTOMÁTICAS
//  Chamada única por sessão em app.js após carregar o usuário.
//  Controle em: notificacoes/{uid}/controle/auto
//  → evita duplicar notificações no mesmo dia.
// ============================================================

export async function verificarNotificacoesAutomaticas(uid) {
  try {
    const userSnap = await getDoc(doc(db, "usuarios", uid));
    if (!userSnap.exists()) return;
    const dados = userSnap.data();

    // Carregar documento de controle (evita repetições no mesmo dia)
    const controleRef  = doc(db, "notificacoes", uid, "controle", "auto");
    const controleSnap = await getDoc(controleRef);
    const controle     = controleSnap.exists() ? controleSnap.data() : {};

    const hoje     = new Date().toDateString(); // ex: "Thu Apr 24 2026"
    const promises = [];
    // Objeto com atualizações para o controle ao final
    const novoControle = { ...controle, ultimaVerificacao: Date.now() };

    // ── 1. Subiu de nível ─────────────────────────────────────
    // Dispara quando o nível calculado supera o último salvo no controle.
    const { nivel: nivelAtual } = calcularNivel(dados.xp || 0);
    const nivelAnterior = controle.nivelAnterior ?? nivelAtual;

    if (nivelAtual > nivelAnterior) {
      const titulo = TITULOS[Math.min(nivelAtual - 1, TITULOS.length - 1)];
      promises.push(criarNotificacao(uid, {
        tipo:     "nivel_up",
        titulo:   "Subiu de nível! ⚡",
        mensagem: `Parabéns! Você alcançou o nível ${nivelAtual} e ganhou o título "${titulo}"`,
      }));
    }
    novoControle.nivelAnterior = nivelAtual;

    // ── 2. Streak em risco ────────────────────────────────────
    // Dispara uma vez por dia se o usuário não reciclou ainda hoje.
    // FIX: campo correto é ultimoScanDia (salvo pelo scanner.js),
    // não ultimaReciclagem (campo inexistente no Firestore).
    const streak = dados.streak || 0;
    const ultimoScanDia = dados.ultimoScanDia || null;
    const recicleuHoje  = ultimoScanDia
      ? new Date(ultimoScanDia + "T00:00:00").toDateString() === hoje
      : false;

    if (streak > 0 && !recicleuHoje && controle.streakRiscoHoje !== hoje) {
      promises.push(criarNotificacao(uid, {
        tipo:     "streak_risco",
        titulo:   "Streak em risco! 🔥",
        mensagem: `Você ainda não reciclou hoje. Mantenha seu streak de ${streak} dias!`,
      }));
      novoControle.streakRiscoHoje = hoje;
    }

    // ── 3. Streak quebrado ────────────────────────────────────
    // Dispara quando o streak era > 0 no controle anterior e agora é 0.
    const streakAnterior = controle.streakAnterior ?? streak;
    if (streakAnterior > 0 && streak === 0 && controle.streakQuebradoHoje !== hoje) {
      promises.push(criarNotificacao(uid, {
        tipo:     "streak_quebrado",
        titulo:   "Streak perdido 💔",
        mensagem: "Seu streak foi resetado. Comece um novo hoje!",
      }));
      novoControle.streakQuebradoHoje = hoje;
    }
    novoControle.streakAnterior = streak;

    // ── 4. Subiu / desceu de liga (resultado do reset semanal) ─
    // O campo ultimaTemporada.modalVisto === null indica evento novo.
    const ut = dados.ultimaTemporada;
    if (ut && ut.modalVisto === null) {
      const ordemAntes  = ORDEM_LIGAS.indexOf(ut.ligaAntes  || "sucata");
      const ordemDepois = ORDEM_LIGAS.indexOf(ut.ligaDepois || "sucata");
      const nomeLiga    = LIGAS[ut.ligaDepois]?.nome || ut.ligaDepois;

      if (ordemDepois > ordemAntes) {
        promises.push(criarNotificacao(uid, {
          tipo:     "liga_subiu",
          titulo:   "Promovido de liga! 🏆",
          mensagem: `Você foi promovido para a liga ${nomeLiga}! Continue assim!`,
        }));
      } else if (ordemDepois < ordemAntes) {
        promises.push(criarNotificacao(uid, {
          tipo:     "liga_desceu",
          titulo:   "Desceu de liga 📉",
          mensagem: `Você desceu para a liga ${nomeLiga}. Recicle mais essa semana!`,
        }));
      }

      // Marcar como visto para não disparar novamente
      promises.push(
        updateDoc(doc(db, "usuarios", uid), {
          "ultimaTemporada.modalVisto": Date.now(),
        })
      );
    }

    // ── 5. Alertas de posição no ranking (uma vez por dia) ────
    if (controle.rankingAlertaHoje !== hoje) {
      const alerta = await _verificarPosicaoRanking(uid, dados);
      if (alerta) promises.push(criarNotificacao(uid, alerta));
      novoControle.rankingAlertaHoje = hoje;
    }

    // ── 6. Faltam ≤ 2 dias para o reset da liga ───────────────
    const dias = diasParaReset();
    if (dias <= 2 && controle.resetAlertaHoje !== hoje) {
      promises.push(criarNotificacao(uid, {
        tipo:     "reset_liga",
        titulo:   "Reset da liga se aproxima! 📅",
        mensagem: `Faltam ${dias} dia${dias > 1 ? "s" : ""} para o reset da liga. Dê o seu máximo!`,
      }));
      novoControle.resetAlertaHoje = hoje;
    }

    // ── Persistir tudo em paralelo ────────────────────────────
    await Promise.all(promises);
    await setDoc(controleRef, novoControle, { merge: true });

  } catch (e) {
    console.error("[Notificacoes] Erro na verificação automática:", e);
  }
}

// ─── Verificar posição no ranking da divisão ──────────────────
async function _verificarPosicaoRanking(uid, dados) {
  try {
    const liga      = dados.liga      || "sucata";
    const divisaoId = dados.divisaoId || null;

    const participantes = await buscarParticipantesDaLiga(liga, divisaoId);
    const total         = participantes.length;
    const posicao       = participantes.findIndex(p => p.id === uid) + 1;

    if (posicao === 0 || total === 0) return null;

    // Top 3 → alerta de promoção
    if (posicao <= 3) {
      return {
        tipo:     "promocao_alerta",
        titulo:   "Você está no top 3! 🎯",
        mensagem: "Você está no top 3! Mantenha o ritmo para subir de liga",
      };
    }

    // Últimos 3 → alerta de rebaixamento (só se não for a liga mais baixa)
    const idxLiga = ORDEM_LIGAS.indexOf(liga);
    if (posicao > total - 3 && idxLiga > 0) {
      const xpUsuario    = dados.xpSemana || 0;
      // Posição limítrofe: quem está exatamente fora da zona de rebaixamento
      const idxSalvacao  = total - 3 - 1; // índice 0-based do último "seguro"
      const xpSalvacao   = participantes[idxSalvacao]?.xpSemana || 0;
      const faltam       = Math.max(1, xpSalvacao - xpUsuario + 1);

      return {
        tipo:     "rebaixamento_alerta",
        titulo:   "Zona de rebaixamento! ⚠️",
        mensagem: `Você está na zona de rebaixamento! Faltam ${faltam} XP para se salvar`,
      };
    }

    return null;
  } catch (e) {
    console.error("[Notificacoes] Erro ao verificar ranking:", e);
    return null;
  }
}