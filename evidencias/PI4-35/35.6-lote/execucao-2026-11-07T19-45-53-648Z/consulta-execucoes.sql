SELECT *,current_user AS "papelConsulta" FROM "recomendacao".execucao_lote WHERE id IN (
  '96fd4759-cd6a-468b-b4ab-6a69bf4c50ed'::uuid,
  '6c324442-bafe-4513-815a-1e17f505fb1b'::uuid,
  'ce2c9865-306b-4522-b4ef-8317e9417100'::uuid,
  '1cb71b66-50a3-43b1-bd77-cf28545a0ba6'::uuid,
  '5ab41178-d9d1-442d-9bde-5617b7910a5c'::uuid,
  '285c831c-9f3c-4f61-a80f-0e5dd5ac4c23'::uuid,
  '4b4985e7-5ed5-46bd-ad9a-90f99d4b6a7d'::uuid,
  '24a0a4ee-a2b7-407f-863f-fb4511143dcd'::uuid,
  '6298fbba-4120-4c58-a6df-ac00362a3048'::uuid,
  '4dae61a4-1935-4522-80a2-1bc3063b24bb'::uuid,
  '5da85d37-638b-485f-b38b-c2227814cc3b'::uuid,
  '08117cae-c67b-46cd-bc6f-d24f23d60e6a'::uuid,
  'd162e358-7dd7-4259-b79e-68210579a2a7'::uuid,
  'ed4fd996-9e5e-49a6-8e3c-c07b358eedc8'::uuid,
  '7264c2ea-f6d0-4143-a237-e0e5f42522c7'::uuid
) ORDER BY "iniciadoEm",id;
