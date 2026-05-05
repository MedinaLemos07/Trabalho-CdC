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

/**
 * Reseta campos de todos os usuários em lotes de 400.
 * @param {Object} camposBase - Campos a zerar.
 * @param {Array} idsMissoes - IDs das missões a resetar.
 */
async function resetarCamposEmLote(camposBase, idsMissoes) {
    const snapshot = await db.collection("usuarios").get();

    if (snapshot.empty) {
        logger.info("Nenhum usuário encontrado para resetar.");
        return;
    }

    const TAMANHO_LOTE = 400;
    const docs = snapshot.docs;
    const lotes = [];

    for (let i = 0; i < docs.length; i += TAMANHO_LOTE) {
        const batch = db.batch();
        const grupo = docs.slice(i, i + TAMANHO_LOTE);

        grupo.forEach((docSnap) => {
            const ref = docSnap.ref;
            const update = {...camposBase};

            idsMissoes.forEach((id) => {
                update[`missoes.${id}.concluida`] = false;
                update[`missoes.${id}.resgatada`] = false;
            });

            batch.update(ref, update);
        });

        lotes.push(batch.commit());
    }

    await Promise.all(lotes);
    logger.info(`Reset concluído: ${docs.length} usuários atualizados.`);
}

exports.resetDiario = onSchedule(
    {
        schedule: "0 3 * * *",
        timeZone: "America/Sao_Paulo",
        region: "us-central1",
    },
    async () => {
        logger.info("[Reset Diário] Iniciando...");
        try {
            await resetarCamposEmLote(CAMPOS_DIARIOS, IDS_MISSOES_DIARIAS);
            logger.info("[Reset Diário] ✅ Concluído.");
        } catch (e) {
            logger.error("[Reset Diário] ❌ Erro:", e);
        }
    },
);

exports.resetSemanal = onSchedule(
    {
        schedule: "10 3 * * 1",
        timeZone: "America/Sao_Paulo",
        region: "us-central1",
    },
    async () => {
        logger.info("[Reset Semanal] Iniciando...");
        try {
            await resetarCamposEmLote(CAMPOS_SEMANAIS, IDS_MISSOES_SEMANAIS);
            logger.info("[Reset Semanal] ✅ Concluído.");
        } catch (e) {
            logger.error("[Reset Semanal] ❌ Erro:", e);
        }
    },
);

exports.resetStreak = onSchedule(
    {
        schedule: "1 3 * * *",
        timeZone: "America/Sao_Paulo",
        region: "us-central1",
    },
    async () => {
        logger.info("[Reset Streak] Iniciando...");
        try {
            const hoje = new Date();
            const ontem = new Date(hoje.getTime() - 86400000)
                .toISOString()
                .split("T")[0];

            const snapshot = await db.collection("usuarios").get();
            if (snapshot.empty) return;

            const TAMANHO_LOTE = 400;
            const docs = snapshot.docs;
            const lotes = [];

            for (let i = 0; i < docs.length; i += TAMANHO_LOTE) {
                const batch = db.batch();
                const grupo = docs.slice(i, i + TAMANHO_LOTE);

                grupo.forEach((docSnap) => {
                    const dados = docSnap.data();
                    const ultimoScan = dados.ultimoScanDia || "";
                    const hojeStr = hoje.toISOString().split("T")[0];

                    if (ultimoScan !== ontem && ultimoScan !== hojeStr) {
                        batch.update(docSnap.ref, {streak: 0});
                    }
                });

                lotes.push(batch.commit());
            }

            await Promise.all(lotes);
            logger.info("[Reset Streak] ✅ Concluído.");
        } catch (e) {
            logger.error("[Reset Streak] ❌ Erro:", e);
        }
    },
);

// ============================================================
//  Reset de Ligas — toda segunda-feira às 03:00 BRT
//
//  Roda ANTES do resetSemanal (03:10) para calcular promoções/
//  rebaixamentos com o xpSemana da semana que passou.
//  O resetSemanal zera o xpSemana logo em seguida.
//
//  Lógica:
//    1. Busca todos os usuários e agrupa por divisão
//    2. Dentro de cada divisão, ordena por xpSemana
//    3. Top 3 sobe de liga, últimos 3 descem (se divisão > 3 usuários)
//    4. Sucata nunca rebaixa (é a liga de entrada)
//    5. Redistribui usuários em novas divisões de até 5 por liga destino
//    6. Zera xpSemana dos bots e rotaciona os nomes deles
//    7. Atualiza controle_semanal com as novas divisões
// ============================================================

