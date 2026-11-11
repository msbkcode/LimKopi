"""Targeted regression tests for individual report history, downloads and scheduling."""
import csv
import io
import zipfile
from xml.etree import ElementTree as ET
from datetime import timedelta

from helpers import ServerTestCase, server


class ReportsFeaturesTest(ServerTestCase):
    def test_individual_view_and_exports_only_one_snapshot(self):
        c = self.client('shaofeng')
        today = server.today_sgt().isoformat()
        oldest = (server.today_sgt() - timedelta(days=7)).isoformat()
        status, first = c.post('/api/reports', {'reportType':'Daily','date':today})
        self.assertEqual(status, 201)
        status, second = c.post('/api/reports', {'reportType':'Weekly','startDate':oldest,'endDate':today})
        self.assertEqual(status, 400)  # 8 days is invalid
        earliest = (server.today_sgt() - timedelta(days=6)).isoformat()
        status, second = c.post('/api/reports', {'reportType':'Weekly','startDate':earliest,'endDate':today})
        self.assertEqual(status, 201)
        first_id = first['report']['id']
        second_id = second['report']['id']
        self.assertNotEqual(first_id, second_id)
        code, history = c.get('/api/reports')
        self.assertEqual(code, 200)
        self.assertEqual({r['id'] for r in history}, {first_id, second_id})
        status, item = c.get('/api/reports/' + first_id)
        self.assertEqual(status, 200)
        self.assertEqual(item['id'], first_id)
        self.assertEqual(item['reportType'], 'Daily')
        status, csv_bytes = c.get('/api/reports/' + first_id + '.csv')
        self.assertEqual(status, 200)
        records = list(csv.DictReader(io.StringIO(csv_bytes.decode('utf-8-sig'))))
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['Report Type'] if 'Report Type' in records[0] else records[0]['reportType'], 'Daily')
        status, excel_bytes = c.get('/api/reports/' + second_id + '.xlsx')
        self.assertEqual(status, 200)
        with zipfile.ZipFile(io.BytesIO(excel_bytes)) as workbook:
            sheet = ET.fromstring(workbook.read('xl/worksheets/sheet1.xml'))
            ns = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            excel_rows = sheet.findall('.//m:sheetData/m:row', ns)
        self.assertEqual(len(excel_rows), 2)  # exactly 1 header + selected 1 report
        status, missing = c.get('/api/reports/rep-not-found.csv')
        self.assertEqual(status, 404)

    def test_no_activity_still_saved_and_viewable(self):
        c = self.client('shaofeng')
        status, result = c.post('/api/reports', {'reportType':'Daily','date':'2020-01-01'})
        self.assertEqual(status, 200)
        self.assertTrue(result['noData'])
        report_id = result['report']['id']
        code, saved = c.get('/api/reports/' + report_id)
        self.assertEqual(code, 200)
        self.assertEqual(saved['views'], 0)

    def test_scheduled_generation_idempotent(self):
        saved = server.generate_scheduled_reports()
        self.assertEqual(saved, 3)
        self.assertEqual(server.generate_scheduled_reports(), 0)
        records = self.db('SELECT reportType, startDate, endDate FROM reports')
        self.assertEqual({r['reportType'] for r in records}, {'Daily','Weekly','Monthly'})
        self.assertEqual(len(records), 3)

    def test_report_permissions(self):
        owner = self.client('shaofeng')
        status, result = owner.post('/api/reports', {'reportType':'Daily','date':server.today_sgt().isoformat()})
        self.assertEqual(status, 201)
        report_id = result['report']['id']
        visitor = self.client('shafiq')
        self.assertEqual(visitor.get('/api/reports/' + report_id)[0], 403)
        self.assertEqual(visitor.get('/api/reports/' + report_id + '.csv')[0], 403)
