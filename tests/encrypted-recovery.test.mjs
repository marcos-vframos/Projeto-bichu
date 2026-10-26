import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {openStore} from '../server/storage.mjs'
import {initTeam} from '../server/team.mjs'
import {snapshot,pack,unpack} from '../server/recovery.mjs'
import {DatabaseSync} from 'node:sqlite'
test('encrypted full backup restores all tables and photographs; tampering and existing destination rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mb-encrypted-')),store=openStore(join(dir,'live'));let folder,sealed
 try{
 initTeam(store.raw);store.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run('account','t@test','salt','hash',1)
 store.raw.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run('audit','owner','example',null,1)
 const now=new Date().toISOString();store.raw.prepare("INSERT INTO pilot_records(id,account_id,collection,data,created_at,updated_at) VALUES(?,?,'dogs',?,?,?)").run('pet','account','{"name":"Maze","weight_kg":12}',now,now)
 const bytes=Buffer.from('photograph');await mkdir(join(dir,'live/objects/account/pet'),{recursive:true});await writeFile(join(dir,'live/objects/account/pet/photo.png'),bytes)
 store.raw.prepare('INSERT INTO pilot_files VALUES(?,?,?,?,?,?,?,?)').run('file','account','pet','dogs','photo.png','account/pet/photo.png','image/png',bytes.length)
 folder=snapshot(store,join(dir,'live'));sealed=await pack(folder,'a'.repeat(64));const out=join(dir,'restored'),result=await unpack(sealed,'a'.repeat(64),out)
 assert.equal(result.tables.team_audit,1);assert.equal(result.tables.pilot_accounts,1);assert.equal(result.objects,1);assert.deepEqual(await readFile(join(out,'objects/account/pet/photo.png')),bytes)
 const db=new DatabaseSync(join(out,'database.sqlite'));assert.equal(JSON.parse(db.prepare('SELECT data FROM pilot_records WHERE id=?').get('pet').data).name,'Maze');db.close()
 await assert.rejects(()=>unpack(sealed,'a'.repeat(64),out))
 const altered=await readFile(sealed);altered[25]^=1;await writeFile(join(dir,'bad.enc'),altered);await assert.rejects(()=>unpack(join(dir,'bad.enc'),'a'.repeat(64),join(dir,'bad')))
 await assert.rejects(()=>unpack(sealed,'b'.repeat(64),join(dir,'wrong')))
 }finally{store.close();for(const f of [dir,folder,sealed])if(f)await rm(f,{recursive:true,force:true})}
})
