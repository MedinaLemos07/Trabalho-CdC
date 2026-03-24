# ♻️ Recycle Agents

Aplicação web gamificada para incentivo à reciclagem.

## 🚀 Como rodar

1. Configure o Firebase em `FIREBASE/firebase-config.js`
2. Abra `index.html` em um servidor local (ex: Live Server no VSCode)

> ⚠️ Não abra os arquivos diretamente como `file://` — o Firebase exige um servidor HTTP.

## 🛠️ Tecnologias

- HTML5 + CSS3 + JavaScript (ES Modules)
- Firebase Authentication + Firestore
- QuaggaJS (scanner de código de barras)
- SweetAlert2 (alertas visuais)

## 📁 Estrutura

```
├── index.html        # Tela inicial (splash)
├── login.html        # Login
├── cadastro.html     # Cadastro
├── home.html         # Dashboard (em desenvolvimento)
├── scanner.html      # Scanner (em desenvolvimento)
├── missoes.html      # Missões (em desenvolvimento)
├── ranking.html      # Ranking (em desenvolvimento)
├── perfil.html       # Perfil (em desenvolvimento)
├── CSS/              # Estilos
├── JS/               # Scripts
├── FIREBASE/         # Configuração Firebase
└── LIBS/             # Bibliotecas locais
```
