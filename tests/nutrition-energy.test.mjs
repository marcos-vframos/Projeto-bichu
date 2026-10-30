import {test} from 'node:test'
import assert from 'node:assert/strict'
import {calculateNutrition} from '../src/lib/nutrition-calculator.ts'

const input={weightKg:5,sterilized:true,activityLevel:'moderada'}
test('supplied energy below, at and above 1000 kcal/kg is preserved in portions',()=>{
  for(const kcal of [1,500,800,1000,1000.5,3500,4500]){
    const result=calculateNutrition({...input,foodKcalPerKg:kcal})
    assert.equal(result.foodKcalPerKg,kcal)
    assert.equal(result.foodEnergyValid,true)
    assert.equal(result.dailyGrams,Math.round(result.dailyKcal*1000/kcal))
  }
  const regression=calculateNutrition({...input,foodKcalPerKg:800})
  assert.equal(regression.dailyKcal,412);assert.equal(regression.dailyGrams,515)
})
test('invalid supplied energy disables a portion instead of inventing a replacement',()=>{
  for(const kcal of [0,-1,NaN,Infinity,-Infinity]){
    const result=calculateNutrition({...input,foodKcalPerKg:kcal})
    assert.equal(result.foodEnergyValid,false);assert.equal(result.dailyGrams,0)
    assert.notEqual(result.foodKcalPerKg,3500)
  }
  const estimate=calculateNutrition(input)
  assert.equal(estimate.foodKcalPerKg,3500);assert.equal(estimate.foodEnergyValid,true)
})
