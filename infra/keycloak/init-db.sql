-- init-db.sql — idempotent Keycloak database creation
-- Run before Keycloak boots: task keycloak:db-init
-- Safe to re-run on existing volumes (the WHERE NOT EXISTS guard prevents duplicate creation).
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
