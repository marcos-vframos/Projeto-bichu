export type Ingredient = { id:string; name:string; preparation:string; grams:number; kcal100:number; protein100:number; fat100:number; source:string }
export function sumIngredients(items:Ingredient[]) {
  return items.reduce((s,i)=>({ grams:s.grams+i.grams, kcal:s.kcal+i.grams*i.kcal100/100, protein:s.protein+i.grams*i.protein100/100, fat:s.fat+i.grams*i.fat100/100 }),{grams:0,kcal:0,protein:0,fat:0})
}
export function dietOptions(items:Ingredient[],target:number,food:{kcal_per_kg:number;protein_pct?:number;fat_pct?:number}|undefined) {
  const base=sumIngredients(items),scale=base.kcal>0?target/base.kcal:0
  const commercialGrams=food&&food.kcal_per_kg>0?target*1000/food.kcal_per_kg:0
  const mixedCommercial=food&&food.kcal_per_kg>0?Math.max(0,target-base.kcal)*1000/food.kcal_per_kg:0
  const nutrients=(g:number)=>({protein:food?.protein_pct===undefined?null:g*food.protein_pct/100,fat:food?.fat_pct===undefined?null:g*food.fat_pct/100})
  const c=nutrients(commercialGrams),m=nutrients(mixedCommercial)
  return { commercial:{grams:commercialGrams,kcal:target,...c,commercialGrams,naturalGrams:0,scale:0}, natural:{grams:base.grams*scale,kcal:base.kcal*scale,protein:base.protein*scale,fat:base.fat*scale,commercialGrams:0,naturalGrams:base.grams*scale,scale}, mixed:{grams:base.grams+mixedCommercial,kcal:base.kcal+(food?mixedCommercial*food.kcal_per_kg/1000:0),protein:m.protein===null?null:base.protein+m.protein,fat:m.fat===null?null:base.fat+m.fat,commercialGrams:mixedCommercial,naturalGrams:base.grams,scale:1} }
}
