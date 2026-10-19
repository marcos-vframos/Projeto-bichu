import { useEffect, useState } from 'react'
import { useDog } from '@/contexts/DogContext'
import { pilotNutritionService } from '@/services/nutrition-pilot'
import { nutritionService } from '@/services/nutrition'
import { getDefaultMeals } from '@/lib/nutrition-calculator'
import { dietOptions, sumIngredients, type Ingredient } from '@/lib/diet-math'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { FoodRecord } from '@/types/nutrition'
const row = ():Ingredient => ({id:crypto.randomUUID(),name:'',preparation:'cozido',grams:0,kcal100:0,protein100:-1,fat100:-1,source:''})
const fmt=(v:number|null)=>v===null?'Não informado':v.toLocaleString('pt-BR',{maximumFractionDigits:1})
export default function NaturalDiet({foods}:{foods:FoodRecord[]}) {
  const {activeDog,activePlan,refreshActivePlan}=useDog()
  const [items,setItems]=useState<Ingredient[]>([row()]),[mixed,setMixed]=useState(false),[foodId,setFoodId]=useState(''),[target,setTarget]=useState(activePlan?.daily_kcal||0),[mode,setMode]=useState<'commercial'|'natural'|'mixed'>('natural'),[professional,setProfessional]=useState(''),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false)
  const suitable=foods.filter(f=>(f.species||'canina')===(activeDog?.species||'canina')&&!['petisco','biscoito'].includes(f.category||'')&&!/complementar/i.test(f.nutritional_adequacy||'')),food=suitable.find(f=>f.id===foodId),base=sumIngredients(items),options=dietOptions(items,target,food)
  useEffect(()=>{let current=true;setLoaded(false);setItems([row()]);setTarget(activePlan?.daily_kcal||0);setProfessional('');setReviewed(false);setFoodId('');setMixed(false);setMode('natural');if(!activeDog)return;void pilotNutritionService.getNaturalDiets(activeDog.id).then(rows=>{if(!current)return;const prior=rows[0];if(prior){setItems(prior.ingredients);setTarget(prior.target);setFoodId(prior.foodId||'');setMixed(prior.mixed);setMode(prior.mode);setProfessional(prior.professional||'')}}).catch(()=>toast.error('Não foi possível recuperar a receita salva.')).finally(()=>{if(current)setLoaded(true)});return()=>{current=false}},[activeDog?.id])
  const edit=(id:string,key:keyof Ingredient,value:string)=>setItems(prev=>prev.map(i=>i.id===id?{...i,[key]:['grams','kcal100','protein100','fat100'].includes(key)?Number(value):value}:i))
  const save=async(apply:boolean)=>{
    if(!activeDog)return
    if(!loaded||!target||items.some(i=>!i.name.trim()||!i.source.trim()||i.grams<=0||i.kcal100<=0||![i.grams,i.kcal100,i.protein100,i.fat100].every(Number.isFinite)||i.protein100<0||i.fat100<0||i.protein100+i.fat100>100)){toast.error('Informe alimentos, gramagens e valores por 100 g com suas fontes.');return}
    if(apply&&(!reviewed||!professional.trim())){toast.error('Para ativar, confirme a receita e meta prescritas pelo veterinário e informe o responsável.');return}
    if(apply&&(mode==='commercial'||mode==='mixed')&&!food){toast.error('Escolha o alimento comercial.');return}
    if(apply&&mode==='mixed'&&base.kcal>=target){toast.error('A porção natural já alcança a meta. Ajuste a receita para incluir a ração.');return}
    setBusy(true)
    try{
      await pilotNutritionService.saveNaturalDiet({dog:activeDog.id,ingredients:items,target,foodId,mixed,mode,professional})
      if(apply){const selected=options[mode],portions=items.map(i=>({...i,grams:i.grams*selected.scale})),count=activePlan?.meals_per_day||2
        await nutritionService.savePlan(activeDog.id,{food_name:mode==='commercial'?food!.name:mode==='natural'?'Alimentação natural prescrita':`Natural + ${food!.name}`,food:mode==='natural'?undefined:foodId,kcal_per_kg:selected.grams>0?selected.kcal/selected.grams*1000:0,meals_per_day:count,daily_kcal:selected.kcal,daily_grams:selected.grams,goal:activePlan?.goal||'manter',diet_mode:mode,diet_details:{commercialGrams:selected.commercialGrams,naturalGrams:selected.naturalGrams,proteinGrams:selected.protein,fatGrams:selected.fat,ingredients:portions,professional},meals_json:getDefaultMeals(count,selected.grams)})
        await refreshActivePlan()
      }
      toast.success(apply?'Plano selecionado em vigência.':'Receita salva para revisão.')
    }catch{toast.error('Não foi possível salvar o planejamento.')}finally{setBusy(false)}
  }
  return <section className="rounded-2xl border border-border bg-card p-5 space-y-5"><h2 className="text-xl font-bold">Alimentação natural e mista</h2><p className="text-sm text-muted-foreground">Cadastre a receita prescrita. Informe valores por 100 g do alimento no preparo indicado, usando a tabela de composição ou o rótulo. Estes cálculos somam energia, proteína e gordura; não verificam vitaminas, minerais, taurina nem se a dieta é completa para cães ou gatos. A energia de tabelas humanas pode diferir da energia metabolizável para o pet. <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer" className="underline">Consultar FoodData Central</a>.</p>
    <label className="block text-sm font-semibold">Meta energética prescrita (kcal/dia)<Input type="number" min="1" max="20000" value={target} onChange={e=>setTarget(Number(e.target.value))}/></label>
    {items.map((item,index)=><fieldset key={item.id} className="rounded-xl border border-border p-4"><legend className="px-2 font-bold">Alimento {index+1}</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries({name:'Alimento',preparation:'Preparo: cozido, cru, assado…',grams:'Quantidade na receita (g)',kcal100:'Energia (kcal por 100 g)',protein100:'Proteína (g por 100 g)',fat100:'Gordura (g por 100 g)',source:'Fonte dos valores / identificação da tabela'}).map(([key,label])=><label key={key} className="text-sm">{label}<Input type={['grams','kcal100','protein100','fat100'].includes(key)?'number':'text'} min="0" step="any" value={typeof item[key as keyof Ingredient]==='number' && Number(item[key as keyof Ingredient])<0 ? '' : item[key as keyof Ingredient]} onChange={e=>edit(item.id,key as keyof Ingredient,e.target.value)}/></label>)}</div><Button className="mt-3" variant="outline" disabled={items.length===1} onClick={()=>setItems(prev=>prev.filter(i=>i.id!==item.id))}>Remover alimento</Button></fieldset>)}
    <Button variant="outline" onClick={()=>setItems(prev=>[...prev,row()])}>Adicionar alimento à receita</Button>
    <p className="rounded-xl bg-muted p-4">Receita informada: {fmt(base.grams)} g · {fmt(base.kcal)} kcal · proteína {items.some(i=>i.protein100<0)?'—':fmt(base.protein)} g · gordura {items.some(i=>i.fat100<0)?'—':fmt(base.fat)} g.</p>
    <label className="flex items-center gap-3"><Checkbox checked={mixed} onCheckedChange={v=>{setMixed(v===true);if(!v&&mode==='mixed')setMode('natural')}}/>Também uso alimento próprio para animais</label>
    {mixed&&<label className="block text-sm font-semibold">Ração ou alimento completo<select className="mt-1 w-full rounded-xl border border-border bg-background p-3" value={foodId} onChange={e=>setFoodId(e.target.value)}><option value="">Escolher alimento da espécie do pet</option>{suitable.map(f=><option value={f.id} key={f.id}>{f.brand} · {f.name}</option>)}</select></label>}
    <div className="grid gap-3 md:grid-cols-3">{(['commercial','natural','mixed'] as const).map(m=>{const o=options[m],disabled=m!=='natural'&&(!mixed||!food);return <label key={m} className={`rounded-xl border p-4 ${mode===m?'border-primary bg-primary/10':'border-border'} ${disabled?'opacity-60':''}`}><input type="radio" name="diet-mode" checked={mode===m} disabled={disabled} onChange={()=>setMode(m)}/><strong className="ml-2">{{commercial:'Somente ração',natural:'Somente natural',mixed:'Ambas juntas'}[m]}</strong><p className="mt-3">Ração: {fmt(o.commercialGrams)} g<br/>Natural: {fmt(o.naturalGrams)} g<br/>Energia: {disabled?'—':fmt(o.kcal)} kcal<br/>Proteína: {disabled||items.some(i=>i.protein100<0)?'—':fmt(o.protein)} g<br/>Gordura: {disabled||items.some(i=>i.fat100<0)?'—':fmt(o.fat)} g</p></label>})}</div>
    <p className="text-sm text-muted-foreground">Somente natural ajusta proporcionalmente a receita à meta. Ambas mantém a gramagem natural informada e calcula a ração para a energia restante. Ajustes só podem ser ativados se correspondem à prescrição; confirme com o profissional antes de alterar proporções.</p>
    {mixed&&base.kcal>=target&&<p role="alert" className="text-destructive">A receita natural já alcança ou supera a meta. Não há energia restante para ração.</p>}
    <label className="block text-sm">Veterinário responsável pela receita e meta<Input value={professional} onChange={e=>setProfessional(e.target.value)}/></label><label className="flex gap-3 items-start"><Checkbox checked={reviewed} onCheckedChange={v=>setReviewed(v===true)}/><span className="text-sm">Confirmo que a receita, quantidades e combinação selecionadas foram prescritas ou revisadas pelo profissional informado.</span></label>
    <div className="flex flex-wrap gap-3"><Button disabled={busy||!loaded} variant="outline" onClick={()=>void save(false)}>Salvar receita</Button><Button disabled={busy||!loaded} onClick={()=>void save(true)}>Aplicar opção ao plano alimentar</Button></div>
    {activePlan?.diet_mode&&<p className="text-sm font-semibold">Em vigência: {{commercial:'somente alimento comercial',natural:'somente alimentação natural',mixed:'alimentação mista'}[activePlan.diet_mode]} · {activePlan.food_name}</p>}
  </section>
}
