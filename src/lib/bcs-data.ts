import type { BcsCategory, FeedingGoal } from '@/types/nutrition'

export interface BcsScoreData {
  score: number // 1 to 9
  category: BcsCategory
  categoryLabel: string
  title: string
  shortSummary: string
  ribs: string
  topView: string
  sideView: string
  bodyFatPctEst: string
  recommendedGoal: FeedingGoal
  multiplierSuggestion: string
  vetNotice?: string
  color: {
    bg: string
    border: string
    text: string
    badgeBg: string
    badgeText: string
  }
}

export const BCS_SCALE: Record<number, BcsScoreData> = {
  1: {
    score: 1,
    category: 'abaixo',
    categoryLabel: 'Abaixo do peso',
    title: 'Muito Magro / Emaciado',
    shortSummary:
      'Costelas, vértebras e ossos pélvicos proeminentes à distância. Sem gordura corporal discernível.',
    ribs: 'Costelas, vértebras lombares e ossos pélvicos extremamente visíveis e salientes, sem qualquer camada de gordura.',
    topView:
      'Cintura excessivamente acentuada tipo ampulheta extrema com afunilamento ósseo severo.',
    sideView:
      'Abdômen curvado para cima de maneira severa (tuck-up abdominal extremo); perda evidente de massa muscular.',
    bodyFatPctEst: '< 5% de gordura',
    recommendedGoal: 'ganhar',
    multiplierSuggestion:
      'Fator 2.0 (superávit calórico controlado) + avaliação veterinária urgente',
    vetNotice:
      'Atenção: Perda severa de massa magra. É imperativo acompanhamento veterinário para descartar patologias.',
    color: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
    },
  },
  2: {
    score: 2,
    category: 'abaixo',
    categoryLabel: 'Abaixo do peso',
    title: 'Magro Severo',
    shortSummary:
      'Costelas facilmente visíveis sem gordura palpável. Ossos pélvicos evidentes e cintura acentuada.',
    ribs: 'Costelas e proeminências ósseas facilmente visíveis e palpáveis sem camada protetora de gordura.',
    topView: 'Cintura bem marcada e estreita, visível claramente mesmo em cães de pelagem média.',
    sideView:
      'Retração abdominal acentuada (tuck-up severo), com perda mínima a moderada de massa muscular.',
    bodyFatPctEst: '5% – 9% de gordura',
    recommendedGoal: 'ganhar',
    multiplierSuggestion: 'Fator 2.0 (ganho de peso gradual com densidade calórica elevada)',
    vetNotice: 'Recomenda-se investigar a causa do déficit de peso antes de superalimentar.',
    color: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
    },
  },
  3: {
    score: 3,
    category: 'abaixo',
    categoryLabel: 'Abaixo do peso',
    title: 'Magro Leve',
    shortSummary:
      'Costelas facilmente palpáveis com cobertura mínima de gordura. Cintura e abdômen bem evidentes.',
    ribs: 'Costelas facilmente palpáveis, podendo ter aspecto visível dependendo da pelagem, com cobertura de gordura muito fina.',
    topView: 'Cintura claramente visível e marcada ao olhar o cão de cima.',
    sideView: 'Abdômen retraído e ascendente bem evidente de perfil.',
    bodyFatPctEst: '10% – 14% de gordura',
    recommendedGoal: 'ganhar',
    multiplierSuggestion: 'Fator 2.0 ou 1.8 (ganho de peso leve até atingir BCS 4–5)',
    color: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
    },
  },
  4: {
    score: 4,
    category: 'ideal',
    categoryLabel: 'Peso Ideal',
    title: 'Ideal Magro (Atlético)',
    shortSummary:
      'Costelas facilmente palpáveis com fina camada de gordura. Cintura evidente vista de cima.',
    ribs: 'Costelas facilmente palpáveis sob leve cobertura de gordura, sem excesso nem saliência excessiva.',
    topView: 'Cintura proporcional e bem definida vista de cima, formato anatômico clássico.',
    sideView: 'Abdômen elegantemente recolhido (tuck-up presente e harmônico).',
    bodyFatPctEst: '15% – 19% de gordura',
    recommendedGoal: 'manter',
    multiplierSuggestion: 'Fator de manutenção normal (1.6 castrado / 1.8 inteiro)',
    color: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
    },
  },
  5: {
    score: 5,
    category: 'ideal',
    categoryLabel: 'Peso Ideal',
    title: 'Ideal Perfeito (Referência WSAVA)',
    shortSummary:
      'Equilíbrio perfeito: costelas palpáveis sem pressão, cintura nítida atrás das costelas e abdômen ascendente.',
    ribs: 'Costelas palpáveis sem pressão excessiva, cobertas por camada fina e saudável de tecido adiposo.',
    topView: 'Cintura evidente e harmoniosa vista de cima, afunilando após o arco das costelas.',
    sideView: 'Abdômen suavemente ascendente (tuck-up abdominal nítido e natural).',
    bodyFatPctEst: '20% – 24% de gordura',
    recommendedGoal: 'manter',
    multiplierSuggestion: 'Fator de manutenção padrão (1.6 castrado / 1.8 inteiro)',
    color: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/25',
      badgeText: 'text-emerald-300',
    },
  },
  6: {
    score: 6,
    category: 'sobrepeso',
    categoryLabel: 'Sobrepeso',
    title: 'Sobrepeso Leve',
    shortSummary:
      'Costelas palpáveis apenas com leve pressão. Cintura discernível mas pouco evidente.',
    ribs: 'Costelas palpáveis sob ligeiro excesso de gordura subcutânea; não são visíveis à vista desarmada.',
    topView: 'Cintura ainda discernível quando vista de cima, porém visivelmente arredondada.',
    sideView: 'Abdômen recolhido mas menos evidente; curva abdominal suave e menos angular.',
    bodyFatPctEst: '25% – 29% de gordura',
    recommendedGoal: 'emagrecer',
    multiplierSuggestion: 'Fator 1.0 (déficit controlado de emagrecimento)',
    color: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/40',
      text: 'text-orange-400',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-300',
    },
  },
  7: {
    score: 7,
    category: 'sobrepeso',
    categoryLabel: 'Sobrepeso',
    title: 'Sobrepeso Moderado',
    shortSummary:
      'Costelas difíceis de apalpar com camada de gordura notável. Cintura quase ausente.',
    ribs: 'Costelas difíceis de palpar devido a uma camada notável e espessa de gordura corporal.',
    topView: 'Cintura quase imperceptível; dorso alargado e reto vista superiormente.',
    sideView: 'Abdômen reto ou discretamente caído, sem o arqueamento característico.',
    bodyFatPctEst: '30% – 34% de gordura',
    recommendedGoal: 'emagrecer',
    multiplierSuggestion: 'Fator 1.0 (déficit controlado para proteção das articulações)',
    vetNotice:
      'Atenção ao risco aumentado de sobrecarga articular, inflamação sistêmica e cardiopatias.',
    color: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/50',
      text: 'text-orange-400',
      badgeBg: 'bg-orange-500/25',
      badgeText: 'text-orange-300',
    },
  },
  8: {
    score: 8,
    category: 'obesidade',
    categoryLabel: 'Obesidade',
    title: 'Obeso',
    shortSummary:
      'Costelas não palpáveis sem pressão intensa. Depósitos pesados de gordura na coluna e cauda.',
    ribs: 'Costelas não palpáveis sob pressão normal, cobertas por densa camada adiposa.',
    topView:
      'Ausência total de cintura vista de cima; dorso marcadamente alargado com convexidade lateral.',
    sideView:
      'Abdômen visivelmente pendente ou arredondado (sem qualquer tuck-up). Depósitos na base da cauda.',
    bodyFatPctEst: '35% – 39% de gordura',
    recommendedGoal: 'emagrecer',
    multiplierSuggestion:
      'Fator 1.0 (plano de emagrecimento agressivo com ração de suporte metabólico)',
    vetNotice:
      'Consulta veterinária indispensável: risco grave de diabetes, pancreatite e artrose.',
    color: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/50',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-500/25',
      badgeText: 'text-rose-300',
    },
  },
  9: {
    score: 9,
    category: 'obesidade',
    categoryLabel: 'Obesidade',
    title: 'Obesidade Severa / Mórbida',
    shortSummary:
      'Depósitos maciços de gordura no tórax, coluna e pescoço. Distensão abdominal acentuada.',
    ribs: 'Costelas absolutamente impalpáveis mesmo com forte pressão manual; espessa manta de gordura.',
    topView:
      'Costas amplamente dilatadas; linha dorsal reta ou convexa, formato cilíndrico/ovalado.',
    sideView:
      'Abdômen pronunciado e pendente em direção ao chão; dobras adiposas evidentes no pescoço e membros.',
    bodyFatPctEst: '≥ 40% de gordura',
    recommendedGoal: 'emagrecer',
    multiplierSuggestion:
      'Fator 1.0 com ração terapêutica (ex: Obesity/Satiety) e plano veterinário clínico',
    vetNotice:
      'Urgente: risco iminente de colapso respiratório, intolerância a exercícios e sobrecarga cardíaca.',
    color: {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/60',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-500/30',
      badgeText: 'text-rose-200',
    },
  },
}

export function getBcsCategory(score: number): BcsCategory {
  if (score <= 3) return 'abaixo'
  if (score <= 5) return 'ideal'
  if (score <= 7) return 'sobrepeso'
  return 'obesidade'
}
