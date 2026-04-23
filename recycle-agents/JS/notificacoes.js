// ============================================================
//  RECYCLE AGENTS — notificacoes.js
//  Sistema de notificações por usuário
//  Coleção: notificacoes/{uid}/itens/{docId}
// ============================================================

import { db } from "../FIREBASE/firebase-config.js";
import {
  collection, addDoc, getDocs, updateDoc,
  query, where, orderBy, doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Criar notificação para um usuário ───────────────────────
export async function criarNotificacao(uid, { tipo, titulo, mensagem, material }) {
  try {
    await addDoc(collection(db, "notificacoes", uid, "itens"), {
      tipo,       // "aprovado" | "rejeitado"
      titulo,
      mensagem,
      material:   material || null,
      lida:       false,
      timestamp:  Date.now(),
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
    await Promise.all(
      naoLidas.map(n => marcarComoLida(uid, n.id))
    );
  } catch (e) {
    console.error("[Notificacoes] Erro ao marcar todas:", e);
  }
}