const ORDEM_LIGAS = ["sucata", "reciclador", "guardiao", "agente_eco", "lenda_verde"];
const MAX_USUARIOS_POR_DIVISAO = 5;

const POOL_NOMES = [
    "Pedro Henrique", "AnaClara_23", "ShadowBR", "LucasXtreme", "Mariana Alves",
    "BrunoC_11", "NightWolf", "Julia Martins", "GabrielRush", "RafaMendes22",
    "SilentFox", "Camila Rocha", "FelipeZone", "Gustavo_13", "DarkPlayer",
    "Larissa Costa", "JoãoVictor_21", "NeoHunter", "Beatriz Souza", "DiegoBlaze",
    "IronCore", "Amanda Silva", "Thiago_88", "PixelWarrior", "Fernanda Lima",
    "EduardoMax", "QuickStrike", "Juliana Ribeiro", "MatheusPlay", "Andre_01",
    "GhostLine", "Bruna Mendes", "ViniciusRun", "RedFalcon", "Carlos Eduardo",
    "TurboX", "Ana Clara", "LucasGamer99", "DeltaForce", "Rafael Martins",
    "BlazeRunner", "MariPlay", "Rodrigo Nunes", "FrostByte", "GustavoForce",
    "LariZone", "DanielCraft", "Eduardo_77", "AlphaZone", "Renato Teixeira",
    "PedroShadow", "BiaGamer", "Marcelo Santos", "JoãoHunter", "Gabriel Souza",
    "CamilaXP", "DiegoRibeiro7", "ShadowLine", "JulianaXP", "MatheusBR10",
    "SilentStrike", "Bruno Carvalho", "AmandaPlay", "Felipe Almeida", "IronHunter",
    "LucasG_77", "FernandaX", "Vinicius Melo", "GhostRunner", "RafaStrike",
    "NeoStrike", "LarissaXP", "Eduardo Gomes", "DarkFox", "PedroH27",
    "MarianaXP", "Gustavo Rocha", "PixelStrike", "AnaZone", "João Victor",
    "BlazeCore", "Daniel Pereira", "TurboStrike", "CamilaPlay", "QuickHunter",
    "JulianaForce", "RodrigoXP", "NightStrike", "BeatrizXP", "CarlosM_22",
    "AlphaHunter", "Diego Fernandes", "FrostHunter", "AndreVolt", "AmandaZone",
    "BrunoXP", "Rafael_99", "SilentRunner", "ViniciusX", "Matheus Oliveira", "GhostStrike",
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
    {
        schedule: "0 3 * * 1",
        timeZone: "America/Sao_Paulo",
        region: "us-central1",
    },
    async () => {
        logger.info("[Reset Ligas] Iniciando...");
        try {
            // ── 1. Buscar todos os usuários ──────────────────────────
            const usersSnap = await db.collection("usuarios").get();
            if (usersSnap.empty) {
                logger.info("[Reset Ligas] Nenhum usuário encontrado.");
                return;
            }
            const todos = usersSnap.docs.map((d) => ({id: d.id, ...d.data()}));

            // ── 2. Agrupar por divisão atual ─────────────────────────
            const porDivisao = {};
            todos.forEach((u) => {
                const div = u.divisaoId || `_liga_${u.liga || "sucata"}`;
                if (!porDivisao[div]) porDivisao[div] = [];
                porDivisao[div].push(u);
            });

            // ── 3. Calcular resultado de cada divisão ────────────────
            const resultados = {};

            for (const [, membros] of Object.entries(porDivisao)) {
                const sorted = [...membros].sort(
                    (a, b) => (b.xpSemana || 0) - (a.xpSemana || 0),
                );
                const total = sorted.length;

                sorted.forEach((u, i) => {
                    const pos        = i + 1;
                    const ligaAtual  = u.liga || "sucata";
                    const idxLiga    = ORDEM_LIGAS.indexOf(ligaAtual);
                    const ligaAcima  = ORDEM_LIGAS[idxLiga + 1] || null;
                    const ligaAbaixo = ORDEM_LIGAS[idxLiga - 1] || null;

                    let novaLiga = ligaAtual;

                    // Top 3 sobe (exceto quem já está no topo)
                    if (ligaAcima && pos <= 3) novaLiga = ligaAcima;

                    // Últimos 3 descem — apenas se:
                    //   - existe liga abaixo (não é sucata)
                    //   - divisão tem mais de 3 usuários reais (evita sobe+desce simultâneo)
                    if (ligaAbaixo && total > 3 && pos > total - 3) novaLiga = ligaAbaixo;

                    resultados[u.id] = {
                        novaLiga,
                        ligaAntes:    ligaAtual,
                        posicaoFinal: pos,
                        xpFinal:      u.xpSemana || 0,
                    };
                });
            }

            // ── 4. Agrupar por liga destino e gerar novas divisões ───
            const porLigaDestino = {};
            for (const [uid, res] of Object.entries(resultados)) {
                if (!porLigaDestino[res.novaLiga]) porLigaDestino[res.novaLiga] = [];
                porLigaDestino[res.novaLiga].push(uid);
            }

            const novosDivisaoIds = {};
            for (const [liga, uids] of Object.entries(porLigaDestino)) {
                const embaralhados = embaralhar(uids);
                let letraIdx = 0;
                let contSlot = 0;

                for (const uid of embaralhados) {
                    if (contSlot >= MAX_USUARIOS_POR_DIVISAO) {
                        letraIdx++;
                        contSlot = 0;
                    }
                    const letra = String.fromCharCode(65 + letraIdx); // A, B, C...
                    novosDivisaoIds[uid] = `${liga}_${letra}`;
                    contSlot++;
                }
            }

            // ── 5. Calcular letras usadas para atualizar controle ────
            const letrasUsadas = {};
            for (const divisaoId of Object.values(novosDivisaoIds)) {
                const ligaKey    = divisaoId.replace(/_[A-Z]$/, "");
                const letraFinal = divisaoId.slice(-1);
                if (!letrasUsadas[ligaKey] || letraFinal > letrasUsadas[ligaKey]) {
                    letrasUsadas[ligaKey] = letraFinal;
                }
            }

            // ── 6. Gravar resultado dos usuários em lotes de 400 ─────
            const TAMANHO_LOTE = 400;
            const lotes = [];

            for (let i = 0; i < todos.length; i += TAMANHO_LOTE) {
                const batch = db.batch();
                const grupo = todos.slice(i, i + TAMANHO_LOTE);

                grupo.forEach((u) => {
                    const res         = resultados[u.id];
                    const novaDivisao = novosDivisaoIds[u.id] || u.divisaoId || `${res.novaLiga}_A`;

                    batch.update(db.collection("usuarios").doc(u.id), {
                        liga:      res.novaLiga,
                        divisaoId: novaDivisao,
                        xpSemana:  0,
                        ultimaTemporada: {
                            ligaAntes:    res.ligaAntes,
                            ligaDepois:   res.novaLiga,
                            posicaoFinal: res.posicaoFinal,
                            xpFinal:      res.xpFinal,
                            modalVisto:   null,
                        },
                    });
                });

                lotes.push(batch.commit());
            }

            await Promise.all(lotes);
            logger.info(`[Reset Ligas] ${todos.length} usuários atualizados.`);

            // ── 7. Zerar XP dos bots e rotacionar nomes ──────────────
            const botsSnap = await db.collection("bots").get();
            if (!botsSnap.empty) {
                const nomesEmbaralhados = embaralhar(POOL_NOMES);
                const botLotes = [];

                for (let i = 0; i < botsSnap.docs.length; i += TAMANHO_LOTE) {
                    const batch = db.batch();
                    const grupo = botsSnap.docs.slice(i, i + TAMANHO_LOTE);

                    grupo.forEach((d, idx) => {
                        batch.update(d.ref, {
                            xpSemana: 0,
                            nome:     nomesEmbaralhados[idx % nomesEmbaralhados.length],
                        });
                    });

                    botLotes.push(batch.commit());
                }

                await Promise.all(botLotes);
                logger.info(`[Reset Ligas] ${botsSnap.docs.length} bots zerados e nomes rotacionados.`);
            }

            // ── 8. Atualizar controle_semanal ────────────────────────
            const controleRef  = db.collection("sistema").doc("controle_semanal");
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