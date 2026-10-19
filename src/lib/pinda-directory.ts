import type { ProfessionalCategory } from '@/types/community'

export type DirectoryEntry = { name: string; address: string; city: string; category: ProfessionalCategory; source: string; description?: string }
const VET = 'https://www.tutorcanino.com.br/veterinarios/sp/pindamonhangaba'
const SHOP = 'https://www.tutorcanino.com.br/petshops/sp/pindamonhangaba'
const GROOM = 'https://www.tutorcanino.com.br/banho-tosa/sp/pindamonhangaba'

// Amostra identificada em diretórios públicos em 29/09/2026. Não representa registro no CRMV-SP,
// licença municipal, disponibilidade, credenciamento ou uma lista exaustiva de empresas da cidade.
export const PINDA_DIRECTORY: DirectoryEntry[] = ([
  { name: 'Clínica Veterinária e Reabilitação Animal Arca de Noé', address: 'Rua Soldado Constitucionalista, 45 · Jardim Santa Luzia', category: 'veterinario', source: VET },
  { name: 'BEM VET veterinária', address: 'Rua Capitão Vitório Basso, 582 · Parque São Benedito', category: 'veterinario', source: VET },
  { name: 'Carol Bargis Veterinária Domiciliar e Pet Shop', address: 'Rua Coronel Francisco Bicudo de Mello · Centro', category: 'veterinario', source: VET },
  { name: 'Home Pet atendimento veterinário', address: 'Rua Sete de Setembro, 190 · Parque São Benedito', category: 'veterinario', source: VET },
  { name: 'Planeta Animal Pinda Clínica Veterinária e Pet Shop', address: 'Avenida Albuquerque Lins, 509 · São Benedito', category: 'veterinario', source: VET },
  { name: 'Pinda Vet Clínica Veterinária', address: 'Rua Santos Dumont, 190 · Jardim Rosely', category: 'veterinario', source: VET },
  { name: 'Clínica Veterinária Sassaki', address: 'Avenida Fortunato Moreira, 348 · Centro', category: 'veterinario', source: VET },
  { name: 'Clínica Veterinária Amo Vida Animal', address: 'Rua Pinheiro da Silva, 245 · Jardim Boa Vista', category: 'veterinario', source: VET },
  { name: 'Dal Piero Veterinária', address: 'Rua Professor José Silva, 142 · Alto do Cardoso', category: 'veterinario', source: VET },
  { name: 'Clínica Veterinária Center Vet', address: 'Rua Doutor Laerte Machado Guimarães, 77 · Vila Bourghese', category: 'veterinario', source: VET },
  { name: 'Nutripet Pinda Rações e acessórios', address: 'Rua São João Bôsco, 422 · Tabaú', category: 'petshop', source: SHOP },
  { name: 'BB’s Pet', address: 'Rua Doutor Monteiro César, 50 · Centro', category: 'petshop', source: SHOP },
  { name: 'Mania Pet Pinda', address: 'Rua Samanta Smith, 255 · Cidade Jardim', category: 'petshop', source: SHOP },
  { name: 'PET SPA by Georgia Serodio', address: 'Avenida Doutor Francisco Lessa Júnior, 1550 · Chácara da Galega', category: 'petshop', source: SHOP },
  { name: 'Pinda pet', address: 'Avenida Doutor Francisco Lessa Júnior, 990 · Chácara da Galega', category: 'petshop', source: SHOP },
  { name: 'Pet Show', address: 'Rua Alceu Carvalho de Faria · Residencial Primavera', category: 'petshop', source: SHOP },
  { name: 'AGROPET - PINDA', address: 'Rodovia Vereador Abel Fabrício Dias, 808 · Vila São Benedito', category: 'petshop', source: SHOP },
  { name: 'Casa de Ração Amigo Pet', address: 'Avenida Fortunato Moreira, 267 · Centro', category: 'casa_racao', source: SHOP },
  { name: 'Casa de Ração da Rose', address: 'Avenida Lírios, 412 · Residencial Vale das Acácias', category: 'casa_racao', source: SHOP },
  { name: 'Bruna Jaguaribe Sassaki', address: 'Avenida Fortunato Moreira, 348 · Tabaú', category: 'banho_tosa', source: GROOM },
  { name: 'C. R. Ramos Pet Shop', address: 'Rua Doutor José Roberto Ferreira de Carvalho, 180 · Galega', category: 'banho_tosa', source: GROOM },
  { name: 'MGF Embelezamento, Estética e Cuidado Animal', address: 'Avenida Nossa Senhora do Perpétuo Socorro, 2018 · Socorro', category: 'banho_tosa', source: GROOM },
  { name: 'Patas e Bolhas', address: 'Avenida Fortunato Moreira, 317 · Tabaú', category: 'banho_tosa', source: GROOM },
  { name: 'Petspa By Georgia', address: 'Rua Alcides Ramos Nogueira, 583 · Socorro', category: 'banho_tosa', source: GROOM },
  { name: 'Tia Talita Banho e Tosa', address: 'Rua Otaviano Damasceno, 74 · Bela Vista', category: 'banho_tosa', source: GROOM },
] as Omit<DirectoryEntry, 'city'>[]).map(entry => ({ ...entry, city: 'Pindamonhangaba' }))

