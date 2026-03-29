// ============================================================
//  RECYCLE AGENTS — auth.js
//  Controle de login, cadastro e segurança do usuário
// ============================================================

import { auth, db } from "../FIREBASE/firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
// Detecta em qual página estamos
// ─────────────────────────────────────────────────────────────
const isLogin    = !!document.getElementById("btnLogin");
const isCadastro = !!document.getElementById("btnCadastro");

// ─────────────────────────────────────────────────────────────
// FLAGS DE CONTROLE
// ─────────────────────────────────────────────────────────────
let cadastrandoAgora = false;
let loginFalhando    = false;

// ─────────────────────────────────────────────────────────────
// PROTEÇÃO GLOBAL DO SISTEMA
// ─────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (cadastrandoAgora) return;
  if (loginFalhando)    return;

  if (user) {
    await user.reload();

    if (!user.emailVerified) {
      if (!isCadastro && !isLogin) {
        await signOut(auth);
        window.location.href = "login.html";
      }
      return;
    }

    if (isLogin || isCadastro) {
      window.location.href = "home.html";
    }
  }
});

// ─────────────────────────────────────────────────────────────
// FUNÇÕES DE INTERFACE
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// MOSTRAR / ESCONDER SENHA
// ─────────────────────────────────────────────────────────────
function setupToggle(toggleId, inputId) {
  const btn   = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener("click", () => {
    const mostrando = input.type === "text";
    input.type      = mostrando ? "password" : "text";
    btn.textContent = mostrando ? "👁" : "🙈";
  });
}

setupToggle("toggleSenha",     "senha");
setupToggle("toggleConfirmar", "confirmarSenha");

// ─────────────────────────────────────────────────────────────
// TRADUÇÃO DE ERROS DO FIREBASE
// ─────────────────────────────────────────────────────────────
function traduzirErro(code) {
  const erros = {
    "auth/invalid-email":          "E-mail inválido.",
    "auth/user-not-found":         "Usuário não encontrado.",
    "auth/wrong-password":         "Senha incorreta.",
    "auth/email-already-in-use":   "Este e-mail já está em uso.",
    "auth/weak-password":          "Senha muito fraca.",
    "auth/too-many-requests":      "Muitas tentativas. Tente depois.",
    "auth/network-request-failed": "Sem conexão.",
    "auth/invalid-credential":     "E-mail ou senha incorretos.",
  };
  return erros[code] || "Erro inesperado.";
}

// ─────────────────────────────────────────────────────────────
// CADASTRO
// ─────────────────────────────────────────────────────────────
if (isCadastro) {
  const btnCadastro    = document.getElementById("btnCadastro");
  const inputNome      = document.getElementById("nome");
  const inputEmail     = document.getElementById("email");
  const inputSenha     = document.getElementById("senha");
  const inputConfirmar = document.getElementById("confirmarSenha");

  btnCadastro.addEventListener("click", async () => {
    hideAlert();

    const nome      = inputNome.value.trim();
    const email     = inputEmail.value.trim();
    const senha     = inputSenha.value;
    const confirmar = inputConfirmar.value;

    if (!nome)               return showAlert("Informe seu nome.");
    if (!email)              return showAlert("Informe seu e-mail.");
    if (senha.length < 6)    return showAlert("Senha mínima de 6 caracteres.");
    if (senha !== confirmar) return showAlert("Senhas não coincidem.");

    setLoading(btnCadastro, true);
    cadastrandoAgora = true;

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, senha);
      await sendEmailVerification(user);
      await updateProfile(user, { displayName: nome });
      await setDoc(doc(db, "usuarios", user.uid), {
        nome,
        email,
        xp:               0,
        itensReciclados:  0,
        missoesCompletas: 0,
        streak:           0,
        itensDia:         0,
        itensSemana:      0,
        plasticoDia:      0,
        plasticoSemana:   0,
        papelSemana:      0,
        vidroSemana:      0,
        metalDia:         0,
        metalSemana:      0,
        tutorialCompleto: false,
        criadoEm:         serverTimestamp(),
      });

      await signOut(auth);

      document.getElementById("authCard").style.display  = "none";
      document.getElementById("verifyEmail").textContent = email;
      document.getElementById("verifyCard").classList.add("show");

    } catch (err) {
      console.error(err);
      showAlert(traduzirErro(err.code));
    } finally {
      cadastrandoAgora = false;
      setLoading(btnCadastro, false);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
if (isLogin) {
  const btnLogin   = document.getElementById("btnLogin");
  const inputEmail = document.getElementById("email");
  const inputSenha = document.getElementById("senha");

  btnLogin.addEventListener("click", async () => {
    hideAlert();

    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email) return showAlert("Informe seu e-mail.");
    if (!senha) return showAlert("Informe sua senha.");

    setLoading(btnLogin, true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);

      if (!user.emailVerified) {
        loginFalhando = true;
        showAlert("Confirme seu email antes de entrar.");
        await signOut(auth);
        loginFalhando = false;
        setLoading(btnLogin, false);
        return;
      }

      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const destino = snap.exists() && snap.data().tutorialCompleto
        ? "home.html"
        : "tutorial.html";
      window.location.href = destino;

    } catch (err) {
      console.error(err);
      showAlert(traduzirErro(err.code));
      setLoading(btnLogin, false);
    }
  });
}