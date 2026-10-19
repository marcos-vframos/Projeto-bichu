/**
 * Helper de extração e parsing de rótulos de embalagens de ração
 * Faz a análise client-side do texto/OCR e fallback para confirmação manual
 * Nunca inventa números: se não encontrar com segurança, deixa vazio para inserção manual.
 */

export interface ExtractedFoodData {
  brand?: string
  name?: string
  kcal_per_kg?: number
  protein_pct?: number
  fat_pct?: number
  fiber_pct?: number
  moisture_pct?: number
  package_weight_kg?: number
  package_price_brl?: number
  ingredients?: string
  raw_text?: string
}

export function parseNutritionLabelText(rawText: string): ExtractedFoodData {
  const result: ExtractedFoodData = {
    raw_text: rawText,
  }

  const text = rawText.toLowerCase()

  // 1. Energia metabolizável / kcal por kg
  // Ex: "3.500 kcal/kg", "3500 kcal / kg", "3800kcal", "energia metabolizavel: 3600 kcal"
  const kcalMatch =
    text.match(
      /(?:energia\s+metaboliz[áa]vel|valor\s+energ[ée]tico|kcal\/kg|kcal\s+por\s+kg)[^\d]{0,25}(\d[\d.,]*\d|\d+)\s*(?:kcal)?/i,
    ) || text.match(/(\d[\d.,]*\d|\d+)\s*(?:kcal\/kg|kcal\s*\/\s*kg)/i)

  if (kcalMatch && kcalMatch[1]) {
    const cleaned = kcalMatch[1].replace(/\./g, '').replace(',', '.')
    const parsed = Number(cleaned)
    if (!isNaN(parsed) && parsed >= 1500 && parsed <= 5500) {
      result.kcal_per_kg = Math.round(parsed)
    }
  }

  // 2. Proteína bruta (mín)
  // Ex: "proteína bruta (mín.) 26%", "proteina bruta: 28 %", "pb: 25%"
  const proteinMatch = text.match(
    /(?:prote[íi]na\s+bruta|prote[íi]na|pb)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*%/i,
  )
  if (proteinMatch && proteinMatch[1]) {
    const val = Number(proteinMatch[1].replace(',', '.'))
    if (!isNaN(val) && val >= 5 && val <= 60) {
      result.protein_pct = Number(val.toFixed(1))
    }
  }

  // 3. Extrato etéreo / Gordura
  const fatMatch = text.match(
    /(?:extrato\s+et[ée]reo|gordura|lip[íi]dios)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*%/i,
  )
  if (fatMatch && fatMatch[1]) {
    const val = Number(fatMatch[1].replace(',', '.'))
    if (!isNaN(val) && val >= 1 && val <= 40) {
      result.fat_pct = Number(val.toFixed(1))
    }
  }

  // 4. Matéria fibrosa / Fibra bruta
  const fiberMatch = text.match(
    /(?:mat[ée]ria\s+fibrosa|fibra\s+bruta|fibra)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*%/i,
  )
  if (fiberMatch && fiberMatch[1]) {
    const val = Number(fiberMatch[1].replace(',', '.'))
    if (!isNaN(val) && val >= 0.5 && val <= 25) {
      result.fiber_pct = Number(val.toFixed(1))
    }
  }

  // 5. Umidade
  const moistureMatch = text.match(/umidade[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*%/i)
  if (moistureMatch && moistureMatch[1]) {
    const val = Number(moistureMatch[1].replace(',', '.'))
    if (!isNaN(val) && val >= 1 && val <= 20) {
      result.moisture_pct = Number(val.toFixed(1))
    }
  }

  // 6. Peso da embalagem (ex: 15 kg, 10,1 kg, 2.5 kg)
  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|quilos)\b/i)
  if (weightMatch && weightMatch[1]) {
    const val = Number(weightMatch[1].replace(',', '.'))
    if (!isNaN(val) && val >= 0.3 && val <= 30) {
      result.package_weight_kg = Number(val.toFixed(1))
    }
  }

  // 7. Lista de ingredientes (após 'composição básica' ou 'ingredientes')
  const ingMatch = rawText.match(
    /(?:composi[çc][ãa]o\s+b[áa]sica|ingredientes|composi[çc][ãa]o)\s*[:.-]?\s*([^.\n\r]{20,400})/i,
  )
  if (ingMatch && ingMatch[1]) {
    result.ingredients = ingMatch[1].trim()
  }

  return result
}
