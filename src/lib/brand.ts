/**
 * Constantes centrais de marca e identidade visual do aplicativo.
 * Centralizar aqui evita divergências de nomenclatura pela aplicação.
 */
export const APP_NAME = 'Meu Bichu'
export const APP_NAME_UPPER = 'MEU BICHU'
export const APP_NAME_PRO = 'Meu Bichu'
export const APP_TAGLINE = 'Saúde e bem-estar de cães e gatos'
export const APP_DESCRIPTION =
  'Plataforma completa de nutrição, acompanhamento e cuidado de cães e gatos.'
export const APP_VERSION = '2.5.0'

export const BRAND = {
  name: APP_NAME,
  nameUpper: APP_NAME_UPPER,
  pro: APP_NAME_PRO,
  tagline: APP_TAGLINE,
  description: APP_DESCRIPTION,
  version: APP_VERSION,
} as const
