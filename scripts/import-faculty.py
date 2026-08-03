"""Import the IcfaiTech faculty workbook into the local SQLite database.

Run from the repository root after stopping the dev server:
  python scripts/import-faculty.py "C:/Users/pc/Downloads/IcfaiTech Staff Details (1).xlsx"

The generated credentials file is intentionally written under data/ (gitignored).
"""
from __future__ import annotations

import csv
import hashlib
import os
import secrets
import sqlite3
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def read_sheet(path: Path) -> list[dict[str, str | None]]:
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            for item in root.findall('x:si', NS):
                shared.append(''.join(node.text or '' for node in item.iter('{%s}t' % NS['x'])))
        root = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        rows = []
        for row in root.findall('.//x:sheetData/x:row', NS):
            values = {}
            for cell in row.findall('x:c', NS):
                ref = cell.attrib.get('r', '')
                col = ''.join(ch for ch in ref if ch.isalpha())
                value = cell.find('x:v', NS)
                text = value.text if value is not None else None
                if cell.attrib.get('t') == 's' and text is not None:
                    text = shared[int(text)]
                values[col] = text
            rows.append(values)
        headers = rows[3]
        names = {'A': 'S.No', 'B': 'Designation', 'C': 'EMP Code.', 'E': 'Name Of Faculty', 'F': 'Subject', 'G': 'Mobile No.', 'H': 'Email', 'I': 'Email Official'}
        return [{names[col]: row.get(col) for col in names} for row in rows[4:] if row.get('A')]


def clean(value) -> str | None:
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def password_hash(password: str) -> str:
    # Match Node's auth.ts: the stored hex salt is passed to scrypt as UTF-8 text.
    salt = secrets.token_hex(16)
    key = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64)
    return f"{salt}:{key.hex()}"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import-faculty.py <workbook.xlsx>")
    workbook = Path(sys.argv[1])
    db_path = Path(os.environ.get("SQLITE_PATH", "data/faculty-reporting.db"))
    if not workbook.exists():
        raise SystemExit(f"Workbook not found: {workbook}")
    if not db_path.exists():
        raise SystemExit(f"Database not found: {db_path}. Start the app once to run migrations first.")

    rows = read_sheet(workbook)

    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("INSERT OR IGNORE INTO departments (id, code, name) VALUES ('tech', 'TECH', 'IcfaiTech')")
    connection.execute("UPDATE users SET department_id = 'tech' WHERE role IN ('FACULTY', 'HOD')")

    credentials = []
    for row in rows:
        serial = int(float(row["S.No"]))
        name = clean(row["Name Of Faculty"]) or f"Faculty {serial}"
        employee_code = clean(row.get("EMP Code.")) or f"TECH-{serial:03d}"
        official_email = clean(row.get("Email Official"))
        personal_email = clean(row.get("Email"))
        login_email = official_email or personal_email
        if not login_email:
            raise SystemExit(f"No usable email for {name}")
        mobile = clean(row.get("Mobile No."))
        specialization = clean(row.get("Subject"))
        user_id = f"faculty-{employee_code.lower()}"
        existing = connection.execute("SELECT id FROM users WHERE employee_code = ? OR lower(email) = lower(?)", (employee_code, login_email)).fetchone()
        if existing:
            user_id = existing[0]
            connection.execute(
                "UPDATE users SET name=?, email=?, employee_code=?, personal_email=?, mobile=?, specialization=?, role='FACULTY', department_id='tech', is_active=1 WHERE id=?",
                (name, login_email, employee_code, personal_email, mobile, specialization, user_id),
            )
            password = secrets.token_urlsafe(12)
            connection.execute("INSERT OR REPLACE INTO credentials (user_id, password_hash) VALUES (?, ?)", (user_id, password_hash(password)))
        else:
            password = secrets.token_urlsafe(12)
            connection.execute(
                "INSERT INTO users (id, name, email, employee_code, personal_email, mobile, specialization, role, department_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 'FACULTY', 'tech', 1)",
                (user_id, name, login_email, employee_code, personal_email, mobile, specialization),
            )
            connection.execute("INSERT INTO credentials (user_id, password_hash) VALUES (?, ?)", (user_id, password_hash(password)))
        credentials.append((name, login_email, employee_code, password))

    connection.commit()
    connection.close()
    output = db_path.parent / "faculty-initial-credentials.csv"
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Name", "Login email", "Employee code", "Temporary password"])
        writer.writerows(credentials)
    print(f"Imported {len(credentials)} faculty accounts into {db_path}")
    print(f"Initial credentials written to {output}; distribute securely and delete after onboarding.")


if __name__ == "__main__":
    main()
