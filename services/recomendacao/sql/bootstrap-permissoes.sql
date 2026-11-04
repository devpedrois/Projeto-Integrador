-- Executar com psql usando BOOTSTRAP_DATABASE_URL como conexao administrativa.
-- Fornecer senhas somente por variaveis do processo; nunca editar este arquivo.
-- Exemplo: psql "$BOOTSTRAP_DATABASE_URL" -f sql/bootstrap-permissoes.sql
-- Para automacao, preferir npm run bootstrap:permissoes, coberto pelos testes.
\set ON_ERROR_STOP on
\set ECHO none
\set api_schema public
\set rec_schema recomendacao
\set api_role origem_api_app
\set rec_role recomendacao_app
\set queue_schema ''
\set transfer_queue false
\getenv api_schema API_SCHEMA
\getenv rec_schema RECOMENDACAO_SCHEMA
\getenv api_role API_DATABASE_ROLE
\getenv rec_role RECOMENDACAO_DATABASE_ROLE
\getenv rec_password RECOMENDACAO_DATABASE_PASSWORD
\getenv api_password API_DATABASE_PASSWORD
\getenv queue_schema API_QUEUE_SCHEMA
\getenv transfer_queue TRANSFERIR_FILA
\if :{?rec_password}
\else
  \echo 'RECOMENDACAO_DATABASE_PASSWORD obrigatoria.'
  \quit 1
\endif
\if :{?api_password}
\else
  \set api_password ''
\endif

BEGIN;
-- A substituicao :'variavel' do psql escapa valores como literais SQL.
-- Dentro do bloco, format('%I') escapa identificadores e %L escapa senhas.
SELECT set_config('rec_bootstrap.api_schema', :'api_schema', true),
       set_config('rec_bootstrap.rec_schema', :'rec_schema', true),
       set_config('rec_bootstrap.api_role', :'api_role', true),
       set_config('rec_bootstrap.rec_role', :'rec_role', true),
       set_config('rec_bootstrap.rec_password', :'rec_password', true),
       set_config('rec_bootstrap.api_password', :'api_password', true),
       set_config('rec_bootstrap.queue_schema', :'queue_schema', true),
       set_config('rec_bootstrap.transfer_queue', :'transfer_queue', true)
\gset

DO $bootstrap$
DECLARE
  api_schema text := current_setting('rec_bootstrap.api_schema');
  rec_schema text := current_setting('rec_bootstrap.rec_schema');
  api_role text := current_setting('rec_bootstrap.api_role');
  rec_role text := current_setting('rec_bootstrap.rec_role');
  rec_password text := current_setting('rec_bootstrap.rec_password');
  api_password text := current_setting('rec_bootstrap.api_password');
  queue_schema text := current_setting('rec_bootstrap.queue_schema');
  transfer_queue boolean := current_setting('rec_bootstrap.transfer_queue')::boolean;
  admin_role text := current_user;
  name text;
  password text;
  owner_role text;
  object record;
