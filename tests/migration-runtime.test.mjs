import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openStore} from '../server/storage.mjs'
import {migrateFromSource} from '../server/migrate.mjs'
import {backupPage} from '../worker/backup.js'
import {handlePilot} from '../worker/pilot-api.js'
test('migration requires frozen source, verifies data/photos, and never overwrites an imported destination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mb-import-')),source=openStore(join(dir,'source'));let frozen=false
 try{
 const now=Date.now(),iso=new Date().toISOString();source.raw.prepare('INSERT INTO pilot_accounts VALUES(?,?,?,?,?,?,?)').run('account','fake@test','salt','hash',now,now,now)
 source.raw.prepare("INSERT INTO pilot_records VALUES(?,?,'dogs',NULL,?,?,?)").run('pet','account','{"name":"Test pet"}',iso,iso)
 source.raw.prepare('INSERT INTO pilot_files VALUES(?,?,?,?,?,?,?,?)').run('photo','account','pet','dogs','photo.png','account/pet/photo.png','image/png',4)
 const env={MIGRATION_SOURCE:'https://source.test',MIGRATION_KEY:'test-key',DATA_DIR:join(dir,'destination')}
 const fake=async(url,options)=>{assert.equal(options.headers.authorization,'Bearer test-key');const u=new URL(url);if(u.pathname.endsWith('migration-status'))return Response.json({readOnly:frozen});if(u.pathname.endsWith('/backup'))return Response.json(await backupPage(source.DB,u));if(u.pathname.endsWith('/backup-file/photo'))return new Response(new Uint8Array([1,2,3,4]));throw Error('Unknown URL')}
 await assert.rejects(migrateFromSource(env,fake),/read-only/);frozen=true;await migrateFromSource(env,fake)
 const dest=openStore(env.DATA_DIR);assert.equal(dest.raw.prepare('SELECT COUNT(*) AS n FROM pilot_accounts').get().n,1);assert.equal(JSON.parse(dest.raw.prepare('SELECT data FROM pilot_records').get().data).name,'Test pet');assert.deepEqual((await dest.BUCKET.get('account/pet/photo.png')).body,new Uint8Array([1,2,3,4]));dest.close()
 await migrateFromSource(env,()=>{throw Error('Must not reimport')})
 const apiEnv={DB:source.DB,BUCKET:source.BUCKET,PILOT_READ_ONLY:'true',PILOT_ADMIN_KEY:'key'}
 const request=(path,method='GET',auth='key')=>new Request('https://source.test/api/pilot/'+path,{method,headers:{origin:'https://source.test',authorization:'Bearer '+auth}})
 assert.equal((await handlePilot(request('login','POST'),apiEnv)).status,503)
 assert.deepEqual(await(await handlePilot(request('admin/migration-status'),apiEnv)).json(),{readOnly:true})
 assert.equal((await handlePilot(request('admin/migration-status','GET','wrong'),apiEnv)).status,403)
 }finally{source.close();await rm(dir,{recursive:true,force:true})}
})
