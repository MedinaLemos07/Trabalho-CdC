// ============================================================
//  RECYCLE AGENTS — scanner.js
//  v4.3 — lógica original restaurada + otimizações de performance
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc, increment, setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { verificarConquistas } from "./conquistas.js";

// ─── Materiais ────────────────────────────────────────────────
const MATERIAIS = {
  papel:        { nome: "Papel",        xp: 5,  icon: "📄", tipo: "papel"        },
  plastico:     { nome: "Plástico",     xp: 10, icon: "🧴", tipo: "plastico"     },
  vidro:        { nome: "Vidro",        xp: 15, icon: "🍶", tipo: "vidro"        },
  metal:        { nome: "Metal",        xp: 20, icon: "🥫", tipo: "metal"        },
  desconhecido: { nome: "Desconhecido", xp: 2,  icon: "❓", tipo: "desconhecido" },
};

// ─── Configuração de precisão ─────────────────────────────────
const CONFIRMACOES_NECESSARIAS = 3;
const confirmacoesMap   = {};
let ultimoCodigoValido  = null;
let processando         = false;

let usuarioAtual         = null;
let scanAtivo            = true;
let quaggaRodando        = false;
let onDetectedRegistered = false;

// ─── Auth ─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;
  iniciarScanner();
});

// ─── Detectar ambiente ────────────────────────────────────────
// Retorna true se está rodando num celular real (não webcam/desktop).
// Usado para ajustar as configurações do QuaggaJS automaticamente.
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── Iniciar câmera ───────────────────────────────────────────
function iniciarScanner() {
  const status = document.getElementById("cameraStatus");
  const mobile = isMobile();

  for (const key in confirmacoesMap) delete confirmacoesMap[key];
  ultimoCodigoValido = null;
  processando        = false;

  if (quaggaRodando) { Quagga.stop(); quaggaRodando = false; }

  // Configurações adaptativas:
  //
  // MOBILE (câmera traseira com autofoco):
  //   - resolução alta (1280x720) para capturar barcodes com clareza
  //   - frequency 8: frames espaçados, câmera tem tempo de focar
  //   - patchSize "large": melhor para EAN-13 em embalagens brasileiras
  //   - halfSample false: resolução completa, sem perda de detalhe
  //
  // DESKTOP/LIVE SERVER (webcam sem autofoco):
  //   - resolução menor (640x480) para não sobrecarregar
  //   - frequency 10: um pouco mais rápido pois webcam é estável
  //   - patchSize "medium": webcam não tem zoom, barcode ocupa área menor
  //   - halfSample true: alivia processamento na webcam já limitada
  const config = mobile
    ? { width: 1280, height: 720, frequency: 8,  patchSize: "large",  halfSample: false }
    : { width: 640,  height: 480, frequency: 10, patchSize: "medium", halfSample: true  };

  console.log(`[Scanner] Modo: ${mobile ? "📱 mobile" : "💻 desktop"} — config:`, config);

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.getElementById("viewfinder-wrap"),
      constraints: {
        facingMode: "environment",
        width:      { ideal: config.width  },
        height:     { ideal: config.height },
        focusMode:  "continuous",
      },
    },
    decoder: {
      readers: [
        "ean_reader",
        "ean_8_reader",
        "upc_reader",
        "upc_e_reader",
      ],
      multiple: false,
    },
    locate:   true,
    numOfWorkers: navigator.hardwareConcurrency
      ? Math.min(navigator.hardwareConcurrency, 4)
      : 2,
    frequency: config.frequency,
    locator: {
      patchSize:  config.patchSize,
      halfSample: config.halfSample,
    },
  }, (err) => {
    if (err) {
      console.error("[Scanner]", err);
      if (status) status.textContent = "❌ Câmera indisponível — use o Live Server";
      return;
    }
    Quagga.start();
    quaggaRodando = true;
    if (status) status.textContent = "✅ Câmera ativa — escaneando...";

    setTimeout(() => {
      try {
        const canvasLive = document.querySelector("#viewfinder-wrap canvas");
        if (canvasLive) canvasLive.getContext("2d", { willReadFrequently: true });
      } catch (e) { /* ignora */ }
    }, 500);

    if (!onDetectedRegistered) {
      Quagga.onDetected(onCodigoDetectado);
      onDetectedRegistered = true;
    }
  });

  Quagga.onProcessed((result) => {
    const ctx    = Quagga.canvas.ctx.overlay;
    const canvas = Quagga.canvas.dom.overlay;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result?.boxes) {
      result.boxes
        .filter(b => b !== result.box)
        .forEach(box => {
          Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, ctx, {
            color: "rgba(0,255,106,0.3)", lineWidth: 1
          });
        });
    }

    if (result?.box) {
      Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
        color: "#00ff6a", lineWidth: 2
      });
    }
  });
}

