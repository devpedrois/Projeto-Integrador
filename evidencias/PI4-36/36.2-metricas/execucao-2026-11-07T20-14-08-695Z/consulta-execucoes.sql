SELECT *,current_user AS "papelConsulta" FROM recomendacao.execucao_lote WHERE id IN (
  '21f84da8-b666-4296-b151-c9f3293ac706'::uuid,
  '6be5e3bd-8875-4593-b78c-674548d6b928'::uuid
) ORDER BY "iniciadoEm";
