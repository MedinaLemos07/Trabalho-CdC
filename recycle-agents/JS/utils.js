// ============================================================
//  RECYCLE AGENTS — utils.js
//  Funções utilitárias puras compartilhadas entre os módulos.
//  Nenhuma dependência de Firebase ou DOM aqui.
// ============================================================

// ─── Títulos por nível (usado em perfil.js) ───────────────────
export const TITULOS = [
  "Recruta", "Agente", "Reciclador", "Guardião",
  "Especialista", "Veterano", "Elite", "Mestre",
  "Campeão", "Lenda",
];

// ─── Calcular nível a partir do XP total ─────────────────────
// Fórmula: cada nível N requer N*100 XP para ser completado.
// Nível 1 → 100 XP | Nível 2 → 200 XP | Nível 3 → 300 XP ...
export function calcularNivel(xp) {
  let nivel        = 1;
  let xpNecessario = 100;
  let xpAcumulado  = 0;

  while (xp >= xpAcumulado + xpNecessario) {
    xpAcumulado  += xpNecessario;
    nivel++;
    xpNecessario  = nivel * 100;
  }

  const xpNoNivel   = xp - xpAcumulado;
  const porcentagem = Math.floor((xpNoNivel / xpNecessario) * 100);

  return { nivel, xpNoNivel, xpProximo: xpNecessario, porcentagem };
}

// ─── Dias até o próximo reset (próxima segunda-feira) ─────────
// Usado em ranking.js para exibir o timer de reset.
export function diasParaReset() {
  const d = new Date().getDay(); // 0 = domingo, 1 = segunda...
  return d === 0 ? 1 : (8 - d) % 7 || 7;
}

// ─── Gerar avatarIdx padrão a partir de uma string (uid) ──────
// Garante que usuários sem avatarIdx salvo recebam sempre
// o mesmo avatar determinístico baseado no uid.
export function avatarIdxPadrao(uid, totalAvatares) {
  const hash = uid
    .split("")
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  return Math.abs(hash) % totalAvatares;
}

// ─── Feedback visual consistente ─────────────────────────────
// Exibe uma mensagem de erro ou sucesso no elemento #alertMsg
// presente nas páginas de autenticação e em qualquer página
// que use o sistema de .alert do style.css.
//
// Uso:
//   import { mostrarErro, mostrarSucesso } from "./utils.js";
//   mostrarErro("Sem conexão com o servidor.");
//   mostrarSucesso("Avatar salvo com sucesso!");
//
// O alerta some automaticamente após `duracaoMs` milissegundos
// (padrão: 4000ms). Passar 0 mantém o alerta até ser fechado.

export function mostrarErro(msg, seletorEl = "#alertMsg", duracaoMs = 4000) {
  _exibirAlerta(msg, "error", seletorEl, duracaoMs);
}

export function mostrarSucesso(msg, seletorEl = "#alertMsg", duracaoMs = 3000) {
  _exibirAlerta(msg, "success", seletorEl, duracaoMs);
}

function _exibirAlerta(msg, tipo, seletorEl, duracaoMs) {
  const el = document.querySelector(seletorEl);
  if (!el) {
    // Fallback para páginas sem #alertMsg: loga no console
    tipo === "error"
      ? console.error(`[Recycle Agents] ${msg}`)
      : console.info(`[Recycle Agents] ${msg}`);
    return;
  }

  // Limpa timer anterior se houver
  if (el._alertTimer) clearTimeout(el._alertTimer);

  el.textContent = msg;
  el.className   = `alert alert-${tipo} show`;

  if (duracaoMs > 0) {
    el._alertTimer = setTimeout(() => {
      el.className   = "alert";
      el.textContent = "";
    }, duracaoMs);
  }
}

export function ocultarAlerta(seletorEl = "#alertMsg") {
  const el = document.querySelector(seletorEl);
  if (!el) return;
  if (el._alertTimer) clearTimeout(el._alertTimer);
  el.className   = "alert";
  el.textContent = "";
}