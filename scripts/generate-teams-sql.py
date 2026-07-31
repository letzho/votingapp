"""
Generate bulk INSERT SQL for teams from a CSV file.

CSV format (with header row):
name,slug,booth_number
HYDROLIFT,mp25052-hydrolift,B01
WATER FILTRATION SYSTEM,mp25053-water-filtration,B02

Usage:
  python scripts/generate-teams-sql.py teams.csv > supabase/my-teams.sql
"""

import csv
import re
import sys
from pathlib import Path


def slugify(text: str) -> str:
    value = text.lower().strip()
    value = re.sub(r'[^a-z0-9]+', '-', value)
    return value.strip('-')


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python scripts/generate-teams-sql.py teams.csv', file=sys.stderr)
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    rows: list[tuple[str, str, str | None]] = []

    with csv_path.open(newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get('name') or row.get('team_name') or row.get('title') or '').strip()
            if not name:
                continue
            slug = (row.get('slug') or slugify(name)).strip().lower()
            booth = (row.get('booth_number') or row.get('booth') or '').strip() or None
            rows.append((name, slug, booth))

    if not rows:
        print('-- No teams found in CSV', file=sys.stderr)
        sys.exit(1)

    print('-- Generated team import SQL')
    print('INSERT INTO groups (name, slug, booth_number) VALUES')
    values = []
    for name, slug, booth in rows:
        booth_sql = 'NULL' if booth is None else sql_quote(booth)
        values.append(f"  ({sql_quote(name)}, {sql_quote(slug)}, {booth_sql})")
    print(',\n'.join(values))
    print('ON CONFLICT (slug) DO UPDATE SET')
    print('  name = EXCLUDED.name,')
    print('  booth_number = EXCLUDED.booth_number;')
    print(f'\n-- Total teams: {len(rows)}')


if __name__ == '__main__':
    main()
