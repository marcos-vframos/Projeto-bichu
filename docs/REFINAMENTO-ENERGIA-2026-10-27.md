# Refinamento: energia do alimento e porções

A calculadora preserva a energia positiva informada, inclusive abaixo de 1.000 kcal/kg. Energia fornecida como zero, negativa ou não finita sinaliza inválida, sem inventar uma substituição. As telas de peso e plano alimentar mostram o erro e bloqueiam o salvamento nesse estado.

O padrão estimativo de 3.500 kcal/kg continua somente quando a função não recebe o parâmetro. A interface informa kcal/kg e orienta a conversão de kcal/100 g. Não foi incluído um seletor de unidades nesta etapa.

Testes verificam a fórmula abaixo, no limite e acima de 1.000; entradas inválidas; e o padrão somente quando a energia não foi fornecida. Não mudam os fatores de necessidade energética nem equivalem à validação clínica de uma dieta.

Nenhum plano existente é regravado ou recalculado automaticamente no banco. A revisão dos planos antigos potencialmente afetados precisa ser apresentada ao proprietário antes de qualquer alteração em lote.