// ─── Validar EAN-13 ───────────────────────────────────────────
function validarEAN13(codigo) {
  if (codigo.length !== 13) return false;
  if (!/^\d+$/.test(codigo)) return false;
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (soma % 10)) % 10 === parseInt(codigo[12]);
}

// ─── Validar EAN-8 ────────────────────────────────────────────
function validarEAN8(codigo) {
  if (codigo.length !== 8) return false;
  if (!/^\d+$/.test(codigo)) return false;
  let soma = 0;
  for (let i = 0; i < 7; i++) {
    soma += parseInt(codigo[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (soma % 10)) % 10 === parseInt(codigo[7]);
}

// ─── Validar UPC-A ────────────────────────────────────────────
function validarUPC(codigo) {
  if (codigo.length !== 12) return false;
  if (!/^\d+$/.test(codigo)) return false;
  let soma = 0;
  for (let i = 0; i < 11; i++) {
    soma += parseInt(codigo[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (soma % 10)) % 10 === parseInt(codigo[11]);
}

// ─── Verificar código ─────────────────────────────────────────
function codigoValido(codigo) {
  if (!codigo || typeof codigo !== "string") return false;
  if (!/^\d+$/.test(codigo)) return false;
  if (codigo.length === 13) return validarEAN13(codigo);
  if (codigo.length === 8)  return validarEAN8(codigo);
  if (codigo.length === 12) return validarUPC(codigo);
  return false;
}

// ─── Normalizar código ────────────────────────────────────────
// FIX: o QuaggaJS às vezes lê o mesmo EAN-13 com zero à esquerda
// suprimido (UPC-A de 12 dígitos) ou com variações entre frames.
// Normalizamos para sempre comparar no mesmo formato:
//   - UPC-A (12) → EAN-13 (13) adicionando "0" na frente
//   - EAN-8 e EAN-13 ficam como estão
function normalizarCodigo(codigo) {
  if (codigo.length === 12) return "0" + codigo; // UPC-A → EAN-13
  return codigo;
}

// ─── Código detectado ─────────────────────────────────────────
async function onCodigoDetectado(result) {
  if (!scanAtivo || processando) return;

  const codigoRaw = result?.codeResult?.code;
  if (!codigoRaw) return;

  if (!codigoValido(codigoRaw)) return;

  // FIX: normaliza antes de comparar — evita reset do contador
  // quando o mesmo produto é lido como UPC-A num frame e EAN-13
  // no próximo (diferença só do zero à esquerda).
  const codigo = normalizarCodigo(codigoRaw);

  // Zera confirmações apenas se trocou de código válido
  if (ultimoCodigoValido && ultimoCodigoValido !== codigo) {
    for (const key in confirmacoesMap) delete confirmacoesMap[key];
  }
  ultimoCodigoValido = codigo;

  confirmacoesMap[codigo] = (confirmacoesMap[codigo] || 0) + 1;
  const count = confirmacoesMap[codigo];

  const status = document.getElementById("cameraStatus");
  if (count < CONFIRMACOES_NECESSARIAS) {
    if (status) {
      const pct = Math.round((count / CONFIRMACOES_NECESSARIAS) * 100);
      status.textContent = `🔄 Lendo... ${pct}%`;
    }
    return;
  }

  processando   = true;
  scanAtivo     = false;
  Quagga.stop();
  quaggaRodando = false;

  console.log(`[Scanner] Código confirmado ${count}x: ${codigo}`);
  await processarCodigo(codigo);
}

// ─── Processar código ─────────────────────────────────────────
async function processarCodigo(codigo) {
  const hoje      = new Date().toISOString().split("T")[0];
  const chaveDoc  = `${usuarioAtual.uid}_${codigo}_${hoje}`;
  const limiteRef = doc(db, "scans", chaveDoc);

  const limiteSnap = await getDoc(limiteRef);
  const scanCount  = limiteSnap.exists() ? (limiteSnap.data().count || 0) : 0;

  if (scanCount >= 2) {
    mostrarAvisoLimite();
    setTimeout(() => reiniciarScanner(), 3000);
    return;
  }

  setStatus("🔍 Buscando produto...");

  try {
    const prodRef  = doc(db, "produtos_oficiais", codigo);
    const prodSnap = await getDoc(prodRef);

    if (prodSnap.exists()) {
      const dados    = prodSnap.data();
      const material = MATERIAIS[dados.material] ?? MATERIAIS.desconhecido;

      await registrarScan(limiteRef, scanCount, codigo, dados.nome, dados.material, "firestore");
      await atualizarUsuario(material);
      await atualizarStreak();
      verificarConquistasPosScan();

      mostrarResultado(material, dados.nome);
      animarXPGanho(material.xp);
      return;
    }
  } catch (e) {
    console.warn("[Scanner] Erro Firestore:", e);
  }

  mostrarProdutoNaoEncontrado(codigo);
}

// ─── Registrar scan ───────────────────────────────────────────
async function registrarScan(limiteRef, scanCount, codigo, nomeProduto, material, fonte) {
  const hoje = new Date().toISOString().split("T")[0];
  await setDoc(limiteRef, {
    count: scanCount + 1, codigoBarra: codigo,
    nomeProduto, material, fonte,
    uid: usuarioAtual.uid, data: hoje, timestamp: Date.now(),
  }, { merge: true });
}

// ─── Atualizar usuário ────────────────────────────────────────
async function atualizarUsuario(material) {
  const userRef = doc(db, "usuarios", usuarioAtual.uid);
  await updateDoc(userRef, {
    xp:              increment(material.xp),
    xpSemana:        increment(material.xp),
    itensReciclados: increment(1),
    itensDia:        increment(1),
    itensSemana:     increment(1),
    [`${material.tipo}Dia`]:    increment(1),
    [`${material.tipo}Semana`]: increment(1),
  });
}

// ─── Streak ───────────────────────────────────────────────────
async function atualizarStreak() {
  const userRef = doc(db, "usuarios", usuarioAtual.uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return;

  const dados  = snap.data();
  const hoje   = new Date().toISOString().split("T")[0];
  const ultimo = dados.ultimoScanDia || "";
  if (ultimo === hoje) return;

  const ontem        = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const novoStreak   = ultimo === ontem ? (dados.streak || 0) + 1 : 1;
  const melhorStreak = Math.max(novoStreak, dados.melhorStreak || 0);

  await updateDoc(userRef, {
    streak:        novoStreak,
    melhorStreak:  melhorStreak,
    ultimoScanDia: hoje,
  });
}

// ─── Verificar conquistas após scan ──────────────────────────
async function verificarConquistasPosScan() {
  try {
    const snap = await getDoc(doc(db, "usuarios", usuarioAtual.uid));
    if (!snap.exists()) return;
    await verificarConquistas(usuarioAtual.uid, snap.data());
  } catch (e) {
    console.error("[Scanner] Erro ao verificar conquistas:", e);
  }
}

// ─── Animação de XP flutuante ─────────────────────────────────
function animarXPGanho(xp) {
  const el       = document.createElement("div");
  el.className   = "xp-float";
  el.textContent = `+${xp} XP`;
  el.style.left  = "50%";
  el.style.top   = "40%";
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add("ativo");
  setTimeout(() => el.remove(), 1000);
}

// ─── UI ───────────────────────────────────────────────────────
function mostrarProdutoNaoEncontrado(codigo) {
  setStatus("⚠️ Produto não encontrado");
  const balao = document.getElementById("balaoNaoEncontrado");
  if (balao) {
    balao.classList.add("show");
    const btnEnviar = document.getElementById("btnEnviarAnalise");
    if (btnEnviar) {
      btnEnviar.onclick = () => {
        window.location.href = `enviar-analise.html?codigo=${encodeURIComponent(codigo)}&tipo=produto`;
      };
    }
  }
}

function mostrarAvisoLimite() {
  document.getElementById("limiteAviso")?.classList.add("show");
}

function mostrarResultado(material, nomeProduto) {
  const card = document.getElementById("resultadoCard");
  document.getElementById("resultadoIcon").textContent        = material.icon;
  document.getElementById("resultadoMaterial").textContent    = material.nome;
  document.getElementById("resultadoNomeProduto").textContent = nomeProduto || "";
  document.getElementById("resultadoXP").textContent          = material.xp;
  if (card) card.classList.add("show");
  setStatus(`✅ ${material.nome} detectado!`);
}

function setStatus(msg) {
  const el = document.getElementById("cameraStatus");
  if (el) el.textContent = msg;
}

function reiniciarScanner() {
  document.getElementById("resultadoCard")?.classList.remove("show");
  document.getElementById("limiteAviso")?.classList.remove("show");
  document.getElementById("balaoNaoEncontrado")?.classList.remove("show");
  scanAtivo   = true;
  processando = false;
  for (const key in confirmacoesMap) delete confirmacoesMap[key];
  ultimoCodigoValido = null;
  iniciarScanner();
}

document.getElementById("btnEscanearNovamente")?.addEventListener("click", reiniciarScanner);
document.getElementById("btnEnviarManual")?.addEventListener("click", () => {
  window.location.href = "enviar-analise.html?tipo=manual";
});