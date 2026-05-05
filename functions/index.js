// ============================================================
//  RECYCLE AGENTS — functions/index.js
//  Cloud Functions agendadas para reset de missões.
// ============================================================

const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const logger = require("firebase-functions/logger");

initializeApp();
setGlobalOptions({maxInstances: 10});

const db = getFirestore();

const CAMPOS_DIARIOS = {
    itensDia: 0,
    plasticoDia: 0,
    metalDia: 0,
    papelDia: 0,
    vidroDia: 0,
};

const IDS_MISSOES_DIARIAS = ["md1", "md2", "md3"];

const CAMPOS_SEMANAIS = {
    itensSemana: 0,
    plasticoSemana: 0,
    metalSemana: 0,
    papelSemana: 0,
    vidroSemana: 0,
    xpSemana: 0,
};

const IDS_MISSOES_SEMANAIS = ["ms1", "ms2", "ms3"];

async function resetarCamposEmLote(camposBase, idsMissoes) {
    const snapshot = await db.collection("usuarios").get();
    if (snapshot.empty) { logger.info("Nenhum usuário encontrado."); return; }

    const TAMANHO_LOTE = 400;
    const docs = snapshot.docs;
    const lotes = [];

    for (let i = 0; i < docs.length; i += TAMANHO_LOTE) {
        const batch = db.batch();
        docs.slice(i, i + TAMANHO_LOTE).forEach((docSnap) => {
            const update = {...camposBase};
            idsMissoes.forEach((id) => {
                update[`missoes.${id}.concluida`] = false;
                update[`missoes.${id}.resgatada`] = false;
            });
            batch.update(docSnap.ref, update);
        });
        lotes.push(batch.commit());
    }

    await Promise.all(lotes);
    logger.info(`Reset concluído: ${docs.length} usuários atualizados.`);
}

exports.resetDiario = onSchedule(
    { schedule: "0 3 * * *", timeZone: "America/Sao_Paulo", region: "us-central1" },
    async () => {
        logger.info("[Reset Diário] Iniciando...");
        try {
            await resetarCamposEmLote(CAMPOS_DIARIOS, IDS_MISSOES_DIARIAS);
            logger.info("[Reset Diário] ✅ Concluído.");
        } catch (e) { logger.error("[Reset Diário] ❌ Erro:", e); }
    },
);

exports.resetSemanal = onSchedule(
    { schedule: "10 3 * * 1", timeZone: "America/Sao_Paulo", region: "us-central1" },
    async () => {
        logger.info("[Reset Semanal] Iniciando...");
        try {
            await resetarCamposEmLote(CAMPOS_SEMANAIS, IDS_MISSOES_SEMANAIS);
            logger.info("[Reset Semanal] ✅ Concluído.");
        } catch (e) { logger.error("[Reset Semanal] ❌ Erro:", e); }
    },
);

exports.resetStreak = onSchedule(
    { schedule: "1 3 * * *", timeZone: "America/Sao_Paulo", region: "us-central1" },
    async () => {
        logger.info("[Reset Streak] Iniciando...");
        try {
            const hoje  = new Date();
            const ontem = new Date(hoje.getTime() - 86400000).toISOString().split("T")[0];
            const snapshot = await db.collection("usuarios").get();
            if (snapshot.empty) return;

            const TAMANHO_LOTE = 400;
            const lotes = [];

            for (let i = 0; i < snapshot.docs.length; i += TAMANHO_LOTE) {
                const batch = db.batch();
                snapshot.docs.slice(i, i + TAMANHO_LOTE).forEach((docSnap) => {
                    const dados      = docSnap.data();
                    const ultimoScan = dados.ultimoScanDia || "";
                    const hojeStr    = hoje.toISOString().split("T")[0];
                    if (ultimoScan !== ontem && ultimoScan !== hojeStr) {
                        batch.update(docSnap.ref, {streak: 0});
                    }
                });
                lotes.push(batch.commit());
            }

            await Promise.all(lotes);
            logger.info("[Reset Streak] ✅ Concluído.");
        } catch (e) { logger.error("[Reset Streak] ❌ Erro:", e); }
    },
);

// ============================================================
//  Reset de Ligas — toda segunda-feira às 03:02 BRT
//
//  Ordem na segunda:
//    03:00 → resetDiario  (zera campos diários)
//    03:01 → resetStreak  (zera streaks)
//    03:02 → resetLigas   (promoções/rebaixamentos — xpSemana ainda intacto)
//    03:10 → resetSemanal (zera xpSemana — DEPOIS do resetLigas)
// ============================================================

