"""Local-only bridge that saves app-entered scores into the project workbook."""
from __future__ import annotations

import json
import math
import re
import shutil
import tempfile
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from openpyxl import load_workbook
from openpyxl.worksheet.table import Table

APP = Path(__file__).resolve().parent
ROOT = APP.parents[2]
BOOK = APP.parent / "Futbol_Elo_Projesi_V1.xlsx"
DATA_JS = APP / "data.js"
PORT = 8766
LEAGUE_SHEETS = {
    "Premier League": "Premier League 26-27", "La Liga": "La Liga 26-27",
    "Serie A": "Serie A 26-27", "Bundesliga": "Bundesliga 26-27",
    "Ligue 1": "Ligue 1 26-27", "Süper Lig": "Süper Lig 26-27",
    "UEFA Champions League": "Champions League 26-27",
    "UEFA Europa League": "Europa League 26-27",
    "UEFA Conference League": "Conference League 26-27",
}

def normalize(value):
    import unicodedata
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    key = re.sub(r"[^a-z0-9]", "", text.lower())
    aliases = {
        "internazionale": "intermilan", "inter": "intermilan", "mancity": "manchestercity", "manutd": "manchesterunited",
        "nottmforest": "nottinghamforest", "leeds": "leedsunited", "spurs": "tottenhamhotspur", "brighton": "brightonhovealbion",
        "deportivoalaves": "alaves", "getafecf": "getafe", "villarrealcf": "villarreal", "rcdespanoldebarcelona": "espanyol",
        "levanteud": "levante", "atleticodemadrid": "atleticomadrid", "atleti": "atleticomadrid", "celta": "celtavigo", "rcdespanyoldebarcelona": "espanyol",
        "fcbarcelona": "barcelona", "caosasuna": "osasuna", "fcbayernmunchen": "bayernmunich", "bayernmunchen": "bayernmunich",
        "vfbstuttgart": "stuttgart", "1fckoln": "cologne", "tsghoffenheim": "hoffenheim", "1fcunionberlin": "unionberlin",
        "1fsvmainz05": "mainz", "bayer04leverkusen": "bayerleverkusen", "leverkusen": "bayerleverkusen", "hamburgersv": "hamburg",
        "scfreiburg": "freiburg", "svwerderbremen": "werderbremen", "fcaugsburg": "augsburg", "fcschalke04": "schalke",
        "olympiquedemarseille": "marseille", "rcstrasbourgalsace": "strasbourg", "ajauxerre": "auxerre", "stadebrestois29": "brest",
        "ogcnice": "nice", "fclorient": "lorient", "toulousefc": "toulouse", "olympiquelyonnais": "lyon", "angerssco": "angers",
        "losclille": "lille", "havreathleticclub": "lehavre", "asmonaco": "monaco", "staderennaisfc": "rennes", "bdortmund": "borussiadortmund",
        "paris": "parissaintgermain", "sbratislava": "slovanbratislava", "leipzig": "rbleipzig", "psv": "psveindhoven",
        "valenciacf": "valencia", "sevilla": "sevillafc", "elche": "elchecf", "copenhagen": "fccopenhagen", "omonoia": "omonia",
        "besiktas": "besiktas", "kasimpasa": "kasimpasa", "genclerbirligi": "genclerbirligi", "gaziantep": "gaziantepfk",
        "newcastle": "newcastleunited", "lens": "rclens", "lechpoznan": "lechpoznan", "viktoriaplzen": "viktoriaplzen",
        "shakhtar": "shakhtardonetsk", "jagiellonia": "jagielloniabiaystok", "istanbulbasaksehir": "basaksehir", "ucraiova": "universitateacraiova"
    }
    return aliases.get(key, key)

def app_data():
    source = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.FUTBOL_ELO_DATA\s*=\s*(\{.*\});\s*$", source, re.S)
    if not match:
        raise RuntimeError("Uygulamanın başlangıç Elo verisi okunamadı.")
    return json.loads(match.group(1))

