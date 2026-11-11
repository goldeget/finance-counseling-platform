"""Verify a review backup by restoring it into a disposable local SQLite database."""
import gzip
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

directory = Path(sys.argv[1])
manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
database = sqlite3.connect(':memory:')
database.execute('CREATE TABLE reviews (id TEXT PRIMARY KEY, author TEXT, source TEXT, rating REAL, content TEXT, review_date TEXT, created_at TEXT)')
digest = hashlib.sha256()
count = 0
with gzip.open(directory / 'reviews.jsonl.gz', 'rb') as source:
    for line in source:
        digest.update(line)
        row = json.loads(line)
        values = tuple(row[key] for key in ('id', 'author', 'source', 'rating', 'content', 'review_date', 'created_at'))
        database.execute('INSERT INTO reviews VALUES (?,?,?,?,?,?,?)', values)
        count += 1
restored = database.execute('SELECT count(*) FROM reviews').fetchone()[0]
if count != manifest['count'] or restored != count or digest.hexdigest() != manifest['sha256']:
    raise SystemExit('Backup integrity or restore check failed')
print(json.dumps({'restored_count': restored, 'sha256_matches': True}))
