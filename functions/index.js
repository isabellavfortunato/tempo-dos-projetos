// Confere a cada minuto se algum timer chegou ao fim e manda o aviso para os aparelhos da pessoa.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();

exports.avisarTimers = onSchedule(
  { schedule: "every 1 minutes", region: "southamerica-east1", timeZone: "America/Sao_Paulo", retryCount: 0 },
  async () => {
    const db = admin.firestore();
    const vencidos = await db.collection("avisos").where("quando", "<=", Date.now()).limit(100).get();
    for (const doc of vencidos.docs) {
      const a = doc.data();
      // apaga primeiro para nunca mandar o mesmo aviso duas vezes
      await doc.ref.delete();
      if (!a.uid) continue;
      const aparelhos = await db.collection("usuarios").doc(a.uid).collection("aparelhos").get();
      const tokens = aparelhos.docs.map(d => d.data().token).filter(Boolean);
      if (!tokens.length) continue;
      const resposta = await admin.messaging().sendEachForMulticast({
        tokens,
        data: {
          titulo: "Timer concluído",
          texto: `${a.nome || "Seu projeto"} chegou ao fim do tempo.`,
          projeto: String(a.projeto || "timer")
        },
        webpush: { headers: { Urgency: "high", TTL: "3600" } }
      });
      // remove aparelhos que não aceitam mais avisos
      resposta.responses.forEach((r, i) => {
        const codigo = r.error && r.error.code;
        if (codigo === "messaging/registration-token-not-registered" || codigo === "messaging/invalid-registration-token") {
          aparelhos.docs[i].ref.delete().catch(() => {});
        }
      });
    }
  }
);
