import {test} from 'node:test'
import assert from 'node:assert/strict'
import {summarizeAdoption} from '../worker/adoption.js'
const DAY=86400000,start=Date.parse('2026-10-01T15:00:00Z')
test('critério de adoção distingue acompanhamento, conclusão e retorno final',()=>{
 const days=[1,2,4,6].map(period=>({period,actions:1,lastAt:start+(period-1)*DAY}))
 assert.equal(summarizeAdoption(null,[],start).status,'not_started')
 const ongoing=summarizeAdoption(start,days,start+6*DAY)
 assert.equal(ongoing.status,'in_progress');assert.equal(ongoing.reached,true)
 assert.equal(summarizeAdoption(start,days,start+7*DAY).status,'criterion_met')
 assert.equal(summarizeAdoption(start,[1,2,3,4].map(period=>({period,actions:1})),start+7*DAY).status,'criterion_not_met')
 assert.equal(summarizeAdoption(start,[{period:7,actions:100}],start+7*DAY).usefulDays,1)
 assert.equal(summarizeAdoption(start,[],start+7*DAY).elapsedDays,7)
})
