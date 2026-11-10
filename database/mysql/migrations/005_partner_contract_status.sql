SET NAMES utf8mb4;
USE jingfa_smartfit;

-- Contract stages confirmed by the platform administrator on 2026-11-10.
-- This does not change product admission rules or document verification status.
ALTER TABLE partners ALTER COLUMN status SET DEFAULT '待洽谈';

START TRANSACTION;
SET @workspace_id := (SELECT id FROM workspaces WHERE slug='jingfa-smartfit' LIMIT 1);

-- Seed these six identities as well, so a later historical catalog import
-- cannot reset contract progress on a fresh installation.
INSERT INTO partners (workspace_id,public_id,legacy_key,name,type,description,priority_code,city,status,is_public)
SELECT w.id,UUID(),p.legacy_key,p.name,p.type,p.description,'中',p.city,p.status,TRUE
FROM workspaces w CROSS JOIN (
  SELECT 'webank' legacy_key,'微众银行' name,'银行资金方' type,NULL description,'中国' city,'已签约' status
  UNION ALL SELECT 'qupital','Qupital 桥彼道','金融科技与离岸融资',NULL,'中国香港','已签约'
  UNION ALL SELECT 'fundpark','丰泊国际 FundPark','供应链金融科技',NULL,'中国香港','已签约'
  UNION ALL SELECT 'maodefei','贸德飞','合作机构','已签订合作合同，机构介绍及具体合作范围待补充。','待补充','已签约'
  UNION ALL SELECT 'fusion-bank','富融银行（Fusion Bank）','数字银行',NULL,'中国香港','签约流程中'
  UNION ALL SELECT 'olea','Olea 浩立','跨境贸易融资与国际保理',NULL,'新加坡','签约流程中'
) p WHERE w.id=@workspace_id
ON DUPLICATE KEY UPDATE status=VALUES(status);

UPDATE partners
SET status=CASE
  WHEN legacy_key IN ('webank','qupital','fundpark','maodefei') THEN '已签约'
  WHEN legacy_key IN ('fusion-bank','olea') THEN '签约流程中'
  ELSE '待洽谈'
END
WHERE workspace_id=@workspace_id AND deleted_at IS NULL;

INSERT INTO schema_migrations (version,description)
VALUES ('005','Record confirmed partner contract stages')
ON DUPLICATE KEY UPDATE description=VALUES(description);
COMMIT;
