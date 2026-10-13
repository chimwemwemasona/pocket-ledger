#!/usr/bin/env python3
import pathlib,sqlite3,datetime,os
runtime=pathlib.Path('/home/chimwemwe/apps/pocket-ledger-runtime')
dest=runtime/'backups';dest.mkdir(exist_ok=True,mode=0o700)
name=dest/('ledger-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.sqlite')
with sqlite3.connect(runtime/'data/ledger.sqlite') as source,sqlite3.connect(name) as target:
 source.backup(target)
 result=target.execute('PRAGMA integrity_check').fetchone()[0]
 if result!='ok':raise RuntimeError('Backup integrity check failed')
os.chmod(name,0o600)
cutoff=datetime.datetime.now().timestamp()-14*86400
for f in dest.glob('ledger-*.sqlite'):
 if f.stat().st_mtime<cutoff:f.unlink()
print('Pocket Ledger backup verified.')
