USE jingfa_smartfit;

ALTER TABLE partners
  ADD COLUMN verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified' AFTER status,
  ADD CONSTRAINT chk_partners_verification_status
    CHECK (verification_status IN ('unverified', 'partial', 'verified', 'needs_confirmation'));

ALTER TABLE products
  ADD COLUMN verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified' AFTER status,
  ADD COLUMN matching_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER verification_status,
  ADD KEY idx_products_catalog_state
    (workspace_id, status, verification_status, matching_enabled),
  ADD CONSTRAINT chk_products_verification_status
    CHECK (verification_status IN ('unverified', 'partial', 'verified', 'needs_confirmation'));

ALTER TABLE product_versions
  ADD COLUMN currency_label VARCHAR(100) NULL AFTER currency,
  ADD COLUMN admission_rules JSON NULL AFTER materials,
  ADD COLUMN verification_note TEXT NULL AFTER source;

ALTER TABLE knowledge_documents
  ADD COLUMN agent_retrieval_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER access_level,
  ADD KEY idx_knowledge_documents_retrieval
    (workspace_id, status, access_level, agent_retrieval_enabled);

UPDATE knowledge_documents
SET agent_retrieval_enabled = FALSE
WHERE access_level = 'restricted';

CREATE TABLE IF NOT EXISTS partner_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  partner_id BIGINT UNSIGNED NOT NULL,
  alias_name VARCHAR(200) NOT NULL,
  alias_normalized VARCHAR(200) NOT NULL,
  source_key VARCHAR(160) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_partner_aliases_workspace_normalized (workspace_id, alias_normalized),
  KEY idx_partner_aliases_partner (partner_id),
  CONSTRAINT fk_partner_aliases_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE RESTRICT,
  CONSTRAINT fk_partner_aliases_partner
    FOREIGN KEY (partner_id) REFERENCES partners (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS catalog_source_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  source_key VARCHAR(160) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_legacy_key VARCHAR(160) NOT NULL,
  partner_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  source_kind VARCHAR(32) NOT NULL,
  source_locator VARCHAR(500) NOT NULL,
  safe_payload JSON NOT NULL,
  access_level VARCHAR(24) NOT NULL DEFAULT 'internal',
  verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
  agent_retrieval_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_source_records_workspace_key (workspace_id, source_key),
  KEY idx_catalog_source_records_entity (workspace_id, entity_type, entity_legacy_key),
  KEY idx_catalog_source_records_partner (partner_id),
  KEY idx_catalog_source_records_product (product_id),
  KEY idx_catalog_source_records_retrieval
    (workspace_id, access_level, agent_retrieval_enabled, verification_status),
  CONSTRAINT fk_catalog_source_records_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_source_records_partner
    FOREIGN KEY (partner_id) REFERENCES partners (id) ON DELETE SET NULL,
  CONSTRAINT fk_catalog_source_records_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT chk_catalog_source_records_entity_type
    CHECK (entity_type IN ('partner', 'product', 'document')),
  CONSTRAINT chk_catalog_source_records_access
    CHECK (access_level IN ('public', 'internal', 'restricted')),
  CONSTRAINT chk_catalog_source_records_verification
    CHECK (verification_status IN ('unverified', 'partial', 'verified', 'needs_confirmation')),
  CONSTRAINT chk_catalog_source_records_single_entity
    CHECK ((partner_id IS NOT NULL) + (product_id IS NOT NULL) <= 1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS catalog_import_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  batch_key VARCHAR(160) NOT NULL,
  manifest_sha256 CHAR(64) NOT NULL,
  source_label VARCHAR(255) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'running',
  counts_json JSON NULL,
  warnings_json JSON NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_import_batches_workspace_key (workspace_id, batch_key),
  KEY idx_catalog_import_batches_status_started (workspace_id, status, started_at),
  CONSTRAINT fk_catalog_import_batches_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_import_batches_status
    CHECK (status IN ('running', 'completed', 'failed'))
) ENGINE=InnoDB;

INSERT INTO schema_migrations (version, description)
VALUES ('003', 'Add catalog provenance, aliasing, verification and retrieval controls')
ON DUPLICATE KEY UPDATE
  description = 'Add catalog provenance, aliasing, verification and retrieval controls';
