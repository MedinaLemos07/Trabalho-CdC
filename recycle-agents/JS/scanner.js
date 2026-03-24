// ============================================================
//  RECYCLE AGENTS — scanner.js
//  Leitura de código de barras com QuaggaJS + Firebase
//  lembrando que se quebrar o JS é pq eu to literalmente aprendendo e fazendo ao msm tempo
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, updateDoc, increment, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Materiais e XP ──────────────────────────────────────────
// o material é sorteado pelo codigo pra evitar do usuario ficar testando ate achar o certo e ganhar ponto a mais
const MATERIAIS = [
  { nome: "Papel",    xp: 5,  icon: "📄", tipo: "papel"    },
  { nome: "Plástico", xp: 10, icon: "🧴", tipo: "plastico" },
  { nome: "Vidro",    xp: 15, icon: "🍶", tipo: "vidro"    },
  { nome: "Metal",    xp: 20, icon: "🥫", tipo: "metal"    },
];

let usuarioAtual = null;
let scanAtivo    = true;

// ─── Auth meia hora pra fazer isso funcionar pq esqueço de fechar a chave─────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;
  iniciarScanner();
});

// ─── Iniciar câmera com QuaggaJS agrupado nas 3 raizes  ─────────────────────────────
function iniciarScanner() {
  const status = document.getElementById("cameraStatus");

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.getElementById("scanner-video"),
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
      status.textContent = "❌ Câmera indisponível";
      return;
    }
    Quagga.start();
    status.textContent = "✅ Câmera ativa — escaneando...";
  });

  Quagga.onDetected(onCodigoDetectado);
}

// ─── Código detectado ────────────────────────────────────────
async function onCodigoDetectado(result) {
  if (!scanAtivo) return;

  const codigo = result.codeResult.code;
  if (!codigo) return;

  scanAtivo = false;
  Quagga.stop();

  await processarCodigo(codigo);
}

// ─── Processar código e salvar no Firebase ───────────────────
async function processarCodigo(codigo) {
  const hoje     = new Date().toISOString().split("T")[0]; // "2026-03-23"
  const chaveDoc = `${usuarioAtual.uid}_${codigo}_${hoje}`;
  const limiteRef = doc(db, "scans", chaveDoc);

  // Verificar limite de 2 scans por dia por código pra nao lotar o db de tanto scanear
  const limiteSnap = await getDoc(limiteRef);
  const scanCount  = limiteSnap.exists() ? (limiteSnap.data().count || 0) : 0;

  if (scanCount >= 2) {
    document.getElementById("limiteAviso").classList.add("show");
    setTimeout(() => reiniciarScanner(), 3000);
    return;
  }

  // Sortear material de forma determinada pelo código
  const material = MATERIAIS[codigo.charCodeAt(codigo.length - 1) % MATERIAIS.length];

  // Atualizar contador de scans
  await setDoc(limiteRef, { count: scanCount + 1 }, { merge: true });

  // Atualizar dados do usuário
  const userRef = doc(db, "usuarios", usuarioAtual.uid);
  await updateDoc(userRef, {
    xp:              increment(material.xp),
    itensReciclados: increment(1),
    itensDia:        increment(1),
    [`${material.tipo}Dia`]: increment(1),
  });

  mostrarResultado(material);
}

// ─── Mostrar resultado ───────────────────────────────────────
function mostrarResultado(material) {
  document.getElementById("resultadoIcon").textContent     = material.icon;
  document.getElementById("resultadoMaterial").textContent = material.nome;
  document.getElementById("resultadoXP").textContent       = material.xp;
  document.getElementById("resultadoCard").classList.add("show");
  document.getElementById("cameraStatus").textContent      = `✅ ${material.nome} detectado!`;
}

// ─── Reiniciar scanner ───────────────────────────────────────
function reiniciarScanner() {
  document.getElementById("resultadoCard").classList.remove("show");
  document.getElementById("limiteAviso").classList.remove("show");
  scanAtivo = true;
  iniciarScanner();
}

document.getElementById("btnEscanearNovamente")
  .addEventListener("click", reiniciarScanner);

    //backend é dificil mas ta indo, to aprendendo e fazendo ao msm tempo, se tiver algum bagui errado me avisa que eu tento arrumar rpzd, TENTO
    