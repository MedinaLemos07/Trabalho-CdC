// ============================================================
//  RECYCLE AGENTS — functions/index.js
//  Cloud Functions agendadas para reset de missões.
// ============================================================

const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {getFirestore} = require("firebase-admin/firestore");
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
        schedule: "0 3 * * 1",
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