def update_table(ws, table_name, end_row):
    if table_name in ws.tables:
        table = ws.tables[table_name]
        from openpyxl.utils.cell import range_boundaries, get_column_letter
        _, _, max_col, _ = range_boundaries(table.ref)
        table.ref = f"A4:{get_column_letter(max_col)}{end_row}"

def next_row(ws, table_name):
    table = ws.tables.get(table_name)
    return (table.ref and int(re.search(r"\d+$", table.ref).group())) if table else ws.max_row

def find_id(ws, match_id):
    for row in range(5, ws.max_row + 1):
        if str(ws.cell(row, 1).value or "") == match_id:
            return row
    return None

def copy_row_style(ws, row, template_row):
    if row == template_row:
        return
    for col in range(1, ws.max_column + 1):
        src, dst = ws.cell(template_row, col), ws.cell(row, col)
        if src.has_style:
            dst._style = src._style
        if src.number_format:
            dst.number_format = src.number_format

def read_rows(results):
    if not isinstance(results, list):
        raise ValueError("Skor kayıtlarının biçimi hatalı.")
    checked = {}
    for item in results:
        if not isinstance(item, dict):
            continue
        mid = str(item.get("matchId", ""))
        home, away = str(item.get("home", "")).strip(), str(item.get("away", "")).strip()
        date = str(item.get("date", ""))[:10]
        try:
            hg, ag = int(item["homeGoals"]), int(item["awayGoals"])
            datetime.strptime(date, "%Y-%m-%d")
        except (KeyError, ValueError, TypeError):
            raise ValueError("Tarih veya skor geçersiz.")
        if not mid or not home or not away or home == away or not (0 <= hg <= 99 and 0 <= ag <= 99):
            raise ValueError("Takım adları veya skor geçersiz.")
        checked[mid] = {**item, "matchId": mid, "home": home, "away": away,
                        "date": date, "homeGoals": hg, "awayGoals": ag}
    return list(checked.values())

