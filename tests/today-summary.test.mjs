import {test} from 'node:test'
import assert from 'node:assert/strict'
import {summarizeHealth,displayHealthDate} from '../src/lib/today-summary.ts'
const item=(id,date,completed=false)=>({id,title:id,event_date:date,completed})
test('desktop agenda uses the Brasília day and separates overdue records from the next unconfirmed commitment',()=>{
 const records=[item('future','2026-10-29'),item('completed','2026-10-28',true),item('due','2026-10-28'),item('overdue','2026-10-27')]
 const result=summarizeHealth(records,new Date('2026-10-29T01:30:00Z'))
 assert.equal(result.next.id,'due');assert.equal(result.overdue,1)
 assert.deepEqual(records.map(r=>r.id),['future','completed','due','overdue'])
 assert.equal(displayHealthDate('2026-10-28'),'28/10')
})
test('invalid and completed health dates never create a false upcoming appointment',()=>{
 const result=summarizeHealth([item('bad','not-a-date'),item('bad-month','2026-99-99'),item('rollover','2026-02-30'),item('done','2026-10-28',true)],new Date('2026-10-28T12:00:00Z'))
 assert.equal(result.next,null);assert.equal(result.overdue,0)
 assert.equal(displayHealthDate('2026-10-29T01:30:00Z'),'28/10')
})
