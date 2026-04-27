<div align="center">

<br/>

```
██████╗ ███████╗ ██████╗██╗   ██╗ ██████╗██╗     ███████╗
██╔══██╗██╔════╝██╔════╝╚██╗ ██╔╝██╔════╝██║     ██╔════╝
██████╔╝█████╗  ██║      ╚████╔╝ ██║     ██║     █████╗  
██╔══██╗██╔══╝  ██║       ╚██╔╝  ██║     ██║     ██╔══╝  
██║  ██║███████╗╚██████╗   ██║   ╚██████╗███████╗███████╗
╚═╝  ╚═╝╚══════╝ ╚═════╝   ╚═╝    ╚═════╝╚══════╝╚══════╝

          █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗
         ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝
         ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗
         ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║
         ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║
         ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝
```

**Transformando reciclagem em missão.**

<br/>

[![Status](https://img.shields.io/badge/status-production-00ff6a?style=for-the-badge&labelColor=0a1a0f)](https://github.com/MedinaLemos07/Trabalho-CdC)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FF6D00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com)
[![Platform](https://img.shields.io/badge/Platform-Web%20%2F%20Mobile-00d4ff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/MedinaLemos07/Trabalho-CdC)
[![JS](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

<br/>

> *"Cada código de barras escaneado é um passo a menos para a degradação do planeta."*

<br/>

</div>

---

## 🌍 O Produto

**Recycle Agents** é uma plataforma web gamificada que usa escaneamento de código de barras via câmera para identificar materiais recicláveis, creditar recompensas ao usuário e posicioná-lo em um sistema competitivo de ligas semanais.

O problema que resolve é comportamental: a maioria das pessoas *quer* reciclar, mas não o faz consistentemente por falta de motivação e feedback imediato. O Recycle Agents transforma esse comportamento em hábito através de mecânicas de engajamento comprovadas — XP, missões, streaks, rankings e conquistas — aplicadas diretamente ao ato de reciclar.

A plataforma foi projetada para funcionar inteiramente no navegador móvel, sem instalação, com foco em responsividade e performance em dispositivos de entrada.

---

## ⚡ Funcionalidades Core

### Escaneamento Inteligente
Leitura de códigos de barras (EAN-13, EAN-8, UPC-A) via câmera com validação de checksum em tempo real. O sistema exige 3 confirmações consecutivas antes de processar, eliminando leituras fantasmas. Cada produto escaneado é verificado contra o banco de dados oficial e o XP é creditado instantaneamente com animação de feedback.

### Sistema de Progressão
Estrutura de XP e níveis com 10 títulos progressivos. A fórmula de progressão é escalonada (Nível N = N×100 XP), mantendo o desafio ao longo do tempo. Cada material reciclado tem um peso diferente: Metal vale o dobro de Papel, incentivando a diversificação.

### Liga Competitiva Semanal
Cinco ligas hierárquicas — Sucata, Reciclador, Guardião, Agente Eco e Lenda Verde. Cada usuário compete em divisões de até 12 participantes ao longo da semana. A cada segunda-feira, os 3 melhores sobem e os 3 piores descem. O sistema usa bots com personalidades distintas e nomes humanos para manter divisões vivas independentemente da base de usuários.

### Missões e Streak
Missões diárias e semanais com XP bônus, configuradas de forma declarativa e geradas dinamicamente na interface. O sistema de streak registra sequências de dias com reciclagem, com mensagens motivacionais personalizadas e conquistas especiais para marcos de 3, 7, 14 e 30 dias.

### Contribuição Comunitária
Usuários podem enviar fotos de itens não cadastrados para revisão. Um painel administrativo permite que moderadores aprovem análises, expandindo automaticamente o banco de produtos oficiais. Aprovações creditam XP tanto ao contribuidor quanto fortalecem o banco de dados coletivo.

### Sistema de Conquistas
16 badges desbloqueáveis em 4 categorias — Início, Streak, Volume e Liga. Verificados automaticamente após cada ação e exibidos no perfil com data de desbloqueio. Toast animado notifica o usuário em tempo real ao conquistar um badge.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│                                                              │
│   HTML5 + CSS3         Vanilla JS (ES Modules)              │
│   ──────────────       ────────────────────────             │
│   11 páginas           16 módulos independentes             │
│   12 folhas de         Sem framework, sem bundler           │
│   estilo modulares     Import/export nativos                 │
│                                                              │
│   QuaggaJS             SweetAlert2 + Lucide Icons           │
│   (barcode scanner)    (UI components)                      │
└────────────────────────────┬────────────────────────────────┘
                             │ Firebase SDK v12 (CDN)
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌───────────────┐ ┌──────────────────────┐
│  Firebase Auth  │ │  Cloud        │ │  Cloud Functions     │
│                 │ │  Firestore    │ │                      │
│  Email/senha    │ │               │ │  resetDiario         │
│  + verificação  │ │  9 coleções   │ │  (03:00 BRT diário)  │
│  de e-mail      │ │  Regras de    │ │                      │
│  JWT automático │ │  segurança    │ │  resetSemanal        │
│                 │ │  granulares   │ │  (03:00 BRT seg.)    │
└─────────────────┘ └───────────────┘ │                      │
                                      │  resetStreak         │
                                      │  (03:01 BRT diário)  │
                                      └──────────────────────┘
```

**Decisões de design:**
- **Sem framework JS** — Vanilla ES Modules suficientes para a escala do produto, sem overhead de build
- **Firebase Spark** — Arquitetura inteiramente dentro do plano gratuito, com resets híbridos (front + Cloud Functions) para garantir consistência
- **SVG inline para avatares** — Zero dependência de CDN externo para assets visuais, funciona offline
- **Base64 para fotos** — Compressão client-side via Canvas API mantém documentos dentro dos limites do Firestore

---

## 🗄️ Modelo de Dados

```
usuarios/{uid}
├── xp, xpSemana, liga, divisaoId
├── itensReciclados, streak, melhorStreak
├── missoes.{id}.{concluida, resgatada}
├── ultimaTemporada.{ligaAntes, ligaDepois, posicaoFinal}
└── conquistas/{conquistaId}
    └── { desbloqueadaEm, nome, icone }

scans/{uid}_{codigoBarra}_{data}
└── { count, material, nomeProduto, timestamp }

analises_pendentes/{autoId}
└── { tipo, uid, material, fotoBase64, status }

produtos_oficiais/{codigoBarra}
└── { nome, material, aprovadoPor }

notificacoes/{uid}/itens/{autoId}
└── { tipo, titulo, mensagem, lida, timestamp }

bots/{botId}
└── { liga, personalidade, nome, xpSemana }

sistema/controle_semanal
└── { ultimoReset, divisoes.{liga}.{count, ultima} }

admins/{uid}
└── { isAdmin: true }
```

---

## 🔐 Segurança

As regras do Firestore garantem isolamento por usuário: cada UID só acessa seus próprios dados, com exceção de leituras necessárias para o ranking (público para autenticados). Administradores têm permissões expandidas verificadas via coleção `admins`, nunca via campo no documento do próprio usuário — evitando privilege escalation.

Validações críticas ocorrem em duas camadas: no cliente (checksum de barcode, limites de tamanho de imagem, campos obrigatórios) e nas regras do Firestore (estrutura do documento, ownership). O limite de 2 scans por produto por dia é reforçado pela chave composta do documento (`uid_codigo_data`), não apenas por lógica client-side.

---

## 🛠️ Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | Vanilla JavaScript (ES Modules) | ES2022 |
| Estilização | CSS3 com Custom Properties | — |
| Autenticação | Firebase Authentication | 12.11.0 |
| Banco de dados | Cloud Firestore | 12.11.0 |
| Backend | Firebase Cloud Functions (Node.js) | Functions v6 |
| Hosting | Firebase Hosting | — |
| Scanner | QuaggaJS | CDN |
| Modais | SweetAlert2 | CDN |
| Ícones | Lucide Icons | CDN |

---

## 📁 Estrutura

```
recycle-agents/
├── FIREBASE/firebase-config.js    # Inicialização e exportação de auth + db
├── JS/
│   ├── utils.js                   # Funções puras (calcularNivel, diasParaReset)
│   ├── auth.js                    # Autenticação + atribuição de divisão
│   ├── app.js                     # Dashboard + painel de notificações (3 abas)
│   ├── scanner.js                 # QuaggaJS + validação EAN + Firestore
│   ├── missoes.js                 # Progresso, reset e resgate de missões
│   ├── missoes-config.js          # Configuração declarativa das missões
│   ├── ranking.js                 # Render + cache sessionStorage + pull-to-refresh
│   ├── ligas.js                   # Lógica de ligas, divisões, reset semanal
│   ├── bots.js                    # XP simulado, nomes, inicialização
│   ├── conquistas.js              # Verificação e desbloqueio de badges
│   ├── notificacoes.js            # CRUD + verificações automáticas
│   ├── perfil.js                  # Avatar picker, stats detalhados, conquistas
│   ├── enviar-analise.js          # Upload com compressão + envio para revisão
│   ├── admin.js                   # Painel de moderação de análises
│   ├── avatares.js                # 12 SVGs temáticos + renderização
│   └── tutorial.js                # Tour guiado multi-tela com sessionStorage
├── CSS/                           # Estilos modulares por página (12 arquivos)
└── *.html                         # 11 páginas da aplicação

functions/
└── index.js                       # 3 Cloud Functions cron
```

---

## 📊 Números do Projeto

| | |
|---|---|
| Páginas da aplicação | 11 |
| Módulos JavaScript | 16 |
| Coleções Firestore | 9 |
| Cloud Functions agendadas | 3 |
| Conquistas disponíveis | 16 |
| Missões ativas | 6 (3 diárias + 3 semanais) |
| Ligas | 5 |
| Avatares únicos | 12 |
| Bots no sistema | 35 |
| Materiais suportados | 5 |

---

## 👨‍💻 Desenvolvimento

**Autor:** [MedinaLemos07](https://github.com/MedinaLemos07)  
**Contexto:** Projeto Acadêmico — Ciência da Computação  
**Repositório:** [github.com/MedinaLemos07/Trabalho-CdC](https://github.com/MedinaLemos07/Trabalho-CdC)

---

<div align="center">

<br/>

```
♻️  Recycle Agents  ·  Cada scan conta.  ·  O planeta agradece.
```

<br/>

</div>