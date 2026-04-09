# Recycle Agents

Projeto acadêmico desenvolvido para a disciplina de Computação e Cidadania.

## Sobre

Aplicativo web gamificado de incentivo à reciclagem. O usuário escaneia o código de barras de embalagens recicláveis, ganha XP por material reciclado, completa missões diárias e semanais, e compete no ranking global.

## Funcionalidades

- Autenticação com e-mail e verificação de conta
- Scanner de código de barras via câmera (QuaggaJS)
- Sistema de XP e níveis progressivos
- Missões diárias e semanais
- Ranking global com bots dinâmicos
- Tutorial interativo com spotlight
- Dicas educativas sobre reciclagem

## Pontuação por material

| Material | XP |
|----------|----|
| Papel    | +5  |
| Plástico | +10 |
| Vidro    | +15 |
| Metal    | +20 |

## Tecnologias

- HTML, CSS e JavaScript (ES Modules)
- Firebase Authentication
- Firebase Firestore
- QuaggaJS (leitura de código de barras)
- SweetAlert2 (disponível para uso futuro)
- Lucide Icons

## Estrutura de pastas

```
├── ASSETS/
├── LIBS/
│   ├── quagga.min.js
│   └── sweetalert2.js
├── recycle-agents/
│   ├── CSS/
│   ├── FIREBASE/
│   ├── JS/
│   └── *.html
└── index.html
```

## Integrantes

- Luan Medina
- Enthony Silva
- Luiz Manoel
- Julia Keller