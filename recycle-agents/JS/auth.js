// ============================================================
//  RECYCLE AGENTS — auth.js
//  Lógica de autenticação: Login e Cadastro
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Detectar qual página estamos ────────────────────────────
const isLogin    = !!document.getElementById("btnLogin");
const isCadastro = !!document.getElementById("btnCadastro");

// ─── Redirecionar se já estiver logado ───────────────────────
onAuthStateChanged(auth, (user) => {
  if (user && (isLogin || isCadastro)) {
    window.location.href = "home.html";
  }
});

// ─── Helpers de UI ───────────────────────────────────────────
function showAlert(msg, type = "error") {
  const el = document.getElementById("alertMsg");
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
}

function hideAlert() {
  const el = document.getElementById("alertMsg");
  if (el) el.className = "alert";
}

function setLoading(btn, state) {
  btn.classList.toggle("loading", state);
  btn.disabled = state;
}

// ─── Toggle visibilidade de senha ────────────────────────────
function setupToggle(toggleId, inputId) {
  const btn   = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type    = showing ? "password" : "text";
    btn.textContent = showing ? "👁" : "🙈";
  });
}

setupToggle("toggleSenha",    "senha");
setupToggle("toggleConfirmar", "confirmarSenha");

// ─── Mensagens de erro Firebase traduzidas ───────────────────
function traduzirErro(code) {
  const erros = {
    "auth/invalid-email":          "E-mail inválido.",
    "auth/user-not-found":         "Usuário não encontrado.",
    "auth/wrong-password":         "Senha incorreta.",
    "auth/email-already-in-use":   "Este e-mail já está em uso.",
    "auth/weak-password":          "Senha muito fraca. Use pelo menos 6 caracteres.",
    "auth/too-many-requests":      "Muitas tentativas. Tente mais tarde.",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
    "auth/invalid-credential":     "E-mail ou senha incorretos.",
  };
  return erros[code] || "Ocorreu um erro. Tente novamente.";
}

// ─── CADASTRO ────────────────────────────────────────────────
if (isCadastro) {
  const btnCadastro     = document.getElementById("btnCadastro");
  const inputNome       = document.getElementById("nome");
  const inputEmail      = document.getElementById("email");
  const inputSenha      = document.getElementById("senha");
  const inputConfirmar  = document.getElementById("confirmarSenha");

  btnCadastro.addEventListener("click", async () => {
    hideAlert();

    const nome     = inputNome.value.trim();
    const email    = inputEmail.value.trim();
    const senha    = inputSenha.value;
    const confirmar = inputConfirmar.value;

    // ── Validações ──
    if (!nome) {
      showAlert("Informe seu nome de agente.");
      inputNome.focus();
      return;
    }
    if (!email) {
      showAlert("Informe seu e-mail.");
      inputEmail.focus();
      return;
    }
    if (senha.length < 6) {
      showAlert("A senha precisa ter pelo menos 6 caracteres.");
      inputSenha.focus();
      return;
    }
    if (senha !== confirmar) {
      showAlert("As senhas não coincidem.");
      inputConfirmar.focus();
      return;
    }

    setLoading(btnCadastro, true);

    try {
      // Criar usuário no Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, senha);

      // Atualizar displayName
      await updateProfile(user, { displayName: nome });

      // Criar documento do usuário no Firestore
      await setDoc(doc(db, "usuarios", user.uid), {
        nome,
        email,
        xp:              0,
        itensReciclados: 0,
        criadoEm:        serverTimestamp(),
      });

      showAlert("Conta criada com sucesso! Redirecionando...", "success");

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1500);

    } catch (err) {
      console.error("[Cadastro]", err);
      showAlert(traduzirErro(err.code));
      setLoading(btnCadastro, false);
    }
  });

  // Enter para submeter
  [inputNome, inputEmail, inputSenha, inputConfirmar].forEach(el => {
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btnCadastro.click();
    });
  });
}

// ─── LOGIN ───────────────────────────────────────────────────
if (isLogin) {
  const btnLogin   = document.getElementById("btnLogin");
  const inputEmail = document.getElementById("email");
  const inputSenha = document.getElementById("senha");

  btnLogin.addEventListener("click", async () => {
    hideAlert();

    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email) {
      showAlert("Informe seu e-mail.");
      inputEmail.focus();
      return;
    }
    if (!senha) {
      showAlert("Informe sua senha.");
      inputSenha.focus();
      return;
    }

    setLoading(btnLogin, true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged vai redirecionar automaticamente
    } catch (err) {
      console.error("[Login]", err);
      showAlert(traduzirErro(err.code));
      setLoading(btnLogin, false);
    }
  });

  // Enter para submeter
  [inputEmail, inputSenha].forEach(el => {
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btnLogin.click();
    });
  });
}
