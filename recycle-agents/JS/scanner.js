// ============================================================
//  RECYCLE AGENTS — scanner.js
//  Leitura de código de barras com QuaggaJS + Firebase
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc, increment, setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── Materiais e XP ──────────────────────────────────────────
const MATERIAIS = [
  { nome: "Papel",    xp: 5,  icon: "📄", tipo: "papel"    },
  { nome: "Plástico", xp: 10, icon: "🧴", tipo: "plastico" },
  { nome: "Vidro",    xp: 15, icon: "🍶", tipo: "vidro"    },
  { nome: "Metal",    xp: 20, icon: "🥫", tipo: "metal"    },
];

let usuarioAtual = null;
let scanAtivo    = true;
let quaggaRodando = false;

// ─── Auth ──────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;
  iniciarScanner();
});

// ─── Iniciar câmera com QuaggaJS ──────────────────────────────
function iniciarScanner() {
  const status = document.getElementById("cameraStatus");

  if (quaggaRodando) {
    Quagga.stop();
    quaggaRodando = false;
  }

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.getElementById("viewfinder-wrap"),
      constraints: {
        facingMode: "environment",
        width:  { ideal: 1280 },
        height: { ideal: 720  },
      },
    },
    decoder: {
      readers: [
        "ean_reader",
        "ean_8_reader",
        "code_128_reader",
        "code_39_reader",
        "upc_reader",
      ],
    },
    locate: true,
  }, (err) => {
    if (err) {
      console.error("[Scanner]", err);
      if (status) status.textContent = "❌ Câmera indisponível — use o Live Server";
      return;
    }
    Quagga.start();
    quaggaRodando = true;
    if (status) status.textContent = "✅ Câmera ativa — escaneando...";
  });

  Quagga.onDetected(onCodigoDetectado);
}

// ─── Código detectado ─────────────────────────────────────────
async function onCodigoDetectado(result) {
  if (!scanAtivo) return;

  const codigo = result?.codeResult?.code;
  if (!codigo || codigo.length < 4) return;

  scanAtivo = false;
  Quagga.stop();
  quaggaRodando = false;

  await processarCodigo(codigo);
}

// ─── Processar código ─────────────────────────────────────────
async function processarCodigo(codigo) {
  const hoje     = new Date().toISOString().split("T")[0];
  const chaveDoc = `${usuarioAtual.uid}_${codigo}_${hoje}`;
  const limiteRef = doc(db, "scans", chaveDoc);

  const limiteSnap = await getDoc(limiteRef);
  const scanCount  = limiteSnap.exists() ? (limiteSnap.data().count || 0) : 0;

  if (scanCount >= 2) {
    const aviso = document.getElementById("limiteAviso");
    if (aviso) aviso.classList.add("show");
    setTimeout(() => reiniciarScanner(), 3000);
    return;
  }

  const material = MATERIAIS[codigo.charCodeAt(codigo.length - 1) % MATERIAIS.length];

  // Registrar scan
  await setDoc(limiteRef, { count: scanCount + 1 }, { merge: true });

  // Atualizar dados do usuário
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

  // Atualizar streak
  await atualizarStreak(userRef);

  mostrarResultado(material);
}

// ─── Atualizar streak ─────────────────────────────────────────
async function atualizarStreak(userRef) {
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const dados = snap.data();
  const hoje  = new Date().toISOString().split("T")[0];
  const ultimo = dados.ultimoScanDia || "";

  if (ultimo === hoje) return; // já reciclou hoje

  const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const novoStreak = ultimo === ontem ? (dados.streak || 0) + 1 : 1;

  await updateDoc(userRef, {
    streak:        novoStreak,
    ultimoScanDia: hoje,
  });
}

// ─── Mostrar resultado ────────────────────────────────────────
function mostrarResultado(material) {
  const icon     = document.getElementById("resultadoIcon");
  const matEl    = document.getElementById("resultadoMaterial");
  const xpEl     = document.getElementById("resultadoXP");
  const card     = document.getElementById("resultadoCard");
  const statusEl = document.getElementById("cameraStatus");

  if (icon)     icon.textContent     = material.icon;
  if (matEl)    matEl.textContent    = material.nome;
  if (xpEl)     xpEl.textContent     = material.xp;
  if (card)     card.classList.add("show");
  if (statusEl) statusEl.textContent = `✅ ${material.nome} detectado!`;
}

// ─── Reiniciar scanner ────────────────────────────────────────
function reiniciarScanner() {
  const card  = document.getElementById("resultadoCard");
  const aviso = document.getElementById("limiteAviso");

  if (card)  card.classList.remove("show");
  if (aviso) aviso.classList.remove("show");

  scanAtivo = true;
  iniciarScanner();
}

// Botão de escanear novamente
const btnNovamente = document.getElementById("btnEscanearNovamente");
if (btnNovamente) {
  btnNovamente.addEventListener("click", reiniciarScanner);
}