"""
Generate SQL to import allowed student emails from Excel.

Usage:
  python scripts/import_allowed_emails.py "Testing of email.xlsx" > supabase/allowed-emails.sql
"""

import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    raise SystemExit("Install openpyxl first: pip install openpyxl")


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    if len(sys.argv) < 2:
        xlsx_path = Path(__file__).resolve().parent.parent / "Testing of email.xlsx"
    else:
        xlsx_path = Path(sys.argv[1])

    if not xlsx_path.exists():
        raise SystemExit(f"File not found: {xlsx_path}")

    wb = openpyxl.load_workbook(xlsx_path)
    ws = wb.active

    emails: list[str] = []
    for row in ws.iter_rows(values_only=True):
        if not row or not row[0]:
            continue
        email = str(row[0]).strip().lower()
        if "@" not in email:
            continue
        if not email.endswith("@mymail.nyp.edu.sg"):
            print(f"-- Skipped non-student email: {email}", file=sys.stderr)
            continue
        emails.append(email)

    emails = sorted(set(emails))
    if not emails:
        raise SystemExit("No @mymail.nyp.edu.sg emails found in spreadsheet.")

    print("-- Allowed student emails for @mymail.nyp.edu.sg sign-in")
    print("CREATE TABLE IF NOT EXISTS allowed_student_emails (")
    print("  email TEXT PRIMARY KEY,")
    print("  created_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    print(");")
    print()
    print("INSERT INTO allowed_student_emails (email) VALUES")
    values = [f"  ({sql_quote(email)})" for email in emails]
    print(",\n".join(values))
    print("ON CONFLICT (email) DO NOTHING;")
    print()
    print(f"-- Total allowed student emails: {len(emails)}")


if __name__ == "__main__":
    main()