const ORDEM_LIGAS          = ["sucata", "reciclador", "guardiao", "agente_eco", "lenda_verde"];
const MAX_USUARIOS_POR_DIVISAO = 5;

// Espelha o BOTS_BASE do bots.js — prefixo do ID → liga fixa
const LIGA_POR_PREFIXO_BOT = {
    bot_s: "sucata",
    bot_r: "reciclador",
    bot_g: "guardiao",
    bot_e: "agente_eco",
    bot_l: "lenda_verde",
};

function ligaDoBotPeloId(botId) {
    for (const [prefixo, liga] of Object.entries(LIGA_POR_PREFIXO_BOT)) {
        if (botId.startsWith(prefixo)) return liga;
    }
    return "sucata";
}

const POOL_NOMES = [
    "Pedro Henrique","AnaClara_23","ShadowBR","LucasXtreme","Mariana Alves",
    "BrunoC_11","NightWolf","Julia Martins","GabrielRush","RafaMendes22",
    "SilentFox","Camila Rocha","FelipeZone","Gustavo_13","DarkPlayer",
    "Larissa Costa","JoãoVictor_21","NeoHunter","Beatriz Souza","DiegoBlaze",
    "IronCore","Amanda Silva","Thiago_88","PixelWarrior","Fernanda Lima",
    "EduardoMax","QuickStrike","Juliana Ribeiro","MatheusPlay","Andre_01",
    "GhostLine","Bruna Mendes","ViniciusRun","RedFalcon","Carlos Eduardo",
    "TurboX","Ana Clara","LucasGamer99","DeltaForce","Rafael Martins",
    "BlazeRunner","MariPlay","Rodrigo Nunes","FrostByte","GustavoForce",
    "LariZone","DanielCraft","Eduardo_77","AlphaZone","Renato Teixeira",
    "PedroShadow","BiaGamer","Marcelo Santos","JoãoHunter","Gabriel Souza",
    "CamilaXP","DiegoRibeiro7","ShadowLine","JulianaXP","MatheusBR10",
    "SilentStrike","Bruno Carvalho","AmandaPlay","Felipe Almeida","IronHunter",
    "LucasG_77","FernandaX","Vinicius Melo","GhostRunner","RafaStrike",
    "NeoStrike","LarissaXP","Eduardo Gomes","DarkFox","PedroH27",
    "MarianaXP","Gustavo Rocha","PixelStrike","AnaZone","João Victor",
    "BlazeCore","Daniel Pereira","TurboStrike","CamilaPlay","QuickHunter",
    "JulianaForce","RodrigoXP","NightStrike","BeatrizXP","CarlosM_22",
    "AlphaHunter","Diego Fernandes","FrostHunter","AndreVolt","AmandaZone",
    "BrunoXP","Rafael_99","SilentRunner","ViniciusX","Matheus Oliveira","GhostStrike",
];

function embaralhar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

