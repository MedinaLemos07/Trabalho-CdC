# ☁️ Recycle Agents — Guia de Cloud Functions

Este documento descreve as duas funções que devem ser migradas
do client-side para Cloud Functions do Firebase assim que o projeto
entrar em produção ou escalar para mais usuários.

---

## Por que migrar?

| Situação atual (client) | Problema |
|-------------------------|----------|
| `atualizarBotsXP()` roda no `ranking.html` | Até 35 writes por acesso à página |
| `processarFimDeSemana()` roda no client | Race condition se dois usuários abrirem o ranking simultaneamente |
| Bots podem ser manipulados via DevTools | Sem proteção server-side |

---

## Função 1 — Atualizar XP dos bots diariamente

**Trigger:** PubSub agendado — todo dia às 03:00 (horário de Brasília)

```javascript
// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

exports.atualizarBotsXP = onSchedule("0 6 * * *", async () => {
  // 06:00 UTC = 03:00 BRT
  const db   = getFirestore();
  const snap = await db.collection("bots").get();
  const hoje = new Date().toISOString().split("T")[0];

  const batch = db.batch();
  snap.docs.forEach((docSnap) => {
    const bot         = docSnap.data();
    const ultimoUpdate = bot.ultimoUpdate?.toDate?.()?.toISOString().split("T")[0];
    if (ultimoUpdate === hoje) return;

    const xpGanho = calcularXPDiario(bot); // mesma lógica do bots.js
    batch.update(docSnap.ref, {
      xpSemana:    FieldValue.increment(xpGanho),
      xpTotal:     FieldValue.increment(xpGanho),
      ultimoUpdate: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("[CF] Bots XP atualizado");
});
```

**Depois de criar a Cloud Function:**
- Remova a chamada `await atualizarBotsXPSeLimpo()` do `ranking.js`
- Mantenha o `localStorage` como fallback visual apenas

---

## Função 2 — Reset semanal das ligas

**Trigger:** PubSub agendado — toda segunda-feira às 00:05 (BRT)

```javascript
exports.resetSemanal = onSchedule("5 3 * * 1", async () => {
  // 03:05 UTC segunda = 00:05 BRT segunda
  const db           = getFirestore();
  const controleRef  = db.doc("sistema/controle_semanal");
  const controleSnap = await controleRef.get();
  const agora        = new Date();
  const ultimoReset  = controleSnap.data()?.ultimoReset?.toDate?.();

  if (ultimoReset && (agora - ultimoReset) / 86400000 < 6) {
    console.log("[CF] Reset já executado recentemente, pulando.");
    return;
  }

  await processarFimDeSemana(db); // lógica do ligas.js portada para admin SDK
  await controleRef.set({ ultimoReset: FieldValue.serverTimestamp() });
  console.log("[CF] Reset semanal concluído");
});
```

**Depois de criar a Cloud Function:**
- Remova a chamada `await verificarResetSemanal()` do `ranking.js`
- A função `verificarResetSemanal` em `ligas.js` pode ser mantida
  como fallback de emergência, mas não será mais chamada no fluxo normal

---

## Como instalar o Firebase Functions

```bash
# Na raiz do projeto
npm install -g firebase-tools
firebase login
firebase init functions

# Escolha JavaScript, instale dependências
cd functions
npm install firebase-admin firebase-functions
```

---

## Segurança após migração

Com as Cloud Functions no lugar, atualize o `firestore.rules`:

```
match /bots/{botId} {
  allow read:  if isAuth();
  allow write: if false; // só Cloud Functions escrevem
}

match /sistema/{docId} {
  allow read:  if isAuth();
  allow write: if false; // só Cloud Functions escrevem
}
```

---

## Prioridade de implementação

1. `atualizarBotsXP` — impacto imediato em performance
2. `resetSemanal` — elimina a race condition definitivamente
3. Atualizar `firestore.rules` após ambas estarem ativas