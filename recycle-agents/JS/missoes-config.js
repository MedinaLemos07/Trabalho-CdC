// ============================================================
//  RECYCLE AGENTS — missoes-config.js
//  Configuração centralizada de todas as missões do jogo.
//
//  Para adicionar uma nova missão:
//  1. Adicione um objeto neste array (diárias ou semanais)
//  2. Adicione o campo correspondente no documento do usuário
//     no Firestore (ex: "papelDia", "vidroSemana")
//  3. NÃO é necessário alterar missoes.js nem missoes.html —
//     ambos são gerados dinamicamente a partir deste arquivo.
// ============================================================

export const MISSOES = {

  // ─── Missões diárias ───────────────────────────────────────
  // Resetam quando itensDia, plasticoDia, metalDia voltam a 0
  // (o reset diário deve ser implementado via Cloud Function futuramente)
  diarias: [
    {
      id:        "md1",
      nome:      "Reciclar 3 itens",
      desc:      "Escaneie 3 itens diferentes hoje",
      campo:     "itensDia",       // campo no Firestore a monitorar
      meta:      3,
      xp:        30,
      iconSvg: `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="m7.5 4.27 9 5.15"/>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
        <path d="m3.3 7 8.7 5 8.7-5"/>
        <path d="M12 22V12"/>
      </svg>`,
    },
    {
      id:        "md2",
      nome:      "Reciclar 1 plástico",
      desc:      "Escaneie qualquer item de plástico",
      campo:     "plasticoDia",
      meta:      1,
      xp:        10,
      iconSvg: `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
        <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>
      </svg>`,
    },
    {
      id:        "md3",
      nome:      "Reciclar 1 metal",
      desc:      "Escaneie qualquer item de metal",
      campo:     "metalDia",
      meta:      1,
      xp:        20,
      iconSvg: `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v14a9 3 0 0 0 18 0V5"/>
        <path d="M3 12a9 3 0 0 0 18 0"/>
      </svg>`,
    },
  ],

  // ─── Missões semanais ──────────────────────────────────────
  // Resetam junto com xpSemana no reset semanal de segunda-feira
  semanais: [
    {
      id:        "ms1",
      nome:      "Reciclar 10 itens",
      desc:      "Acumule 10 reciclagens nessa semana",
      campo:     "itensSemana",
      meta:      10,
      xp:        100,
      iconSvg: `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>`,
    },
    {
      id:        "ms2",
      nome:      "Reciclar todos os tipos",
      desc:      "Recicle papel, plástico, vidro e metal",
      // campo especial: calculado como número de tipos únicos reciclados
      campo:     "_tiposUnicos",
      meta:      4,
      xp:        150,
      iconSvg: `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>`,
    },
    {
      id:        "ms3",
      nome:      "Sequência de 3 dias",
      desc:      "Recicle pelo menos 1 item por 3 dias seguidos",
      campo:     "streak",
      meta:      3,
      xp:        200,
      iconSvg: `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
      </svg>`,
    },
  ],
};