BEGIN
  FOREACH name IN ARRAY ARRAY[api_schema,rec_schema,api_role,rec_role] LOOP
    IF name !~ '^[a-z][a-z0-9_]{0,62}$' THEN
      RAISE EXCEPTION 'Identificador invalido';
    END IF;
  END LOOP;
  IF api_schema=rec_schema OR api_role=rec_role
     OR admin_role IN (api_role,rec_role)
     OR length(rec_password)<32
     OR (api_password<>'' AND length(api_password)<32) THEN
    RAISE EXCEPTION 'Configuracao de bootstrap invalida';
  END IF;
  IF queue_schema<>'' AND (queue_schema !~ '^[a-z][a-z0-9_]{0,62}$'
     OR queue_schema IN (api_schema,rec_schema)) THEN
    RAISE EXCEPTION 'Schema da fila invalido';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('recomendacao-bootstrap:' || rec_role));
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname=api_schema) THEN
    RAISE EXCEPTION 'Aplicar migrations da API primeiro';
  END IF;

  FOREACH name IN ARRAY ARRAY[rec_role,api_role] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles r WHERE rolname=name AND
        (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolreplication
         OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=r.oid))) THEN
      RAISE EXCEPTION 'Papel de runtime privilegiado ou com heranca';
    END IF;
    password := CASE WHEN name=rec_role THEN rec_password ELSE api_password END;
    IF password<>'' THEN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=name) THEN
        EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L',name,password);
      ELSE
        EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',name,password);
      END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=name) THEN
      RAISE EXCEPTION 'Papel restrito da API deve existir';
    END IF;
  END LOOP;

  EXECUTE format('GRANT %I TO %I WITH SET TRUE, INHERIT TRUE',rec_role,admin_role);
  SELECT pg_get_userbyid(nspowner) INTO owner_role FROM pg_namespace WHERE nspname=rec_schema;
  IF owner_role IS NOT NULL AND owner_role<>rec_role THEN
    RAISE EXCEPTION 'Schema privado pertence a outro papel';
  END IF;
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I',rec_schema,rec_role);
  EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC, %I',rec_schema,api_role);
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC, %I',rec_schema,api_role);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC, %I',rec_schema,api_role);
  EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC, %I',rec_schema,api_role);
  EXECUTE format('REVOKE ALL ON SCHEMA %I FROM %I',api_schema,rec_role);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I, %I',api_schema,rec_role,api_role);
  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM %I',api_schema,rec_role);
  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM %I',api_schema,rec_role);
  EXECUTE format('GRANT SELECT ON %I.rec_produtos_elegiveis, %I.rec_compras_confirmadas TO %I, %I',api_schema,api_schema,rec_role,api_role);

  FOR object IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=api_schema AND c.relkind IN ('r','p') AND c.relname<>'_prisma_migrations'
  LOOP
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I.%I TO %I',api_schema,object.relname,api_role);
    IF has_table_privilege(rec_role,format('%I.%I',api_schema,object.relname),
                          'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'Acesso residual do microsservico nas tabelas da API';
    END IF;
  END LOOP;
  EXECUTE format('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA %I TO %I',api_schema,api_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO %I',admin_role,api_schema,api_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE,SELECT ON SEQUENCES TO %I',admin_role,api_schema,api_role);

  -- Opcional: somente a fila da API, com transferencia explicitamente autorizada.
  IF queue_schema<>'' THEN
    SELECT pg_get_userbyid(nspowner) INTO owner_role FROM pg_namespace WHERE nspname=queue_schema;
    IF owner_role IS NOT NULL AND owner_role<>api_role
       AND NOT (transfer_queue AND owner_role=admin_role) THEN
      RAISE EXCEPTION 'Transferencia da fila exige autorizacao explicita';
    END IF;
    EXECUTE format('GRANT %I TO %I WITH SET TRUE, INHERIT TRUE',api_role,admin_role);
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I',queue_schema,api_role);
    IF owner_role IS NOT NULL AND owner_role<>api_role THEN
      EXECUTE format('GRANT USAGE,CREATE ON SCHEMA %I TO %I',queue_schema,api_role);
      FOR object IN SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=queue_schema AND c.relkind IN ('r','p','S','v','m')
        ORDER BY CASE WHEN c.relkind='S' THEN 1 ELSE 0 END
      LOOP
        EXECUTE format('ALTER %s %I.%I OWNER TO %I',
          CASE object.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
          queue_schema,object.relname,api_role);
      END LOOP;
      FOR object IN SELECT p.proname,p.prokind,pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=queue_schema
      LOOP
        EXECUTE format('ALTER %s %I.%I(%s) OWNER TO %I',
          CASE object.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END,
          queue_schema,object.proname,object.args,api_role);
      END LOOP;
      EXECUTE format('ALTER SCHEMA %I OWNER TO %I',queue_schema,api_role);
    END IF;
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC, %I',queue_schema,rec_role);
    EXECUTE format('GRANT %I TO %I WITH SET FALSE, INHERIT FALSE',api_role,admin_role);
  END IF;

  -- Privilegios administrativos permanecem no administrador, nunca na API.
  EXECUTE format('SET LOCAL ROLE %I',rec_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM PUBLIC',rec_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM PUBLIC',rec_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',rec_schema);
  RESET ROLE;
  EXECUTE format('GRANT %I TO %I WITH SET FALSE, INHERIT FALSE',rec_role,admin_role);
  IF has_schema_privilege(api_role,rec_schema,'USAGE') THEN
    RAISE EXCEPTION 'API ainda acessa o schema privado';
  END IF;
END;
$bootstrap$;
COMMIT;