exports.resetLigas = onSchedule(
    { schedule: "2 3 * * 1", timeZone: "America/Sao_Paulo", region: "us-central1" },
    async () => {
        logger.info("[Reset Ligas] Iniciando...");
        try {
            // ── 1. Buscar todos os usuários ──────────────────────────
            const usersSnap = await db.collection("usuarios").get();
            if (usersSnap.empty) { logger.info("[Reset Ligas] Sem usuários."); return; }
            const todos = usersSnap.docs.map((d) => ({id: d.id, ...d.data()}));

            // ── 2. Agrupar por divisão atual ─────────────────────────
            const porDivisao = {};
            todos.forEach((u) => {
                const div = u.divisaoId || `_liga_${u.liga || "sucata"}`;
                if (!porDivisao[div]) porDivisao[div] = [];
                porDivisao[div].push(u);
            });

            // ── 3. Calcular promoções e rebaixamentos ────────────────
            const resultados = {};
            for (const [, membros] of Object.entries(porDivisao)) {
                const sorted = [...membros].sort((a, b) => (b.xpSemana || 0) - (a.xpSemana || 0));
                const total  = sorted.length;

                sorted.forEach((u, i) => {
                    const pos        = i + 1;
                    const ligaAtual  = u.liga || "sucata";
                    const idxLiga    = ORDEM_LIGAS.indexOf(ligaAtual);
                    const ligaAcima  = ORDEM_LIGAS[idxLiga + 1] || null;
                    const ligaAbaixo = ORDEM_LIGAS[idxLiga - 1] || null;

                    let novaLiga = ligaAtual;
                    if (ligaAcima && pos <= 3)                          novaLiga = ligaAcima;
                    if (ligaAbaixo && total > 3 && pos > total - 3)     novaLiga = ligaAbaixo;

                    resultados[u.id] = {
                        novaLiga, ligaAntes: ligaAtual,
                        posicaoFinal: pos, xpFinal: u.xpSemana || 0,
                    };
                });
            }

            // ── 4. Redistribuir em novas divisões ────────────────────
            const porLigaDestino = {};
            for (const [uid, res] of Object.entries(resultados)) {
                if (!porLigaDestino[res.novaLiga]) porLigaDestino[res.novaLiga] = [];
                porLigaDestino[res.novaLiga].push(uid);
            }

            const novosDivisaoIds = {};
            for (const [liga, uids] of Object.entries(porLigaDestino)) {
                let letraIdx = 0, contSlot = 0;
                for (const uid of embaralhar(uids)) {
                    if (contSlot >= MAX_USUARIOS_POR_DIVISAO) { letraIdx++; contSlot = 0; }
                    novosDivisaoIds[uid] = `${liga}_${String.fromCharCode(65 + letraIdx)}`;
                    contSlot++;
                }
            }

            // ── 5. Letras usadas para controle_semanal ───────────────
            const letrasUsadas = {};
            for (const divisaoId of Object.values(novosDivisaoIds)) {
                const ligaKey    = divisaoId.replace(/_[A-Z]$/, "");
                const letraFinal = divisaoId.slice(-1);
                if (!letrasUsadas[ligaKey] || letraFinal > letrasUsadas[ligaKey]) {
                    letrasUsadas[ligaKey] = letraFinal;
                }
            }

            // ── 6. Gravar usuários em lotes ──────────────────────────
            const TAMANHO_LOTE = 400;
            const lotes = [];
            for (let i = 0; i < todos.length; i += TAMANHO_LOTE) {
                const batch = db.batch();
                todos.slice(i, i + TAMANHO_LOTE).forEach((u) => {
                    const res         = resultados[u.id];
                    const novaDivisao = novosDivisaoIds[u.id] || u.divisaoId || `${res.novaLiga}_A`;
                    batch.update(db.collection("usuarios").doc(u.id), {
                        liga: res.novaLiga, divisaoId: novaDivisao, xpSemana: 0,
                        ultimaTemporada: {
                            ligaAntes: res.ligaAntes, ligaDepois: res.novaLiga,
                            posicaoFinal: res.posicaoFinal, xpFinal: res.xpFinal,
                            modalVisto: null,
                        },
                    });
                });
                lotes.push(batch.commit());
            }
            await Promise.all(lotes);
            logger.info(`[Reset Ligas] ${todos.length} usuários atualizados.`);

            // ── 7. Bots: zerar xpSemana, restaurar liga/divisaoId
            //       correta pelo prefixo do ID e rotacionar nomes ─────
            //
            // Bots são âncoras fixas — nunca sobem nem descem.
            // Restauramos liga e divisaoId para corrigir qualquer
            // corrupção de deploys anteriores.
            const botsSnap = await db.collection("bots").get();
            if (!botsSnap.empty) {
                const nomes    = embaralhar(POOL_NOMES);
                const botLotes = [];
                for (let i = 0; i < botsSnap.docs.length; i += TAMANHO_LOTE) {
                    const batch = db.batch();
                    botsSnap.docs.slice(i, i + TAMANHO_LOTE).forEach((d, idx) => {
                        const ligaCorreta = ligaDoBotPeloId(d.id);
                        batch.update(d.ref, {
                            xpSemana:  0,
                            liga:      ligaCorreta,
                            divisaoId: `${ligaCorreta}_bots`,
                            nome:      nomes[idx % nomes.length],
                        });
                    });
                    botLotes.push(batch.commit());
                }
                await Promise.all(botLotes);
                logger.info(`[Reset Ligas] ${botsSnap.docs.length} bots zerados e restaurados.`);
            }

            // ── 8. Atualizar controle_semanal ────────────────────────
            const controleRef    = db.collection("sistema").doc("controle_semanal");
            const divisoesUpdate = {ultimoReset: FieldValue.serverTimestamp()};
            for (const [ligaKey, ultima] of Object.entries(letrasUsadas)) {
                divisoesUpdate[`divisoes.${ligaKey}.ultima`] = ultima;
                divisoesUpdate[`divisoes.${ligaKey}.count`]  = 0;
            }
            await controleRef.set(divisoesUpdate, {merge: true});

            logger.info("[Reset Ligas] ✅ Concluído — divisões reagrupadas.");
        } catch (e) {
            logger.error("[Reset Ligas] ❌ Erro:", e);
        }
    },
);