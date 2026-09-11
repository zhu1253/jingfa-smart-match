REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'jingfa_app'@'%';

GRANT SELECT ON jingfa_smartfit.* TO 'jingfa_app'@'%';

GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.app_users TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.clients TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.client_snapshots TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.partners TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.products TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.product_versions TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.product_rules TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.knowledge_documents TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.knowledge_document_versions TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.knowledge_chunks TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.document_links TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.knowledge_ingestion_jobs TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.skills TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.skill_versions TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.skill_document_bindings TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.agent_conversations TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.agent_messages TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.match_runs TO 'jingfa_app'@'%';
GRANT INSERT, UPDATE, DELETE ON jingfa_smartfit.match_results TO 'jingfa_app'@'%';
GRANT INSERT ON jingfa_smartfit.audit_logs TO 'jingfa_app'@'%';

FLUSH PRIVILEGES;

USE jingfa_smartfit;

INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Restrict application account to data access without DDL or audit mutation')
ON DUPLICATE KEY UPDATE
  description = 'Restrict application account to data access without DDL or audit mutation';
