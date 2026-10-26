import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync as read,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {spawnSync} from 'node:child_process'
import {backupPage,BACKUP_TABLES} from '../worker/backup.js'
function db(){const raw=new DatabaseSync(':memory:');for(const n of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())raw.exec(readFileSync(`drizzle/${n}`,'utf8').replaceAll('--> statement-breakpoint','\n'));return {raw,api:{prepare(sql){let v=[];return {bind(...a){v=a;return this},first(){return raw.prepare(sql).get(...v)},all(){return {results:raw.prepare(sql).all(...v)}},run(){return raw.prepare(sql).run(...v)}}}}}}
test('backup e restauração local preservam banco, foto e histórico, sem misturar destinos',async()=>{
 const {raw,api}=db(),now=Date.now(),iso=new Date().toISOString()
 raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,first_access_at,expires_at,created_at) VALUES (?,?,?,?,?,?,?)').run('account','test@test','salt','hash',now,now,now+86400000)
 raw.prepare("INSERT INTO pilot_records VALUES (?,?,'dogs',NULL,?,?,?)").run('pet','account',JSON.stringify({name:'Luna',weight_kg:12}),iso,iso)
 raw.prepare('INSERT INTO pilot_files VALUES (?,?,?,?,?,?,?,?)').run('file','account','pet','dogs','photo.png','account/pet/photo.png','image/png',4)
 const tables={};for(const table of BACKUP_TABLES)tables[table]=(await backupPage(api,new URL(`https://test/?table=${table}`))).items
 const dir=mkdtempSync(`${tmpdir()}/mb-backup-`);mkdirSync(`${dir}/input/files`,{recursive:true});writeFileSync(`${dir}/input/database.json`,JSON.stringify({format:'meu-bichu-backup-v1',tables}));writeFileSync(`${dir}/input/files/file`,Buffer.from([1,2,3,4]))
 try{const r=spawnSync(process.execPath,['scripts/restore-backup-local.mjs',`${dir}/input`,`${dir}/restored`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const restored=new DatabaseSync(`${dir}/restored/database.sqlite`);assert.equal(JSON.parse(restored.prepare('SELECT data FROM pilot_records WHERE id=?').get('pet').data).name,'Luna');assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM pilot_changes').get().n,tables.pilot_changes.length);assert.deepEqual(read(`${dir}/restored/objects/account/pet/photo.png`),Buffer.from([1,2,3,4]));assert.equal(spawnSync(process.execPath,['scripts/verify-migration.mjs',`${dir}/input`,`${dir}/restored`],{encoding:'utf8'}).status,0);assert.notEqual(spawnSync(process.execPath,['scripts/restore-backup-local.mjs',`${dir}/input`,`${dir}/restored`]).status,0);restored.close()}finally{rmSync(dir,{recursive:true,force:true});raw.close()}
})
