// Teste rápido do novo formatador standalone
const { formatQlikScript } = require('./dist/services/qlikScriptFormatter');

const testSql = `PEDIDOS_ESTAGIOS:
SELECT
proproduto.pro_id ,
fatpedido.fil_id,
CASE fatpedido.ped_status
        WHEN 'A' THEN 'ABERTO'
        WHEN 'F' THEN 'FATURADO'
        WHEN 'C' THEN 'CANCELADO'
    ELSE ''
    END AS STATUS,
    fatpedido.ped_numero,
    SUM( (SELECT VALORLIQ FROM valorliquidored(fatpedidoitem.fpi_id)) ) TOTAL_ORCAMENTO
    FROM
    fatpedido
    JOIN fatpedidoestagio on (fatpedidoestagio.fpe_id = fatpedido.fpe_id)
    JOIN fattabelapreco on (fattabelapreco.tbp_id = fatpedido.tbp_id)
    WHERE
    fatpedido.ped_emissao >= CURRENT_DATE - 365*5
    GROUP BY
    fatpedido.fil_id,
    fatpedido.ped_status,
    fatpedido.ped_numero;

    STORE PEDIDOS_ESTAGIOS INTO [lib://Extracao/PEDIDOS_ESTAGIOS.qvd] (qvd);
    DROP TABLE PEDIDOS_ESTAGIOS;`;

console.log("🚀 TESTE: Novo Formatador Standalone\n");
console.log("═".repeat(80));
console.log("\n📥 INPUT (bagunçado):\n");
console.log(testSql);
console.log("\n" + "═".repeat(80));

formatQlikScript(testSql)
  .then(result => {
    console.log("\n✅ OUTPUT (formatado):\n");
    console.log(result.formattedScript);
    console.log("\n" + "═".repeat(80));
    console.log("\n📝 Notas:", result.notes.join(", "));
    console.log("🔧 Provider:", result.provider);
  })
  .catch(error => {
    console.error("\n❌ ERRO:", error.message);
    console.error(error.stack);
  });
