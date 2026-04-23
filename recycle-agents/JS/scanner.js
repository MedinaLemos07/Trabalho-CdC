// ============================================================
//  RECYCLE AGENTS — scanner.js
//  v4.0 — precisão máxima + validação EAN
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc, increment, setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Materiais ────────────────────────────────────────────────
const MATERIAIS = {
  papel:        { nome: "Papel",        xp: 5,  icon: "📄", tipo: "papel"        },
  plastico:     { nome: "Plástico",     xp: 10, icon: "🧴", tipo: "plastico"     },
  vidro:        { nome: "Vidro",        xp: 15, icon: "🍶", tipo: "vidro"        },
  metal:        { nome: "Metal",        xp: 20, icon: "🥫", tipo: "metal"        },
  desconhecido: { nome: "Desconhecido", xp: 2,  icon: "❓", tipo: "desconhecido" },
};

// ─── Configuração de precisão ─────────────────────────────────
// Exige que o mesmo código apareça N vezes consecutivas
// antes de confirmar — elimina leituras erradas/parciais
const CONFIRMACOES_NECESSARIAS = 5;
const confirmacoesMap   = {}; // { codigo: count }
let ultimoCodigoValido  = null;

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

// ─── Iniciar câmera ───────────────────────────────────────────
function iniciarScanner() {
  const status = document.getElementById("cameraStatus");
  for (const key in confirmacoesMap) delete confirmacoesMap[key];
  ultimoCodigoValido = null;

  if (quaggaRodando) { Quagga.stop(); quaggaRodando = false; }

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.getElementById("viewfinder-wrap"),
      constraints: {
        facingMode: "environment",
        width:      { ideal: 1920 },
        height:     { ideal: 1080 },
        focusMode:  "continuous",
      },
    },
    decoder: {
      // Apenas leitores EAN/UPC — mais precisos para produtos
      // Code128/39 removidos pois causam leituras fantasmas
      readers: [
        "ean_reader",
        "ean_8_reader",
        "upc_reader",
        "upc_e_reader",
      ],
      // Múltiplas tentativas por frame
      multiple: false,
    },
    locate:   true,
    numOfWorkers: navigator.hardwareConcurrency
      ? Math.min(navigator.hardwareConcurrency, 4)
      : 2,
    frequency: 10, // frames por segundo analisados
    locator: {
      patchSize:   "medium",
      halfSample:  false, // mais preciso, um pouco mais lento
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

    if (!onDetectedRegistered) {
      Quagga.onDetected(onCodigoDetectado);
      onDetectedRegistered = true;
    }
  });

  // Canvas com willReadFrequently para performance
  Quagga.onProcessed((result) => {
    const ctx = Quagga.canvas.ctx.overlay;
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

// ─── Validar dígito verificador EAN-13 ───────────────────────
// Elimina leituras com erros de checksum
function validarEAN13(codigo) {
  if (codigo.length !== 13) return false;
  if (!/^\d+$/.test(codigo)) return false;

  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const digitoEsperado = (10 - (soma % 10)) % 10;
  return digitoEsperado === parseInt(codigo[12]);
}

// ─── Validar EAN-8 ────────────────────────────────────────────
function validarEAN8(codigo) {
  if (codigo.length !== 8) return false;
  if (!/^\d+$/.test(codigo)) return false;

  let soma = 0;
  for (let i = 0; i < 7; i++) {
    soma += parseInt(codigo[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const digitoEsperado = (10 - (soma % 10)) % 10;
  return digitoEsperado === parseInt(codigo[7]);
}

// ─── Validar UPC-A ────────────────────────────────────────────
function validarUPC(codigo) {
  if (codigo.length !== 12) return false;
  if (!/^\d+$/.test(codigo)) return false;

  let soma = 0;
  for (let i = 0; i < 11; i++) {
    soma += parseInt(codigo[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const digitoEsperado = (10 - (soma % 10)) % 10;
  return digitoEsperado === parseInt(codigo[11]);
}

// ─── Verificar se código é válido ─────────────────────────────
function codigoValido(codigo) {
  if (!codigo || typeof codigo !== "string") return false;
  if (!/^\d+$/.test(codigo)) return false;

  // Aceita EAN-13, EAN-8 ou UPC-A com checksum correto
  if (codigo.length === 13) return validarEAN13(codigo);
  if (codigo.length === 8)  return validarEAN8(codigo);
  if (codigo.length === 12) return validarUPC(codigo);

  return false;
}

// ─── Código detectado — confirmação + validação ───────────────
async function onCodigoDetectado(result) {
  if (!scanAtivo) return;

  const codigo = result?.codeResult?.code;
  if (!codigo) return;

  // Validação de checksum — rejeita leituras com erro
  if (!codigoValido(codigo)) {
    console.log(`[Scanner] Código inválido (checksum): ${codigo}`);
    return;
  }

  // Se mudou o código durante leitura, zera confirmações
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

  scanAtivo = false;
  Quagga.stop();
  quaggaRodando = false;

  console.log(`[Scanner] Código confirmado ${CONFIRMACOES_NECESSARIAS}x: ${codigo}`);
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

      mostrarResultado(material, dados.nome);
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

  const ontem      = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const novoStreak = ultimo === ontem ? (dados.streak || 0) + 1 : 1;
  await updateDoc(userRef, { streak: novoStreak, ultimoScanDia: hoje });
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
  scanAtivo = true;
  iniciarScanner();
}

document.getElementById("btnEscanearNovamente")?.addEventListener("click", reiniciarScanner);
document.getElementById("btnEnviarManual")?.addEventListener("click", () => {
  window.location.href = "enviar-analise.html?tipo=manual";
});