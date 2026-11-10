import unittest
from import_catalog import sql_for, text_expr


class PartnerContractImportTests(unittest.TestCase):
    def statement(self, status):
        payload = {
            "partners": [{"id": "fixture", "name": "测试机构", "type": "合作机构", "status": status}],
            "products": [], "libraryDocuments": [], "counts": {}, "batchKey": "fixture", "sourceLabel": "fixture",
        }
        return sql_for(payload, "0" * 64).split("INSERT INTO partners", 1)[1].split(";", 1)[0]

    def test_legacy_cooperation_is_not_treated_as_a_signed_contract(self):
        statement = self.statement("合作中")
        self.assertIn(text_expr("待洽谈"), statement)
        self.assertNotIn(text_expr("合作中"), statement)

    def test_explicit_contract_stages_are_accepted_for_new_partners(self):
        for status in ("已签约", "签约流程中", "待洽谈"):
            with self.subTest(status=status):
                self.assertIn(text_expr(status), self.statement(status))

    def test_catalog_refresh_preserves_existing_contract_and_document_verification(self):
        update = self.statement("待洽谈").split("ON DUPLICATE KEY UPDATE", 1)[1]
        self.assertNotIn("status=", update)
        self.assertNotIn("verification_status=", update)
        self.assertIn("name=VALUES(name)", update)


if __name__ == "__main__":
    unittest.main()
