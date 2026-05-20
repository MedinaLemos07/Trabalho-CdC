# ♻️ Recycle Agents

> Aplicação Web Gamificada para Incentivo à Reciclagem

Projeto desenvolvido para a disciplina de **Projeto e Desenvolvimento 1** — Ciências da Computação, UNIP.

---

## 📌 Sobre o Projeto

O **Recycle Agents** é uma aplicação web gamificada que transforma o ato de reciclar em uma experiência interativa e recompensadora. Por meio de pontuação (XP), missões, ranking e um sistema de scanner de código de barras, a plataforma engaja o usuário e promove hábitos sustentáveis de forma lúdica e acessível.

O projeto está alinhado ao **ODS 12 — Consumo e Produção Responsáveis** da ONU.

---

## 🚀 Funcionalidades

- 🔐 Cadastro e login com autenticação via Firebase (verificação de e-mail)
- 📊 Dashboard com XP, nível, itens reciclados e missões
- 📷 Scanner de código de barras via câmera (QuaggaJS)
- 🎯 Missões diárias e semanais com barra de progresso e recompensas
- 🏆 Ranking global com os 15 melhores agentes
- 👤 Perfil com estatísticas detalhadas, título e streak
- 🧭 Tutorial guiado interativo para novos usuários
- ❓ FAQ integrado na tela de perfil
- 🔓 Logout com redirecionamento para a tela inicial

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 / CSS3 / JavaScript (ES6 Modules)**
- **Firebase Authentication** — autenticação de usuários
- **Cloud Firestore** — banco de dados em tempo real
- **Firebase Hosting** — hospedagem da aplicação
- **QuaggaJS** — leitura de código de barras via câmera
- **SweetAlert2** — alertas e modais interativos
- **Google Fonts** — Orbitron e Rajdhani

---

## 📁 Estrutura do Projeto

```
Trabalho-CdC/
├── recycle-agents/
│   ├── index.html          # Splash screen
│   ├── login.html          # Tela de login
│   ├── cadastro.html       # Tela de cadastro
│   ├── home.html           # Dashboard principal
│   ├── scanner.html        # Scanner de código de barras
│   ├── missoes.html        # Missões diárias e semanais
│   ├── ranking.html        # Ranking global
│   ├── perfil.html         # Perfil do usuário
│   └── tutorial.html       # Tutorial guiado
├── LIBS/                   # Bibliotecas locais
└── README.md
```

---

## 👥 Integrantes

| Nome | RA | Função |
|---|---|---|
| Luan Vinicius Medina Lemos | R276FH1 | Desenvolvedor Frontend/Backend — continuidade do frontend e configuração do Firebase |
| Enthony Guilherme Silva | R3108F3 | Desenvolvedor Frontend — desenvolvimento das telas, estilos e integração com Firebase |
| Luiz Manoel de Oliveira Souza | H9571I8 | Testes e Qualidade — testes funcionais e reporte de bugs |
| Júlia Keller Galvão Dias | R1415G3 | Revisão e UX — revisão de fluxos, validação das telas e feedback de usabilidade |
| Maurício Nicola Lemonte Filho | R372BH1 | Integrante da equipe |

---

## 🎓 Informações Acadêmicas

| Campo | Informação |
|---|---|
| Curso | Ciências da Computação |
| Disciplina | Projeto e Desenvolvimento 1 |
| Orientadora | Prof. MSc. Carolina Kimie Idehama |
| Campus | UNIP Paulista |
| Semestre | 2026/1 |

---

## 📄 Licença

Projeto acadêmico — todos os direitos reservados aos integrantes da equipe.
