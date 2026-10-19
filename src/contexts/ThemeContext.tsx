import { preferenceStorage } from '@/lib/preferences'
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'

export type ThemeCategory = 'Soft' | 'Clean' | 'Workspace Industry' | 'Day-on-Day'

export interface ThemeTokens {
  id: string
  name: string
  category: ThemeCategory
  isDark: boolean
  // HSL string without hsl(...) wrapper, e.g. "222.2 47% 7%"
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  border: string
  input: string
  ring: string
  radius: string // e.g. "0.75rem", "0.25rem", "1.75rem"

  // Tipografia Google Fonts dinâmica & Formas
  fontSans: string
  fontDisplay: string
  headingFontWeight?: string // '300' | '600' | '800' | '900'
  headingLetterSpacing?: string // '-0.03em' | '0.08em'
  headingTransform?: 'none' | 'uppercase' | 'capitalize'
  cardShadow?: string // 'none' | '4px 4px 0px #000' | '0 10px 30px rgba(...)' | etc
  cardBorderWidth?: string // '1px' | '2px' | '3px'
  buttonTransform?: 'none' | 'uppercase' | 'lowercase'
  buttonWeight?: string // '600' | '800' | '900'
  buttonShadow?: string
  buttonLetterSpacing?: string
}

export const THEME_DEFINITIONS: Record<string, ThemeTokens> = {
  // ==========================================
  // GRUPO 1: 5 MODELOS "Soft"
  // ==========================================

  // 23. Soft: Verde Musgo
  'soft-verde-musgo': {
    id: 'soft-verde-musgo',
    name: 'Soft Verde Musgo',
    category: 'Soft',
    isDark: false,
    background: '94 28% 96%', // #F3F6F1
    foreground: '100 35% 15%', // #213019
    card: '94 25% 99%', // #FCFDFB
    cardForeground: '100 35% 15%',
    popover: '94 25% 99%',
    popoverForeground: '100 35% 15%',
    primary: '100 38% 34%', // #43642B verde musgo acolhedor
    primaryForeground: '0 0% 100%',
    secondary: '96 24% 88%', // #DEE6D9
    secondaryForeground: '100 35% 18%',
    muted: '96 22% 91%',
    mutedForeground: '100 15% 45%',
    accent: '100 38% 34%',
    accentForeground: '0 0% 100%',
    border: '96 20% 84%',
    input: '96 20% 84%',
    ring: '100 38% 34%',
    radius: '1.5rem',
    fontSans: "'Lora', serif, system-ui",
    fontDisplay: "'Lora', serif, system-ui",
    headingFontWeight: '600',
    headingLetterSpacing: '-0.015em',
    cardShadow: '0 8px 24px -4px rgba(67, 100, 43, 0.08), 0 2px 6px rgba(0,0,0,0.02)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '600',
  },

  // 24. Soft: Azul Royal
  'soft-azul-royal': {
    id: 'soft-azul-royal',
    name: 'Soft Azul Royal',
    category: 'Soft',
    isDark: false,
    background: '220 40% 97%', // #F3F6FC
    foreground: '224 45% 16%', // #16203B
    card: '0 0% 100%',
    cardForeground: '224 45% 16%',
    popover: '0 0% 100%',
    popoverForeground: '224 45% 16%',
    primary: '225 80% 50%', // #1E50E6 azul royal aveludado
    primaryForeground: '0 0% 100%',
    secondary: '222 35% 92%',
    secondaryForeground: '224 45% 16%',
    muted: '220 30% 93%',
    mutedForeground: '224 18% 50%',
    accent: '225 80% 50%',
    accentForeground: '0 0% 100%',
    border: '222 30% 88%',
    input: '222 30% 88%',
    ring: '225 80% 50%',
    radius: '1.375rem',
    fontSans: "'Outfit', system-ui, sans-serif",
    fontDisplay: "'Outfit', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.02em',
    cardShadow: '0 10px 25px -5px rgba(30, 80, 230, 0.09)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
    buttonShadow: '0 4px 14px rgba(30, 80, 230, 0.25)',
  },

  // 25. Soft: Vinho Bordo Bem Escuro
  'soft-vinho-bordo': {
    id: 'soft-vinho-bordo',
    name: 'Soft Vinho Bordô Bem Escuro',
    category: 'Soft',
    isDark: true,
    background: '348 45% 8%', // #1D070C vinho bordo ultra escuro
    foreground: '350 25% 95%', // #FAF0F2
    card: '348 38% 13%', // #2E0E15
    cardForeground: '350 25% 95%',
    popover: '348 38% 13%',
    popoverForeground: '350 25% 95%',
    primary: '348 65% 52%', // #CE2D53 bordô aveludado vivo
    primaryForeground: '0 0% 100%',
    secondary: '348 30% 20%',
    secondaryForeground: '350 25% 95%',
    muted: '348 30% 18%',
    mutedForeground: '350 15% 68%',
    accent: '348 65% 52%',
    accentForeground: '0 0% 100%',
    border: '348 30% 24%',
    input: '348 30% 24%',
    ring: '348 65% 52%',
    radius: '1.375rem',
    fontSans: "'Lora', serif, system-ui",
    fontDisplay: "'Playfair Display', serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.015em',
    cardShadow: '0 8px 30px rgba(0, 0, 0, 0.55)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
    buttonShadow: '0 4px 18px rgba(206, 45, 83, 0.35)',
  },

  // 26. Soft: Preto / Preta
  'soft-preto': {
    id: 'soft-preto',
    name: 'Soft Preto',
    category: 'Soft',
    isDark: true,
    background: '0 0% 7%', // #121212 preto aveludado não estourado
    foreground: '0 0% 95%',
    card: '0 0% 12%', // #1F1F1F
    cardForeground: '0 0% 95%',
    popover: '0 0% 12%',
    popoverForeground: '0 0% 95%',
    primary: '0 0% 95%', // pure soft white accent
    primaryForeground: '0 0% 8%',
    secondary: '0 0% 18%',
    secondaryForeground: '0 0% 95%',
    muted: '0 0% 16%',
    mutedForeground: '0 0% 65%',
    accent: '0 0% 95%',
    accentForeground: '0 0% 8%',
    border: '0 0% 22%',
    input: '0 0% 22%',
    ring: '0 0% 80%',
    radius: '1.25rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.025em',
    cardShadow: '0 8px 26px rgba(0, 0, 0, 0.6)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 27. Soft: Mostarda com Preto
  'soft-mostarda-preto': {
    id: 'soft-mostarda-preto',
    name: 'Soft Mostarda com Preto',
    category: 'Soft',
    isDark: true,
    background: '45 15% 7%', // #151410
    foreground: '45 30% 94%',
    card: '45 18% 12%', // #24221A
    cardForeground: '45 30% 94%',
    popover: '45 18% 12%',
    popoverForeground: '45 30% 94%',
    primary: '43 90% 48%', // #E89E0C mostarda quente aconchegante
    primaryForeground: '45 30% 8%',
    secondary: '45 15% 20%',
    secondaryForeground: '45 30% 94%',
    muted: '45 15% 18%',
    mutedForeground: '45 20% 65%',
    accent: '43 90% 48%',
    accentForeground: '45 30% 8%',
    border: '45 20% 24%',
    input: '45 20% 24%',
    ring: '43 90% 48%',
    radius: '1.25rem',
    fontSans: "'DM Sans', system-ui, sans-serif",
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.02em',
    cardShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'none',
    buttonWeight: '800',
    buttonShadow: '0 4px 16px rgba(232, 158, 12, 0.3)',
  },

  // ==========================================
  // GRUPO 2: 5 MODELOS "Clean" (SOLICITADOS PELO USUÁRIO)
  // ==========================================

  // 28. Clean: Verde Aqua
  'clean-verde-aqua': {
    id: 'clean-verde-aqua',
    name: 'Clean Verde Aqua',
    category: 'Clean',
    isDark: false,
    background: '172 45% 97%', // #F0FAF8
    foreground: '180 40% 12%',
    card: '0 0% 100%',
    cardForeground: '180 40% 12%',
    popover: '0 0% 100%',
    popoverForeground: '180 40% 12%',
    primary: '172 75% 36%', // #17A189 aqua fresco nítido
    primaryForeground: '0 0% 100%',
    secondary: '172 35% 92%',
    secondaryForeground: '180 40% 12%',
    muted: '172 25% 93%',
    mutedForeground: '180 15% 48%',
    accent: '172 75% 36%',
    accentForeground: '0 0% 100%',
    border: '172 30% 88%',
    input: '172 30% 88%',
    ring: '172 75% 36%',
    radius: '0.875rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.025em',
    cardShadow: '0 2px 8px rgba(23, 161, 137, 0.06)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 29. Clean: Marine
  'clean-marine': {
    id: 'clean-marine',
    name: 'Clean Marine',
    category: 'Clean',
    isDark: false,
    background: '202 45% 97%', // #F0F7FA
    foreground: '208 50% 14%',
    card: '0 0% 100%',
    cardForeground: '208 50% 14%',
    popover: '0 0% 100%',
    popoverForeground: '208 50% 14%',
    primary: '201 85% 38%', // #0F7CB4 azul marine cristalino
    primaryForeground: '0 0% 100%',
    secondary: '202 35% 92%',
    secondaryForeground: '208 50% 14%',
    muted: '202 25% 93%',
    mutedForeground: '208 18% 48%',
    accent: '201 85% 38%',
    accentForeground: '0 0% 100%',
    border: '202 30% 87%',
    input: '202 30% 87%',
    ring: '201 85% 38%',
    radius: '0.875rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.025em',
    cardShadow: '0 2px 8px rgba(15, 124, 180, 0.06)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 30. Clean: Salmão
  'clean-salmao': {
    id: 'clean-salmao',
    name: 'Clean Salmão',
    category: 'Clean',
    isDark: false,
    background: '14 60% 98%', // #FDF6F4
    foreground: '16 35% 15%',
    card: '0 0% 100%',
    cardForeground: '16 35% 15%',
    popover: '0 0% 100%',
    popoverForeground: '16 35% 15%',
    primary: '14 85% 60%', // #F26F4A salmão refinado
    primaryForeground: '0 0% 100%',
    secondary: '14 40% 93%',
    secondaryForeground: '16 35% 15%',
    muted: '14 30% 94%',
    mutedForeground: '16 15% 48%',
    accent: '14 85% 60%',
    accentForeground: '0 0% 100%',
    border: '14 35% 89%',
    input: '14 35% 89%',
    ring: '14 85% 60%',
    radius: '1rem',
    fontSans: "'DM Sans', system-ui, sans-serif",
    fontDisplay: "'Outfit', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.02em',
    cardShadow: '0 4px 14px rgba(242, 111, 74, 0.08)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 31. Clean: Azul Baby
  'clean-azul-baby': {
    id: 'clean-azul-baby',
    name: 'Clean Azul Baby',
    category: 'Clean',
    isDark: false,
    background: '208 65% 98%', // #F3F8FC
    foreground: '215 35% 18%',
    card: '0 0% 100%',
    cardForeground: '215 35% 18%',
    popover: '0 0% 100%',
    popoverForeground: '215 35% 18%',
    primary: '206 85% 55%', // #45A7F2 azul celeste baby sereno
    primaryForeground: '0 0% 100%',
    secondary: '208 45% 93%',
    secondaryForeground: '215 35% 18%',
    muted: '208 35% 94%',
    mutedForeground: '215 15% 50%',
    accent: '206 85% 55%',
    accentForeground: '0 0% 100%',
    border: '208 40% 89%',
    input: '208 40% 89%',
    ring: '206 85% 55%',
    radius: '1.125rem',
    fontSans: "'Fredoka', cursive, system-ui, sans-serif",
    fontDisplay: "'Fredoka', cursive, system-ui, sans-serif",
    headingFontWeight: '600',
    headingLetterSpacing: '0.01em',
    cardShadow: '0 3px 12px rgba(69, 167, 242, 0.08)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 32. Clean: Marrom com Prata
  'clean-marrom-prata': {
    id: 'clean-marrom-prata',
    name: 'Clean Marrom com Prata',
    category: 'Clean',
    isDark: false,
    background: '30 20% 97%', // #F8F6F4
    foreground: '25 30% 16%', // #35261C marrom nobre
    card: '0 0% 100%',
    cardForeground: '25 30% 16%',
    popover: '0 0% 100%',
    popoverForeground: '25 30% 16%',
    primary: '25 45% 32%', // #754425 marrom café profundo
    primaryForeground: '0 0% 100%',
    secondary: '210 15% 91%', // prata acetinada
    secondaryForeground: '25 30% 16%',
    muted: '210 15% 93%',
    mutedForeground: '25 10% 48%',
    accent: '210 20% 80%', // destaque prata metálica
    accentForeground: '25 30% 16%',
    border: '210 15% 85%', // bordas tom prata
    input: '210 15% 85%',
    ring: '25 45% 32%',
    radius: '0.75rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '-0.025em',
    cardShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // ==========================================
  // GRUPO 3: 5 MODELOS "Workspace Industry" (SOLICITADOS PELO USUÁRIO)
  // ==========================================

  // 33. Workspace Industry: Marrom com Mostarda
  'industry-marrom-mostarda': {
    id: 'industry-marrom-mostarda',
    name: 'Workspace Marrom com Mostarda',
    category: 'Workspace Industry',
    isDark: true,
    background: '28 35% 10%', // #22160E marrom industrial pesado
    foreground: '38 40% 94%',
    card: '28 30% 15%', // #322217
    cardForeground: '38 40% 94%',
    popover: '28 30% 15%',
    popoverForeground: '38 40% 94%',
    primary: '43 95% 48%', // #F3A404 mostarda vigorosa
    primaryForeground: '28 40% 8%',
    secondary: '28 25% 22%',
    secondaryForeground: '38 40% 94%',
    muted: '28 25% 18%',
    mutedForeground: '38 20% 65%',
    accent: '43 95% 48%',
    accentForeground: '28 40% 8%',
    border: '43 60% 30%',
    input: '43 60% 30%',
    ring: '43 95% 48%',
    radius: '0.5rem',
    fontSans: "'Space Grotesk', system-ui, sans-serif",
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    headingFontWeight: '900',
    headingLetterSpacing: '-0.02em',
    headingTransform: 'uppercase',
    cardShadow: '3px 3px 0px rgba(243, 164, 4, 0.25)',
    cardBorderWidth: '2px',
    buttonTransform: 'uppercase',
    buttonWeight: '900',
    buttonLetterSpacing: '0.04em',
    buttonShadow: '2px 2px 0px #000',
  },

  // 34. Workspace Industry: Vermelho com Prata
  'industry-vermelho-prata': {
    id: 'industry-vermelho-prata',
    name: 'Workspace Vermelho com Prata',
    category: 'Workspace Industry',
    isDark: true,
    background: '0 10% 9%', // #181515
    foreground: '210 20% 96%',
    card: '0 12% 14%', // #272121
    cardForeground: '210 20% 96%',
    popover: '0 12% 14%',
    popoverForeground: '210 20% 96%',
    primary: '0 85% 55%', // #F32727 vermelho industrial maquinário
    primaryForeground: '0 0% 100%',
    secondary: '215 15% 25%',
    secondaryForeground: '210 20% 96%',
    muted: '215 12% 20%',
    mutedForeground: '215 15% 68%',
    accent: '215 25% 75%', // Prata metálica destacada
    accentForeground: '0 10% 9%',
    border: '215 18% 35%', // borda prateada industrial
    input: '215 18% 35%',
    ring: '0 85% 55%',
    radius: '0.375rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Chakra Petch', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '0.02em',
    headingTransform: 'uppercase',
    cardShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'uppercase',
    buttonWeight: '800',
    buttonShadow: '0 0 12px rgba(243, 39, 39, 0.35)',
  },

  // 35. Workspace Industry: Ciano com Azul Marinho nos Detalhes
  'industry-ciano-marinho': {
    id: 'industry-ciano-marinho',
    name: 'Workspace Ciano com Azul Marinho',
    category: 'Workspace Industry',
    isDark: true,
    background: '222 55% 7%', // #080E1B marinho profundo
    foreground: '210 40% 98%',
    card: '222 45% 12%', // #111A2E
    cardForeground: '210 40% 98%',
    popover: '222 45% 12%',
    popoverForeground: '210 40% 98%',
    primary: '188 95% 48%', // #07CAED ciano técnico
    primaryForeground: '222 55% 7%',
    secondary: '225 45% 20%', // detalhes azul marinho
    secondaryForeground: '210 40% 98%',
    muted: '222 35% 16%',
    mutedForeground: '188 40% 68%',
    accent: '225 70% 45%', // marinho elétrico
    accentForeground: '0 0% 100%',
    border: '188 80% 30% / 0.5',
    input: '188 80% 30% / 0.5',
    ring: '188 95% 48%',
    radius: '0.5rem',
    fontSans: "'JetBrains Mono', monospace",
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '-0.02em',
    cardShadow: '0 4px 18px rgba(7, 202, 237, 0.12)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'uppercase',
    buttonWeight: '800',
    buttonShadow: '0 0 12px rgba(7, 202, 237, 0.35)',
  },

  // 36. Workspace Industry: Reciclado com Azul Royal
  'industry-reciclado-royal': {
    id: 'industry-reciclado-royal',
    name: 'Workspace Reciclado com Azul Royal',
    category: 'Workspace Industry',
    isDark: false,
    background: '38 28% 90%', // #EBE4D8 tom papel kraft reciclado autêntico
    foreground: '225 50% 15%', // azul marinho escuro
    card: '38 32% 94%', // #F3EFE7
    cardForeground: '225 50% 15%',
    popover: '38 32% 94%',
    popoverForeground: '225 50% 15%',
    primary: '225 85% 48%', // #124DE3 azul royal vivo sobre o kraft
    primaryForeground: '0 0% 100%',
    secondary: '38 20% 82%',
    secondaryForeground: '225 50% 15%',
    muted: '38 20% 84%',
    mutedForeground: '38 15% 42%',
    accent: '225 85% 48%',
    accentForeground: '0 0% 100%',
    border: '38 22% 76%',
    input: '38 22% 76%',
    ring: '225 85% 48%',
    radius: '0.5rem',
    fontSans: "'Space Grotesk', system-ui, sans-serif",
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '-0.025em',
    cardShadow: '2px 2px 0px rgba(18, 77, 227, 0.2)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'uppercase',
    buttonWeight: '800',
    buttonShadow: '2px 2px 0px #124DE3',
  },

  // 37. Workspace Industry: Aço & Grafite
  'industry-aco-grafite': {
    id: 'industry-aco-grafite',
    name: 'Workspace Aço & Grafite',
    category: 'Workspace Industry',
    isDark: true,
    background: '215 20% 11%', // #161B22
    foreground: '210 20% 95%',
    card: '215 20% 16%', // #212833
    cardForeground: '210 20% 95%',
    popover: '215 20% 16%',
    popoverForeground: '210 20% 95%',
    primary: '215 20% 85%', // #D5DAE1 placa de aço escovado
    primaryForeground: '215 25% 10%',
    secondary: '215 15% 24%',
    secondaryForeground: '210 20% 95%',
    muted: '215 15% 22%',
    mutedForeground: '215 12% 65%',
    accent: '215 20% 85%',
    accentForeground: '215 25% 10%',
    border: '215 18% 30%',
    input: '215 18% 30%',
    ring: '215 20% 85%',
    radius: '0.375rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Chakra Petch', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '0.01em',
    headingTransform: 'uppercase',
    cardShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'uppercase',
    buttonWeight: '800',
  },

  // ==========================================
  // GRUPO 4: 5 MODELOS "Day-on-Day" (SOLICITADOS PELO USUÁRIO)
  // ==========================================

  // 38. Day-on-Day: Azul Royal com Reciclado
  'day-azul-royal-reciclado': {
    id: 'day-azul-royal-reciclado',
    name: 'Day-on-Day Azul Royal com Reciclado',
    category: 'Day-on-Day',
    isDark: false,
    background: '38 25% 92%', // Kraft reciclado natural
    foreground: '225 55% 15%', // Azul royal escuro
    card: '38 30% 96%',
    cardForeground: '225 55% 15%',
    popover: '38 30% 96%',
    popoverForeground: '225 55% 15%',
    primary: '225 85% 48%', // #124DE3 Azul Royal
    primaryForeground: '0 0% 100%',
    secondary: '38 20% 84%',
    secondaryForeground: '225 55% 15%',
    muted: '38 20% 86%',
    mutedForeground: '38 15% 45%',
    accent: '225 85% 48%',
    accentForeground: '0 0% 100%',
    border: '38 22% 78%',
    input: '38 22% 78%',
    ring: '225 85% 48%',
    radius: '1rem',
    fontSans: "'DM Sans', system-ui, sans-serif",
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.02em',
    cardShadow: '0 2px 10px rgba(18, 77, 227, 0.08)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 39. Day-on-Day: Azul Escuro com Reciclado
  'day-azul-escuro-reciclado': {
    id: 'day-azul-escuro-reciclado',
    name: 'Day-on-Day Azul Escuro com Reciclado',
    category: 'Day-on-Day',
    isDark: false,
    background: '38 25% 91%', // Papel reciclado
    foreground: '222 60% 12%', // Azul marinho quase negro
    card: '38 28% 95%',
    cardForeground: '222 60% 12%',
    popover: '38 28% 95%',
    popoverForeground: '222 60% 12%',
    primary: '222 65% 28%', // #193875 Azul Escuro encorpado
    primaryForeground: '0 0% 100%',
    secondary: '38 20% 83%',
    secondaryForeground: '222 60% 12%',
    muted: '38 20% 85%',
    mutedForeground: '38 12% 44%',
    accent: '222 65% 28%',
    accentForeground: '0 0% 100%',
    border: '38 20% 77%',
    input: '38 20% 77%',
    ring: '222 65% 28%',
    radius: '1rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '-0.025em',
    cardShadow: '0 2px 10px rgba(25, 56, 117, 0.08)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 40. Day-on-Day: Verde Musgo com Reciclado
  'day-verde-musgo-reciclado': {
    id: 'day-verde-musgo-reciclado',
    name: 'Day-on-Day Verde Musgo com Reciclado',
    category: 'Day-on-Day',
    isDark: false,
    background: '38 24% 91%', // Kraft reciclado
    foreground: '100 40% 14%', // Verde musgo denso
    card: '38 28% 95%',
    cardForeground: '100 40% 14%',
    popover: '38 28% 95%',
    popoverForeground: '100 40% 14%',
    primary: '100 42% 32%', // #3F6423 Verde Musgo artesanal
    primaryForeground: '0 0% 100%',
    secondary: '38 20% 82%',
    secondaryForeground: '100 40% 14%',
    muted: '38 20% 85%',
    mutedForeground: '38 12% 42%',
    accent: '100 42% 32%',
    accentForeground: '0 0% 100%',
    border: '38 20% 76%',
    input: '38 20% 76%',
    ring: '100 42% 32%',
    radius: '1.125rem',
    fontSans: "'DM Sans', system-ui, sans-serif",
    fontDisplay: "'Lora', serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.015em',
    cardShadow: '0 3px 12px rgba(63, 100, 35, 0.09)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 41. Day-on-Day: Bordô Bem Escuro com Reciclado
  'day-bordo-reciclado': {
    id: 'day-bordo-reciclado',
    name: 'Day-on-Day Bordô Bem Escuro com Reciclado',
    category: 'Day-on-Day',
    isDark: false,
    background: '38 25% 91%', // Base kraft reciclado
    foreground: '350 45% 12%', // Bordô muito escuro
    card: '38 28% 95%',
    cardForeground: '350 45% 12%',
    popover: '38 28% 95%',
    popoverForeground: '350 45% 12%',
    primary: '348 70% 34%', // #941A39 Bordô bem escuro vibrante
    primaryForeground: '0 0% 100%',
    secondary: '38 20% 83%',
    secondaryForeground: '350 45% 12%',
    muted: '38 20% 85%',
    mutedForeground: '38 12% 44%',
    accent: '348 70% 34%',
    accentForeground: '0 0% 100%',
    border: '38 20% 77%',
    input: '38 20% 77%',
    ring: '348 70% 34%',
    radius: '1rem',
    fontSans: "'Lora', serif, system-ui",
    fontDisplay: "'Playfair Display', serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.015em',
    cardShadow: '0 3px 12px rgba(148, 26, 57, 0.09)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // 42. Day-on-Day: Café & Kraft Rústico
  'day-cafe-kraft': {
    id: 'day-cafe-kraft',
    name: 'Day-on-Day Café & Kraft Rústico',
    category: 'Day-on-Day',
    isDark: false,
    background: '36 26% 89%', // Kraft autêntico
    foreground: '25 35% 14%', // Café escuro
    card: '36 28% 94%',
    cardForeground: '25 35% 14%',
    popover: '36 28% 94%',
    popoverForeground: '25 35% 14%',
    primary: '25 55% 26%', // #673516 Café torrado
    primaryForeground: '0 0% 100%',
    secondary: '36 20% 81%',
    secondaryForeground: '25 35% 14%',
    muted: '36 20% 83%',
    mutedForeground: '36 12% 40%',
    accent: '25 55% 26%',
    accentForeground: '0 0% 100%',
    border: '36 20% 75%',
    input: '36 20% 75%',
    ring: '25 55% 26%',
    radius: '0.875rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Space Grotesk', system-ui, sans-serif",
    headingFontWeight: '800',
    headingLetterSpacing: '-0.02em',
    cardShadow: '0 2px 8px rgba(103, 53, 22, 0.08)',
    cardBorderWidth: '1.5px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // ==========================================
  // GRUPO 5: TEMAS 100% NEUTROS (SEM COR DECORATIVA)
  // ==========================================

  // Neutral Black & White
  'neutral-black-white': {
    id: 'neutral-black-white',
    name: 'Neutro Black & White',
    category: 'Clean',
    isDark: true,
    background: '0 0% 0%', // #000000
    foreground: '0 0% 100%', // #ffffff
    card: '0 0% 7%', // #121212
    cardForeground: '0 0% 100%',
    popover: '0 0% 7%',
    popoverForeground: '0 0% 100%',
    primary: '0 0% 100%', // #ffffff
    primaryForeground: '0 0% 0%',
    secondary: '0 0% 15%',
    secondaryForeground: '0 0% 100%',
    muted: '0 0% 12%',
    mutedForeground: '0 0% 83%', // #d4d4d4
    accent: '0 0% 100%',
    accentForeground: '0 0% 0%',
    border: '0 0% 15%', // #262626
    input: '0 0% 15%',
    ring: '0 0% 100%',
    radius: '0.875rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.025em',
    cardShadow: 'none',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },

  // Neutral White & Black
  'neutral-white-black': {
    id: 'neutral-white-black',
    name: 'Neutro White & Black',
    category: 'Clean',
    isDark: false,
    background: '0 0% 100%', // #ffffff
    foreground: '0 0% 0%', // #000000
    card: '0 0% 96%', // #f5f5f5
    cardForeground: '0 0% 0%',
    popover: '0 0% 96%',
    popoverForeground: '0 0% 0%',
    primary: '0 0% 0%', // #000000
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 92%',
    secondaryForeground: '0 0% 0%',
    muted: '0 0% 92%',
    mutedForeground: '0 0% 20%', // #333333
    accent: '0 0% 0%',
    accentForeground: '0 0% 100%',
    border: '0 0% 90%', // #e5e5e5
    input: '0 0% 90%',
    ring: '0 0% 0%',
    radius: '0.875rem',
    fontSans: "'Inter', system-ui, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    headingFontWeight: '700',
    headingLetterSpacing: '-0.025em',
    cardShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    cardBorderWidth: '1px',
    buttonTransform: 'none',
    buttonWeight: '700',
  },
}

export const DEFAULT_THEME_ID = 'soft-verde-musgo'
const STORAGE_KEY = 'bichu_theme'

interface ThemeContextType {
  currentThemeId: string
  currentTheme: ThemeTokens
  setTheme: (themeId: string) => void
  resetToDefault: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID
    try {
      const saved = preferenceStorage.getItem(STORAGE_KEY)
      if (saved && THEME_DEFINITIONS[saved]) {
        return saved
      }
    } catch {
      /* ignore storage errors */
    }
    return DEFAULT_THEME_ID
  })

  const currentTheme = useMemo(() => {
    return THEME_DEFINITIONS[currentThemeId] || THEME_DEFINITIONS[DEFAULT_THEME_ID]
  }, [currentThemeId])

  const transitionCleanupRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const root = document.documentElement

    // Dynamic Fonts and Shapes (Google Fonts + Headings + Forms)
    root.style.setProperty('--font-sans', currentTheme.fontSans)
    root.style.setProperty('--font-display', currentTheme.fontDisplay)
    root.style.setProperty('--heading-weight', currentTheme.headingFontWeight || '800')
    root.style.setProperty(
      '--heading-letter-spacing',
      currentTheme.headingLetterSpacing || '-0.025em',
    )
    root.style.setProperty('--heading-text-transform', currentTheme.headingTransform || 'none')
    root.style.setProperty('--radius', currentTheme.radius)

    // Extra dynamic properties (Shadows, Borders, Buttons)
    root.style.setProperty('--theme-card-shadow', currentTheme.cardShadow || 'none')
    root.style.setProperty('--theme-card-border-width', currentTheme.cardBorderWidth || '1px')
    root.style.setProperty('--theme-btn-transform', currentTheme.buttonTransform || 'none')
    root.style.setProperty('--theme-btn-weight', currentTheme.buttonWeight || '700')
    root.style.setProperty(
      '--theme-btn-letter-spacing',
      currentTheme.buttonLetterSpacing || 'normal',
    )
    root.style.setProperty('--theme-btn-shadow', currentTheme.buttonShadow || 'none')

    root.setAttribute('data-theme', currentTheme.id)
    if (preferenceStorage.getItem('bichu_manual_color') === 'true') {
      const keys: Record<string, string> = { background: 'background', foreground: 'foreground', card: 'card', cardForeground: 'card-foreground', popover: 'popover', popoverForeground: 'popover-foreground', primary: 'primary', primaryForeground: 'primary-foreground', secondary: 'secondary', secondaryForeground: 'secondary-foreground', muted: 'muted', mutedForeground: 'muted-foreground', accent: 'accent', accentForeground: 'accent-foreground', border: 'border', input: 'input', ring: 'ring' }
      for (const [key, css] of Object.entries(keys)) root.style.setProperty(`--${css}`, String(currentTheme[key as keyof ThemeTokens]))
    }

    preferenceStorage.setItem(STORAGE_KEY, currentTheme.id)
  }, [currentTheme])

  const setTheme = (themeId: string) => {
    if (THEME_DEFINITIONS[themeId]) {
      // Ativa a classe de transição para que as cores fluam suavemente,
      // e a remove ao terminar — mantendo o app fluido em interações normais.
      if (typeof document !== 'undefined') {
        const root = document.documentElement
        root.classList.add('theme-transitioning')
        window.clearTimeout(transitionCleanupRef.current)
        transitionCleanupRef.current = window.setTimeout(() => {
          root.classList.remove('theme-transitioning')
        }, 520)
      }
      preferenceStorage.setItem('bichu_manual_color', 'true')
      setCurrentThemeId(themeId)
    }
  }

  const resetToDefault = () => {
    setTheme(DEFAULT_THEME_ID)
  }

  return (
    <ThemeContext.Provider
      value={{
        currentThemeId,
        currentTheme,
        setTheme,
        resetToDefault,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider')
  }
  return context
}
