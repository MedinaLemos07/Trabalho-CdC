// ============================================================
//  RECYCLE AGENTS — admin.js
//  v2.0 — fix XP + CSS redesign
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  collection, query, where, getDocs,
  doc, updateDoc, setDoc, getDoc, increment
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { criarNotificacao } from "./notificacoes.js";

// ─── Estado ───────────────────────────────────────────────────
let usuarioAtual  = null;
let analiseAtual  = null;
let todasAnalises = { produto: [], manual: [] };

// ─── XP por contribuição aprovada ─────────────────────────────
const XP_CONTRIBUICAO = {
  papel:        10,
  plastico:     15,
  vidro:        20,
  metal:        25,
  desconhecido: 5,
};

// ─── Auth + verificação admin ─────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;

  const isAdmin = await verificarAdmin(user.uid);

  if (!isAdmin) {
    document.getElementById("acessoNegado").style.display  = "flex";
    document.getElementById("adminConteudo").style.display = "none";
    return;
  }

  document.getElementById("adminConteudo").style.display = "block";
  iniciarAdmin();
});

// ─── Verificar admin ──────────────────────────────────────────
async function verificarAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

// ─── Iniciar painel ───────────────────────────────────────────
function iniciarAdmin() {
  iniciarAbas();
  iniciarModal();
  carregarAnalises();

  document.getElementById("btnSair")?.addEventListener("click", () => {
    auth.signOut().then(() => window.location.href = "login.html");
  });
}

// ─── Abas ─────────────────────────────────────────────────────
function iniciarAbas() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mostrarAba(btn.dataset.tab);
    });
  });
}

function mostrarAba(tab) {
  document.getElementById("listaProdutos").style.display = tab === "produtos" ? "block" : "none";
  document.getElementById("listaManual").style.display   = tab === "manual"   ? "block" : "none";
}

// ─── Carregar análises ────────────────────────────────────────
async function carregarAnalises() {
  const loading = document.getElementById("adminLoading");
  loading.style.display = "flex";

  try {
    const q    = query(collection(db, "analises_pendentes"), where("status", "==", "pendente"));
    const snap = await getDocs(q);

    todasAnalises = { produto: [], manual: [] };

    snap.forEach((d) => {
      const dados = { id: d.id, ...d.data() };
      if (dados.tipo === "produto") todasAnalises.produto.push(dados);
      else                          todasAnalises.manual.push(dados);
    });

    renderizarLista("produto");
    renderizarLista("manual");
    atualizarContadores();

  } catch (e) {
    console.error("[Admin] Erro ao carregar:", e);
  } finally {
    loading.style.display = "none";
    mostrarAba("produtos");
    document.getElementById("listaProdutos").style.display = "block";
  }
}

// ─── Renderizar lista ─────────────────────────────────────────
function renderizarLista(tipo) {
  const itens     = todasAnalises[tipo];
  const container = document.getElementById(tipo === "produto" ? "listaProdutosItens" : "listaManualItens");
  const vazia     = document.getElementById(tipo === "produto" ? "listaProdutosVazia" : "listaManualVazia");

  container.innerHTML = "";

  if (itens.length === 0) {
    vazia.style.display = "flex";
    return;
  }

  vazia.style.display = "none";

  itens.forEach((analise) => {
    const card = document.createElement("div");
    card.className = "analise-card";
    card.innerHTML = `
      <div class="analise-thumb">
        <img src="${analise.fotoBase64 || ''}" alt="foto" onerror="this.style.display='none'" />
      </div>
      <div class="analise-info">
        <div class="analise-nome">${analise.nomeProduto || analise.material || "—"}</div>
        <div class="analise-meta">
          <span class="badge badge-green">${analise.material}</span>
          ${analise.codigoBarra ? `<span class="analise-codigo">${analise.codigoBarra}</span>` : ""}
        </div>
        <div class="analise-usuario">👤 ${analise.nomeUsuario || "Usuário"}</div>
        <div class="analise-data">${formatarData(analise.timestamp)}</div>
      </div>
      <div class="analise-arrow">›</div>
    `;
    card.addEventListener("click", () => abrirModal(analise));
    container.appendChild(card);
  });
}

// ─── Contadores ───────────────────────────────────────────────
function atualizarContadores() {
  document.getElementById("countProdutos").textContent = todasAnalises.produto.length;
  document.getElementById("countManual").textContent   = todasAnalises.manual.length;
}

// ─── Modal ────────────────────────────────────────────────────
function iniciarModal() {
  document.getElementById("modalClose")?.addEventListener("click", fecharModal);
  document.getElementById("modalOverlay")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("modalOverlay")) fecharModal();
  });
  document.getElementById("btnConfirmar")?.addEventListener("click", confirmarAnalise);
  document.getElementById("btnRejeitar")?.addEventListener("click",  rejeitarAnalise);
}

