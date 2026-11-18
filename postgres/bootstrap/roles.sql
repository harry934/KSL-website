-- Initial empty-database provisioning only. Run on the VPS after confirming PostgreSQL
-- is installed and this database/role names are not used by another application.
-- Does not install extensions, modify postgresql.conf/pg_hba.conf, open network ports,
-- apply schema migrations, import data, or create a staff/admin account.
--
-- Run as the local PostgreSQL administrator, for example:
--   sudo -u postgres psql -v ON_ERROR_STOP=1 -f postgres/bootstrap/roles.sql
-- Then set each password interactively (not as a command-line argument):
--   sudo -u postgres psql
--   \password ksl_migrator
--   \password ksl_runtime
--   \q
-- Store credentials only in the root-protected application environment file.

\set ON_ERROR_STOP on

DO $bootstrap$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('ksl_migrator', 'ksl_runtime')) THEN
    RAISE EXCEPTION 'A role named ksl_migrator or ksl_runtime already exists; inspect it and provision manually rather than reusing it.';
  END IF;
END
$bootstrap$;

CREATE ROLE ksl_migrator LOGIN;
CREATE ROLE ksl_runtime LOGIN;

SELECT 'CREATE DATABASE ksl OWNER ksl_migrator ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ksl')
\gexec

-- Runtime may connect but cannot create schemas, roles, or databases. Schema/table
-- grants are installed by the reviewed application migrations, not guessed here.
REVOKE ALL ON DATABASE ksl FROM PUBLIC;
GRANT CONNECT ON DATABASE ksl TO ksl_runtime;

\connect ksl
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ksl_runtime;

SELECT 'PostgreSQL database `ksl` provisioned. Set both role passwords interactively with \\password before configuring the app.' AS result;
