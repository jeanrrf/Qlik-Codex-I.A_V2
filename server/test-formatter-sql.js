// Quick test for SQL formatting
const { applyLocalAdvancedFormatting } = require('./dist/services/qlikFormatterService');

const testSql = `PEDIDOS_ESTAGIOS:
SELECT
// acrescentado
proproduto.pro_id ,
// fim acrescentado
fatpedido.fil_id,
CASE fatpedido.ped_status
        WHEN 'A' THEN 'ABERTO'
        WHEN 'F' THEN 'FATURADO'
        WHEN 'C' THEN 'CANCELADO'
        WHEN 'D' THEN 'DEVOLVIDO'
        WHEN 'R' THEN 'RESERVADO'
        WHEN 'O' THEN 'CONSIGNADO'
        WHEN 'I' THEN 'IMPORTADO'
        WHEN 'N' THEN 'ORÇAMENTO'
        WHEN 'P' THEN 'PENDENTE'
        WHEN 'S' THEN 'SALDO CANCELADO'
        WHEN 'T' THEN 'CONFERÊNCIA CONCLUIDA'
        WHEN 'B' THEN 'BAIXADO'
    ELSE ''
    END AS STATUS,
    fatpedido.ped_numero,
    fatpedido.ped_entrega,
    fatpedido.ped_emissao,
    finpessoa.pes_razao,
    finpessoa.pes_fantasia,
    fatpedido.ped_preventrega,
    fattabelapreco.tbp_descricao,
    repres.pes_razao as repres_pes_razao,
    FINCIDADE.CID_DESCRICAO,
    FINESTADO.EST_DESCRICAO,
    FINESTADO.EST_SIGLA,
    fatpedidoestagio.fpe_descricao estagio,
    PROPRODUTO.PRO_MASKCOD,
    PROPRODUTO.PRO_DESCRICAO,
    PROPRODUTO.PRO_DESCRICAORED,
    PROGRUPO.GRP_DESCRICAO,
    PROCRITERIO.CRI_DESCRICAO,
    PROLINHA.LIN_DESCRICAO,
    SUM( (SELECT VALORLIQ FROM valorliquidored(fatpedidoitem.fpi_id)) ) TOTAL_ORCAMENTO


    FROM
    fatpedido
    JOIN fatpedidoestagio on (fatpedidoestagio.fpe_id = fatpedido.fpe_id)
    JOIN fattabelapreco on (fattabelapreco.tbp_id = fatpedido.tbp_id)
    JOIN finpessoa on (finpessoa.pes_id = fatpedido.pes_id)
    JOIN FINCIDADE on (FINCIDADE.cid_id = finpessoa.cid_id)
    JOIN finestado on (finestado.est_id = FINCIDADE.est_id)
    JOIN fatpedidorepres on (fatpedidorepres.ped_id = fatpedido.ped_id)
    JOIN finpessoa repres on (repres.pes_id = fatpedidorepres.pes_id and fatpedidorepres.ped_ordemnopedido = 1)
    JOIN fatpedidoitem on (fatpedidoitem.ped_id = fatpedido.ped_id)
    JOIN proprodutoitem on (proprodutoitem.pit_id = fatpedidoitem.pit_id)
    JOIN proproduto on (proproduto.pro_id = proprodutoitem.pro_id)
    JOIN PROGRUPO ON (PROGRUPO.GRP_ID = PROPRODUTO.GRP_ID)
    JOIN PROLINHA ON (PROLINHA.LIN_ID = PROPRODUTO.LIN_ID)
    JOIN PROCRITERIO ON (PROCRITERIO.CRI_ID = PROPRODUTO.CRI_ID)


    WHERE
    fatpedido.ped_emissao >= CURRENT_DATE - 365*5
    GROUP BY
    fatpedido.fil_id,
    fatpedido.ped_status,
    fatpedido.ped_numero,
    fatpedido.ped_entrega,
    fatpedido.ped_emissao,
    finpessoa.pes_razao,
    finpessoa.pes_fantasia,
    fatpedido.ped_preventrega,
    fattabelapreco.tbp_descricao,
    repres.pes_razao,
    FINCIDADE.CID_DESCRICAO,
    FINESTADO.EST_DESCRICAO,
    FINESTADO.EST_SIGLA,
    fatpedidoestagio.fpe_descricao ,
    proproduto.pro_id ,
    PROPRODUTO.PRO_MASKCOD,
    PROPRODUTO.PRO_DESCRICAO,
    PROPRODUTO.PRO_DESCRICAORED,
    PROGRUPO.GRP_DESCRICAO,
    PROCRITERIO.CRI_DESCRICAO,
    PROLINHA.LIN_DESCRICAO;

    STORE PEDIDOS_ESTAGIOS INTO [lib://Extracao/PEDIDOS_ESTAGIOS.qvd] (qvd);
    DROP TABLE PEDIDOS_ESTAGIOS;`;

console.log("=== TESTANDO FORMATADOR SQL ===\n");
console.log("INPUT:");
console.log(testSql);
console.log("\n\n=== FORMATADO ===\n");

try {
  const result = applyLocalAdvancedFormatting(testSql);
  console.log(result);
} catch (error) {
  console.error("ERRO:", error.message);
  console.error(error.stack);
}
