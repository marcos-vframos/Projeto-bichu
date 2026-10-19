// Individual PNG assets with real alpha; existing selection IDs are preserved.
export interface LogoItem {id:string;label:string;col:number;row:number;description?:string}
export const LOGO_STORAGE_KEY='bichu_selected_header_logo'
export const DEFAULT_LOGO_ID='paw-tear'
export const AVAILABLE_LOGOS:LogoItem[]=[
  {
    "id": "paw-tear",
    "label": "Pata Selvagem",
    "col": 0,
    "row": 0
  },
  {
    "id": "snout-close",
    "label": "Focinho Fiel",
    "col": 0,
    "row": 0
  },
  {
    "id": "puppy-eyes",
    "label": "Filhote Dourado",
    "col": 0,
    "row": 0
  },
  {
    "id": "feline-gaze",
    "label": "Olhar Felino",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-window",
    "label": "Gato na Janela",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-hand",
    "label": "Pacto de Amizade",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-cat-gold",
    "label": "Duo Dourado",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-profile",
    "label": "Perfil Canino",
    "col": 0,
    "row": 0
  },
  {
    "id": "sunset-dog",
    "label": "Pôr do Sol",
    "col": 0,
    "row": 0
  },
  {
    "id": "heart-duo",
    "label": "Coração Pet",
    "col": 0,
    "row": 0
  },
  {
    "id": "golden-paw",
    "label": "Pata Dourada",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-circle",
    "label": "Felino Real",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-sunglasses",
    "label": "Cão Estiloso",
    "col": 0,
    "row": 0
  },
  {
    "id": "neon-cat",
    "label": "Gato Neon",
    "col": 0,
    "row": 0
  },
  {
    "id": "shield-hound",
    "label": "Escudo Protetor",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-crown",
    "label": "Gato Imperial",
    "col": 0,
    "row": 0
  },
  {
    "id": "infinity-duo",
    "label": "Amor Infinito",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-nature",
    "label": "Pata Natureza",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-aurora",
    "label": "Pata Aurora",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-ocean",
    "label": "Pata Oceano",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-moon",
    "label": "Pata Lunar",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-garden",
    "label": "Pata Jardim",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-sunset",
    "label": "Pata do Sol",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-mountain",
    "label": "Cão da Montanha",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-mountain",
    "label": "Gato da Montanha",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-loyal",
    "label": "Companheiro Fiel",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-majestic",
    "label": "Felino Sereno",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-shepherd",
    "label": "Guardião",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-black",
    "label": "Pantera de Casa",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-husky",
    "label": "Olhar do Norte",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-sphynx",
    "label": "Elegância Sphynx",
    "col": 0,
    "row": 0
  },
  {
    "id": "dog-dachshund",
    "label": "Pequeno Companheiro",
    "col": 0,
    "row": 0
  },
  {
    "id": "cat-orange",
    "label": "Gato Solar",
    "col": 0,
    "row": 0
  },
  {
    "id": "duo-infinity",
    "label": "Laço Eterno",
    "col": 0,
    "row": 0
  },
  {
    "id": "duo-heart",
    "label": "Coração Companheiro",
    "col": 0,
    "row": 0
  },
  {
    "id": "duo-leaves",
    "label": "Amigos do Jardim",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-crystal",
    "label": "Pata Cristal",
    "col": 0,
    "row": 0
  },
  {
    "id": "paw-celestial",
    "label": "Pata Estelar",
    "col": 0,
    "row": 0
  }
]
const assets=import.meta.glob('/src/assets/icons/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>
export function getCroppedLogoImage(id:string):string|null{return assets['/src/assets/icons/'+id+'.png']||null}
export function subscribeLogoCrops(_callback:()=>void):()=>void{return ()=>{}}
export function initLogoCrops():void{}
