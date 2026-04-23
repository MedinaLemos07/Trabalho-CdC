// ============================================================
//  RECYCLE AGENTS — enviar-analise.js
//  v2.0 — XP inicial 5 ao enviar
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  collection, addDoc, doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const XP_ENVIO_INICIAL = 5;

const params   = new URLSearchParams(window.location.search);
const tipo     = params.get("tipo") || "manual";
const codigoQR = params.get("codigo") || "";

let usuarioAtual        = null;
let materialSelecionado = { produto: null, manual: null };
let fotoBase64          = { produto: null, manual: null };

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  usuarioAtual = user;
  iniciarPagina();
});

function iniciarPagina() {
  const titulos = {
    produto: { titulo: "Produto Desconhecido", subtitulo: "Código não encontrado no sistema" },
    manual:  { titulo: "Reciclagem Manual",    subtitulo: "Sem código de barras" },
  };

  const t = titulos[tipo] || titulos.manual;
  document.getElementById("paginaTitulo").textContent    = t.titulo;
  document.getElementById("paginaSubtitulo").textContent = t.subtitulo;

  const badge = document.getElementById("tipoBadge");
  if (tipo === "produto") {
    badge.textContent = "🔍 Produto com código de barras";
    badge.className   = "tipo-badge tipo-produto";
    document.getElementById("formProduto").style.display = "block";
    if (codigoQR) document.getElementById("codigoBarras").value = codigoQR;
  } else {
    badge.textContent = "♻️ Reciclagem sem código";
    badge.className   = "tipo-badge tipo-manual";
    document.getElementById("formManual").style.display = "block";
  }

  iniciarSelecaoMaterial();
  iniciarUploadFoto();
  iniciarBotaoEnvio();
}

function iniciarSelecaoMaterial() {
  ["produto", "manual"].forEach((form) => {
    const container = document.getElementById(`materialSelect${capitalize(form)}`);
    if (!container) return;
    container.querySelectorAll(".material-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".material-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        materialSelecionado[form] = btn.dataset.tipo;
      });
    });
  });
}

function iniciarUploadFoto() {
  ["produto", "manual"].forEach((form) => {
    const input       = document.getElementById(`fotoInput${capitalize(form)}`);
    const placeholder = document.getElementById(`fotoPlaceholder${capitalize(form)}`);
    const preview     = document.getElementById(`fotoPreview${capitalize(form)}`);
    const upload      = document.getElementById(`fotoUpload${capitalize(form)}`);
    if (!input) return;

    upload.addEventListener("click", () => input.click());
    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const base64 = await comprimirImagem(file, 800);
        fotoBase64[form]           = base64;
        preview.src                = base64;
        preview.style.display      = "block";
        placeholder.style.display  = "none";
        upload.classList.add("tem-foto");
      } catch (err) {
        mostrarErro("Erro ao processar a foto. Tente novamente.");
      }
    });
  });
}

function comprimirImagem(file, maxKB) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else                { width  = Math.round((width  * maxDim) / height); height = maxDim; }
        }
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let base64  = canvas.toDataURL("image/jpeg", quality);
        while (base64.length > maxKB * 1024 * 1.37 && quality > 0.2) {
          quality -= 0.1;
          base64   = canvas.toDataURL("image/jpeg", quality);
        }
        if (base64.length > maxKB * 1024 * 1.37) reject(new Error("Imagem muito grande."));
        else resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function iniciarBotaoEnvio() {
  if (tipo === "produto") {
    document.getElementById("btnEnviarProduto")?.addEventListener("click", enviarProduto);
  } else {
    document.getElementById("btnEnviarManual")?.addEventListener("click", enviarManual);
  }
}

async function enviarProduto() {
  const codigo     = document.getElementById("codigoBarras").value.trim();
  const nome       = document.getElementById("nomeProduto").value.trim();
  const material   = materialSelecionado.produto;
  const foto       = fotoBase64.produto;
  const observacao = document.getElementById("observacaoProduto").value.trim();

  if (!nome)     return mostrarErro("Informe o nome do produto.");
  if (!material) return mostrarErro("Selecione o tipo de material.");
  if (!foto)     return mostrarErro("A foto do código de barras é obrigatória.");

  setCarregando("produto", true);
  try {
    await addDoc(collection(db, "analises_pendentes"), {
      tipo:         "produto",
      uid:          usuarioAtual.uid,
      nomeUsuario:  usuarioAtual.displayName || usuarioAtual.email || "Usuário",
      emailUsuario: usuarioAtual.email || "",
      codigoBarra:  codigo || null,
      nomeProduto:  nome,
      material,
      observacao:   observacao || null,
      fotoBase64:   foto,
      status:       "pendente",
      xpInicial:    XP_ENVIO_INICIAL,
      timestamp:    Date.now(),
    });

    // XP inicial ao enviar
    await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
      xp:       increment(XP_ENVIO_INICIAL),
      xpSemana: increment(XP_ENVIO_INICIAL),
    });

    mostrarSucesso();
  } catch (err) {
    console.error("[Envio]", err);
    mostrarErro("Erro ao enviar. Verifique sua conexão e tente novamente.");
  } finally {
    setCarregando("produto", false);
  }
}

async function enviarManual() {
  const material = materialSelecionado.manual;
  const foto     = fotoBase64.manual;
  const nome     = document.getElementById("nomeManual").value.trim();

  if (!material) return mostrarErro("Selecione o tipo de material.");
  if (!foto)     return mostrarErro("A foto do material é obrigatória.");

  setCarregando("manual", true);
  try {
    await addDoc(collection(db, "analises_pendentes"), {
      tipo:         "manual",
      uid:          usuarioAtual.uid,
      nomeUsuario:  usuarioAtual.displayName || usuarioAtual.email || "Usuário",
      emailUsuario: usuarioAtual.email || "",
      codigoBarra:  null,
      nomeProduto:  nome || null,
      material,
      observacao:   null,
      fotoBase64:   foto,
      status:       "pendente",
      xpInicial:    XP_ENVIO_INICIAL,
      timestamp:    Date.now(),
    });

    // XP inicial ao enviar
    await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
      xp:       increment(XP_ENVIO_INICIAL),
      xpSemana: increment(XP_ENVIO_INICIAL),
    });

    mostrarSucesso();
  } catch (err) {
    console.error("[Envio]", err);
    mostrarErro("Erro ao enviar. Verifique sua conexão e tente novamente.");
  } finally {
    setCarregando("manual", false);
  }
}

function mostrarSucesso() {
  document.getElementById("formProduto").style.display = "none";
  document.getElementById("formManual").style.display  = "none";
  document.getElementById("tipoBadge").style.display   = "none";
  document.getElementById("alertMsg").classList.remove("show");
  document.getElementById("sucessoCard").style.display = "block";
}

function mostrarErro(msg) {
  const el = document.getElementById("alertMsg");
  el.textContent = msg;
  el.className   = "alert alert-error show";
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setCarregando(form, ativo) {
  const btn    = document.getElementById(`btnEnviar${capitalize(form)}`);
  const texto  = document.getElementById(`btnEnviar${capitalize(form)}Texto`);
  const loader = document.getElementById(`loader${capitalize(form)}`);
  if (btn)    btn.disabled         = ativo;
  if (texto)  texto.style.display  = ativo ? "none"         : "inline";
  if (loader) loader.style.display = ativo ? "inline-block" : "none";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}