def update_book(results):
    data = app_data()
    if not BOOK.exists():
        raise RuntimeError("Excel dosyası bulunamadı. Proje klasörünü kontrol et.")
    backup = BOOK.with_suffix(".xlsx.bak")
    if not backup.exists():
        shutil.copy2(BOOK, backup)
    wb = load_workbook(BOOK)
    matches = wb["Maçlar 26-27"]
    predictions = wb["Elo Tahmin 26-27"]
    for item in results:
        mid = item["matchId"]
        oldrow = find_id(matches, mid)
        competition = str(item.get("competition") or (matches.cell(oldrow, 3).value if oldrow else ""))
        stage = str(item.get("stage") or (matches.cell(oldrow, 5).value if oldrow else ""))
        source = "Kullanıcı girişi"
        url = str(item.get("url") or "")
        kickoff = f"{item['date']}T{item.get('time') or '23:59'}"
        vals = [mid, kickoff, competition, "2026–2027", stage, item["home"], item["away"],
                item["homeGoals"], item["awayGoals"], None, "Hayır", "Tamamlandı", source, url, "Hayır"]
        row = oldrow or matches.max_row + 1
        if not oldrow:
            copy_row_style(matches, row, max(5, row - 1))
        for col, value in enumerate(vals, 1):
            matches.cell(row, col).value = value
        update_table(matches, "TblMaclar2627", max(matches.max_row, row))

        sheet_name = LEAGUE_SHEETS.get(competition)
        if sheet_name and sheet_name in wb.sheetnames:
            league = wb[sheet_name]
            lr = find_id(league, mid) or (league.max_row + 1)
            if find_id(league, mid) is None:
                copy_row_style(league, lr, max(5, lr - 1))
            for col, value in enumerate(vals, 1):
                league.cell(lr, col).value = value
            for table in list(league.tables.values()):
                update_table(league, table.name, max(league.max_row, lr))

        prow = find_id(predictions, mid) or predictions.max_row + 1
        if find_id(predictions, mid) is None:
            copy_row_style(predictions, prow, max(5, prow - 1))
        home_elo, away_elo = item.get("homeEloBefore"), item.get("awayEloBefore")
        expected = (1 / (1 + 10 ** ((float(away_elo) - float(home_elo) - 60) / 400))) if home_elo is not None and away_elo is not None else None
        for col, value in {1:mid, 2:kickoff, 3:competition, 4:item["home"], 5:item["away"],
                           6:round(float(home_elo)) if home_elo is not None else None,
                           7:round(float(away_elo)) if away_elo is not None else None,
                           8:round(expected, 4) if expected is not None else None,
                           9:item["homeGoals"], 10:item["awayGoals"], 11:"Hayır", 12:url}.items():
            predictions.cell(prow, col).value = value
        update_table(predictions, "TblEloTahmin2627", max(predictions.max_row, prow))

    # Rebuild current Elo from the stable exported baseline, then replay all
    # app-entered results by date. Same-day fixtures share the day's opening Elo.
    ratings_ws = wb["Elo Güncel 26-27"]
    by_team = {normalize(r["team"]): r for r in data["ratings"]}
    elo = {key: float(value["elo"]) for key, value in by_team.items()}
    counts = {key: int(value.get("matches") or 0) for key, value in by_team.items()}
    base_date = data["asOf"]
    for day in sorted({r["date"] for r in results if r["date"] >= base_date}):
        group = [r for r in results if r["date"] == day]
        delta = {}
        played = set()
        for r in group:
            h, a = normalize(r["home"]), normalize(r["away"])
            if h not in elo or a not in elo:
                continue
            expected = 1 / (1 + 10 ** ((elo[a] - elo[h] - 60) / 400))
            actual = 1 if r["homeGoals"] > r["awayGoals"] else (0 if r["homeGoals"] < r["awayGoals"] else .5)
            change = 20 * (actual - expected)
            delta[h] = delta.get(h, 0) + change
            delta[a] = delta.get(a, 0) - change
            played.update((h, a))
        for key, amount in delta.items():
            elo[key] += amount
        for key in played:
            counts[key] += 1
    for row in range(5, ratings_ws.max_row + 1):
        team = normalize(ratings_ws.cell(row, 1).value)
        if team in elo:
            ratings_ws.cell(row, 3).value = round(elo[team])
            ratings_ws.cell(row, 4).value = counts[team]

    tmp = BOOK.with_name(BOOK.stem + ".saving.xlsx")
    try:
        wb.save(tmp)
        wb.close()
        tmp.replace(BOOK)
    except PermissionError:
        try: tmp.unlink(missing_ok=True)
        except OSError: pass
        raise RuntimeError("Excel dosyası açık olduğu için güncellenemedi. Excel'i kapatıp tekrar kaydet.")
    return {"saved": len(results), "workbook": BOOK.name}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP), **kwargs)
    def log_message(self, fmt, *args):
        print(fmt % args)
    def do_GET(self):
        if urlparse(self.path).path == "/api/status":
            self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.end_headers()
            self.wfile.write(json.dumps({"ready": True, "workbook": BOOK.name}, ensure_ascii=False).encode("utf-8")); return
        super().do_GET()
    def do_POST(self):
        if urlparse(self.path).path != "/api/sync":
            self.send_error(404); return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 2_000_000:
                raise ValueError("İstek boyutu sınırı aşıldı.")
            payload = json.loads(self.rfile.read(length))
            result = update_book(read_rows(payload.get("results")))
            self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
        except Exception as exc:
            self.send_response(400); self.send_header("Content-Type", "application/json; charset=utf-8"); self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8"))

if __name__ == "__main__":
    print(f"Futbol Elo açık: http://127.0.0.1:{PORT}")
    print("Skorlar proje Excel dosyasına kaydedilir. Durdurmak için bu pencereyi kapat.")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