// Entradas públicas adicionais da região, consultadas em 29/09/2026. A presença no guia
// não significa perfil criado pelo estabelecimento, parceria, licença ou disponibilidade atual.
export const VALE_DIRECTORY: DirectoryEntry[] = [
  { name: 'Canil Akatsukioka', address: 'Pindamonhangaba · endereço sob consulta', city: 'Pindamonhangaba', category: 'canicultor', description: 'Criação de Shiba Inu', source: 'https://www.shibainubr.com.br/quemsomos' },
  { name: 'Dogpinda · Canil Emboava W.D.', address: 'Rua João Batista Ribeiro Correard, 65 · Mombaça', city: 'Pindamonhangaba', category: 'canicultor', description: 'Criação de Pastor Alemão; atendimento com hora marcada', source: 'https://dogpinda.com/' },
  { name: 'Gibi Dog', address: 'Atendimento em Taubaté · endereço sob consulta', city: 'Taubaté', category: 'adestrador', description: 'Adestramento e consultoria comportamental', source: 'https://www.gibidog.com.br/' },
  { name: 'Paulo Bernardo Adestrador', address: 'Atendimento em São José dos Campos e região', city: 'São José dos Campos', category: 'adestrador', description: 'Adestramento e orientação comportamental', source: 'https://www.paulobernardoadestrador.com.br/' },
  { name: 'Dogpinda · Adestramento', address: 'Rua João Batista Ribeiro Correard, 65 · Mombaça', city: 'Pindamonhangaba', category: 'adestrador', description: 'Treinamento canino', source: 'https://dogpinda.com/adestramento/' },
  { name: 'Handler Edílson Cordeiro', address: 'Av. Heitor Villa Lobos, 1300', city: 'São José dos Campos', category: 'handler', description: 'Listagem de terceiro; atividade e contato precisam de confirmação', source: 'https://www.guiasjc.com.br/95' },
  { name: 'Dogpinda · Passeios', address: 'Rua João Batista Ribeiro Correard, 65 · Mombaça', city: 'Pindamonhangaba', category: 'dogwalker', description: 'Passeios para cães', source: 'https://dogpinda.com/passeios/' },
  { name: 'Gibi Dog · Dog Walker', address: 'Atendimento em Taubaté · endereço sob consulta', city: 'Taubaté', category: 'dogwalker', description: 'Passeador de cães', source: 'https://www.gibidog.com.br/' },
  { name: 'Dog Charme · Dog Walker', address: 'Rua Major Vaz, 230 · Vila Adyana', city: 'São José dos Campos', category: 'dogwalker', description: 'Passeios, pet sitter e táxi dog anunciados pelo estabelecimento', source: 'https://dogcharmesjc.wordpress.com/' },
  { name: 'Sociedade Valeparaibana de Cães Pastores Alemães', address: 'Rua Santarém, 724 · Parque Industrial', city: 'São José dos Campos', category: 'cinofilo', description: 'Entidade cinófila; orientação e atividades para associados', source: 'https://svcpa0.wixsite.com/svcpasjc/nosso-trabalho' },
  { name: 'Adorodog · Creche e Hotel', address: 'Av. Dr. João Baptista Soares de Queiroz Júnior, 1740 · Jardim das Indústrias', city: 'São José dos Campos', category: 'creche', description: 'Creche e hospedagem canina', source: 'https://adorodog.com.br/' },
  { name: 'CLUBDOG', address: 'São José dos Campos · endereço no site', city: 'São José dos Campos', category: 'creche', description: 'Creche e hotel para cães', source: 'https://clubdog.com.br/' },
  { name: 'Jac Pet Hotel', address: 'Rua Dr. Álvaro Augusto de Almeida, 131 · Vila Industrial', city: 'São José dos Campos', category: 'creche', description: 'Hospedagem para cães e gatos', source: 'https://www.jacpethotel.com.br/' },
  { name: 'Dogpinda · Hospedagem', address: 'Rua João Batista Ribeiro Correard, 65 · Mombaça', city: 'Pindamonhangaba', category: 'creche', description: 'Hotel para cães; atendimento com hora marcada', source: 'https://dogpinda.com/hospedagem/' },
  { name: 'Dog Charme Pet Shop', address: 'Rua Major Vaz, 230 · Vila Adyana', city: 'São José dos Campos', category: 'petshop', description: 'Loja e acessórios para pets', source: 'https://dogcharmesjc.wordpress.com/' },
  { name: 'Dog Charme · Banho e Tosa', address: 'Rua Major Vaz, 230 · Vila Adyana', city: 'São José dos Campos', category: 'banho_tosa', description: 'Estética animal', source: 'https://dogcharmesjc.wordpress.com/' },
]

export const REGIONAL_DIRECTORY = [...PINDA_DIRECTORY, ...VALE_DIRECTORY]

export const PINDA_DIRECTORY_LINKS = [
  { label: 'Veterinários e clínicas · 54 listados', url: VET },
  { label: 'Pet shops · 59 listados', url: SHOP },
  { label: 'Banho e tosa · 6 listados', url: GROOM },
]
