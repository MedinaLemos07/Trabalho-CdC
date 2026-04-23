# ♻️ Recycle Agents

Aplicativo gamificado de incentivo à reciclagem. Escaneie embalagens, ganhe XP, suba de liga e compita no ranking semanal.

---

## 🚀 Como rodar localmente

O scanner usa a API de câmera do navegador, que **exige HTTPS ou localhost**. Abrir o arquivo diretamente (`file://`) não funciona.

**Opção recomendada — Live Server (VSCode):**
1. Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clique com o botão direito em `index.html` → **Open with Live Server**
3. Acesse `http://127.0.0.1:5500`

**Opção alternativa — servidor Python:**
```bash
python -m http.server 5500
# Acesse http://localhost:5500
```

---

## 📁 Estrutura do projeto

```
Trabalho-CdC/
├── index.html                  # Splash screen (entrada do app)
├── .gitignore
├── firestore.rules             # Regras de segurança do Firestore
├── package.json
│
└── recycle-agents/
    ├── login.html
    ├── cadastro.html
    ├── home.html               # Dashboard principal
    ├── scanner.html            # Scanner de código de barras
    ├── missoes.html            # Missões diárias e semanais
    ├── ranking.html            # Ranking por liga
    ├── perfil.html             # Perfil do usuário
    ├── tutorial.html           # Tour guiado (primeiro acesso)
    │
    ├── CSS/
    │   ├── style.css           # Estilos globais + navbar
    │   ├── home.css
    │   ├── login.css
    │   ├── missoes.css
    │   ├── perfil.css
    │   ├── ranking.css
    │   ├── scanner.css
    │   ├── tutorial.css
    │   ├── avatar-styles.css   # Sistema de avatares eco/neon
    │   └── icon-styles.css     # Glow neon para ícones Lucide
    │
    ├── JS/
    │   ├── utils.js            # ← Funções puras compartilhadas
    │   ├── app.js              # Dashboard (home.html)
    │   ├── auth.js             # Login e cadastro
    │   ├── avatares.js         # 12 avatares SVG temáticos
    │   ├── bots.js             # NPCs do ranking
    │   ├── ligas.js            # Sistema de ligas + reset semanal
    │   ├── missoes.js          # Lógica das missões
    │   ├── missoes-config.js   # ← Config centralizada das missões
    │   ├── perfil.js           # Perfil do usuário
    │   ├── ranking.js          # Ranking semanal
    │   ├── scanner.js          # QuaggaJS + processamento de scan
    │   └── tutorial.js         # Tour guiado
    │
    ├── FIREBASE/
    │   └── firebase-config.js  # Inicialização do Firebase
    │
    └── LIBS/
        └── quagga.min.js       # Biblioteca de leitura de barcode
```

---

## 🔐 Fluxo de autenticação

O fluxo de auth tem nuances importantes documentadas aqui para facilitar manutenção futura.

### Cadastro
```
cadastro.html
  → createUserWithEmailAndPassword()
  → sendEmailVerification()        ← email de confirmação enviado
  → updateProfile() + setDoc()     ← salva nome e dados iniciais
  → signOut()                      ← desloga imediatamente
  → exibe verifyCard               ← instrui o usuário a verificar email
```

**Por que o signOut logo após o cadastro?**
O Firebase autentica o usuário imediatamente após `createUserWithEmailAndPassword`, mesmo sem verificação de email. Se não deslogarmos, o `onAuthStateChanged` global detectaria um usuário não verificado e poderia redirecionar para `home.html` indevidamente.

### Login
```
login.html
  → signInWithEmailAndPassword()
  → user.emailVerified?
      ├── false → signOut() + mostrar erro "confirme seu email"
      └── true  → getDoc(usuarios/{uid})
                    ├── tutorialCompleto: false → tutorial.html
                    └── tutorialCompleto: true  → home.html
```

### Proteção global (`auth.js`)
As flags `cadastrandoAgora` e `loginFalhando` em `auth.js` são necessárias para evitar que o listener global de `onAuthStateChanged` redirecione o usuário **durante** o fluxo de cadastro ou quando o login falha (email não verificado).

```javascript
// Sem as flags, este listener redirecionaria para home.html
// no meio do processo de cadastro, antes do signOut().
onAuthStateChanged(auth, async (user) => {
  if (cadastrandoAgora) return; // ← protege o fluxo de cadastro
  if (loginFalhando)    return; // ← protege o fluxo de erro de login
  // ...
});
```

### Tutorial
A `tutorial.html` é exibida apenas uma vez — no primeiro login. Após concluir ou pular, `tutorialCompleto: true` é salvo no Firestore e o usuário nunca mais vê o tutorial.

**Importante:** `tutorial.html` **não** carrega `app.js`. O `tutorial.js` já gerencia toda a proteção de autenticação necessária para aquela página. Carregar ambos causaria dois listeners de `onAuthStateChanged` concorrentes.

---

## 🏆 Sistema de ligas

| Liga | Cor | Ordem |
|------|-----|-------|
| Sucata | Bronze | 1 |
| Reciclador | Prata | 2 |
| Guardião | Ouro | 3 |
| Agente Eco | Azul | 4 |
| Lenda Verde | Verde Neon | 5 |

**Reset semanal:** toda segunda-feira, top 3 de cada liga sobem e os últimos 3 descem. O XP semanal é zerado. Os nomes dos bots são rotacionados.

O reset usa `runTransaction` para evitar race condition quando múltiplos usuários abrem o ranking simultaneamente.

---

## ⚡ XP por material

| Material | XP |
|----------|----|
| Papel | +5 |
| Plástico | +10 |
| Vidro | +15 |
| Metal | +20 |

**Limite diário:** cada código de barras pode ser escaneado no máximo **2 vezes por dia**. O controle é feito na coleção `scans/{uid}_{codigo}_{data}`.

---

## 🎯 Missões

As missões são configuradas centralmente em `missoes-config.js`. Para adicionar uma nova missão, edite apenas esse arquivo — `missoes.js` e o HTML são gerados dinamicamente.

Ao completar uma missão pela primeira vez, o campo `missoesCompletas` no Firestore é incrementado automaticamente.

---

## 🤖 Bots

35 bots distribuídos entre as 5 ligas (7 por liga). Cada bot tem uma personalidade que define a chance de não ganhar XP num dia:

| Personalidade | Chance de não ganhar XP |
|---------------|------------------------|
| Ativo | 10% |
| Médio | 25% |
| Preguiçoso | 40% |

Os bots usam o mesmo sistema de `avatarIdx` (0–11) dos usuários reais, garantindo consistência visual no ranking.

---

## 🔒 Segurança

As regras do Firestore estão em `firestore.rules`. Para aplicar:

1. Acesse [Firebase Console](https://console.firebase.google.com) → Firestore → Rules
2. Cole o conteúdo de `firestore.rules`
3. Clique em **Publish**

---

## 📋 Próximos passos (Cloud Functions)

Ver `CLOUD_FUNCTIONS_GUIDE.md` para migrar `atualizarBotsXP` e `resetSemanal` do client para Cloud Functions agendadas — eliminando writes desnecessários e a dependência de um usuário abrir o app para as operações acontecerem.

---

## 🛠️ Tecnologias

- **Firebase Auth** — autenticação com verificação de email
- **Cloud Firestore** — banco de dados em tempo real
- **QuaggaJS** — leitura de códigos de barras via câmera
- **Lucide Icons** — ícones SVG inline
- **ES Modules** — sem bundler, imports nativos do navegador
- **Orbitron + Rajdhani** — tipografia do tema cyber-nature