function abrirModal(analise) {
  analiseAtual = analise;

  const fotoEl = document.getElementById("modalFoto");
  if (analise.fotoBase64) {
    fotoEl.src           = analise.fotoBase64;
    fotoEl.style.display = "block";
  } else {
    fotoEl.style.display = "none";
  }

  document.getElementById("modalInfo").innerHTML = `
    <div class="modal-row"><span class="modal-label">Usuário</span><span>${analise.nomeUsuario || "—"}</span></div>
    <div class="modal-row"><span class="modal-label">Email</span><span>${analise.emailUsuario || "—"}</span></div>
    ${analise.codigoBarra ? `<div class="modal-row"><span class="modal-label">Código</span><span class="modal-codigo">${analise.codigoBarra}</span></div>` : ""}
    ${analise.nomeProduto ? `<div class="modal-row"><span class="modal-label">Produto</span><span>${analise.nomeProduto}</span></div>` : ""}
    <div class="modal-row"><span class="modal-label">Material</span><span class="badge badge-green">${analise.material}</span></div>
    <div class="modal-row"><span class="modal-label">Tipo</span><span>${analise.tipo === "produto" ? "🔍 Produto com código" : "♻️ Reciclagem manual"}</span></div>
    ${analise.observacao ? `<div class="modal-row"><span class="modal-label">Obs.</span><span>${analise.observacao}</span></div>` : ""}
    <div class="modal-row"><span class="modal-label">XP a conceder</span><span class="text-green">+${XP_CONTRIBUICAO[analise.material] ?? 5} XP</span></div>
    <div class="modal-row"><span class="modal-label">Data</span><span>${formatarData(analise.timestamp)}</span></div>
  `;

  document.getElementById("modalOverlay").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  document.getElementById("modalOverlay").style.display = "none";
  document.body.style.overflow = "";
  analiseAtual = null;
}

// ─── Confirmar ────────────────────────────────────────────────
async function confirmarAnalise() {
  if (!analiseAtual) return;
  setModalCarregando("confirmar", true);

  try {
    // Produto com código → salvar em produtos_oficiais
    if (analiseAtual.tipo === "produto" && analiseAtual.codigoBarra) {
      await setDoc(doc(db, "produtos_oficiais", analiseAtual.codigoBarra), {
        nome:        analiseAtual.nomeProduto || "Produto",
        material:    analiseAtual.material,
        aprovadoPor: usuarioAtual.uid,
        timestamp:   Date.now(),
      });
    }

    // Atualizar status
    await updateDoc(doc(db, "analises_pendentes", analiseAtual.id), {
      status:      "aprovado",
      revisadoPor: usuarioAtual.uid,
      revisadoEm:  Date.now(),
    });

    // Notificar usuário que análise foi aprovada
    const XP_FINAL = {
      papel: 15, plastico: 20, vidro: 25, metal: 30, desconhecido: 5
    };
    await criarNotificacao(analiseAtual.uid, {
      tipo:      "aprovado",
      titulo:    "Análise aprovada! ✅",
      mensagem:  analiseAtual.tipo === "produto"
        ? `"${analiseAtual.nomeProduto}" foi adicionado ao banco de dados oficial.`
        : `Sua reciclagem de ${analiseAtual.material} foi validada.`,
      material:  analiseAtual.material,
    });

    // Conceder XP com increment (fix permissão)
    await concederXPAnalise(analiseAtual.uid, analiseAtual.material);

    removerAnaliseDaLista(analiseAtual.id, analiseAtual.tipo);
    fecharModal();
    console.log("[Admin] Análise confirmada com sucesso.");

  } catch (e) {
    console.error("[Admin] Erro ao confirmar:", e);
    alert("Erro ao confirmar. Verifique o console.");
  } finally {
    setModalCarregando("confirmar", false);
  }
}

// ─── Rejeitar ─────────────────────────────────────────────────
async function rejeitarAnalise() {
  if (!analiseAtual) return;
  setModalCarregando("rejeitar", true);

  try {
    await updateDoc(doc(db, "analises_pendentes", analiseAtual.id), {
      status:      "rejeitado",
      revisadoPor: usuarioAtual.uid,
      revisadoEm:  Date.now(),
    });

    // Notificar usuário que análise foi rejeitada
    await criarNotificacao(analiseAtual.uid, {
      tipo:     "rejeitado",
      titulo:   "Análise não aprovada ❌",
      mensagem: "Sua sugestão não pôde ser validada. Verifique se o material e a foto estão corretos e tente novamente.",
      material: null,
    });

    removerAnaliseDaLista(analiseAtual.id, analiseAtual.tipo);
    fecharModal();
    console.log("[Admin] Análise rejeitada.");

  } catch (e) {
    console.error("[Admin] Erro ao rejeitar:", e);
    alert("Erro ao rejeitar. Verifique o console.");
  } finally {
    setModalCarregando("rejeitar", false);
  }
}

// ─── Conceder XP com increment ────────────────────────────────
async function concederXPAnalise(uid, material) {
  const xp = XP_CONTRIBUICAO[material] ?? 5;

  try {
    const userRef = doc(db, "usuarios", uid);
    await updateDoc(userRef, {
      xp:              increment(xp),
      xpSemana:        increment(xp),
      itensReciclados: increment(1),
    });
    console.log(`[Admin] +${xp} XP concedido ao usuário ${uid}`);
  } catch (e) {
    console.error("[Admin] Erro ao conceder XP:", e);
    throw e;
  }
}

// ─── Remover da lista local ───────────────────────────────────
function removerAnaliseDaLista(id, tipo) {
  const chave = tipo === "produto" ? "produto" : "manual";
  todasAnalises[chave] = todasAnalises[chave].filter(a => a.id !== id);
  renderizarLista(chave);
  atualizarContadores();
}

// ─── UI helpers ───────────────────────────────────────────────
function setModalCarregando(acao, ativo) {
  const cap    = acao.charAt(0).toUpperCase() + acao.slice(1);
  const btn    = document.getElementById(`btn${cap}`);
  const texto  = document.getElementById(`btn${cap}Texto`);
  const loader = document.getElementById(`loader${cap}`);
  const outro  = document.getElementById(acao === "confirmar" ? "btnRejeitar" : "btnConfirmar");

  if (btn)    btn.disabled         = ativo;
  if (texto)  texto.style.display  = ativo ? "none"         : "inline";
  if (loader) loader.style.display = ativo ? "inline-block" : "none";
  if (outro)  outro.disabled       = ativo;
}

function formatarData(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}