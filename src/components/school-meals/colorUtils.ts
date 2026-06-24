export const CARD_COLORS = [
  'theme-blue',
  'theme-pink',
  'theme-mint',
  'theme-yellow',
  'theme-purple',
  'theme-orange'
]

export function getAvailableColor(existingColors: string[]): string {
  const available = CARD_COLORS.filter(c => !existingColors.includes(c))
  if (available.length > 0) {
    // Return a random available color
    return available[Math.floor(Math.random() * available.length)]
  }
  // Fallback if all used
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]
}

export function getColorClasses(theme: string) {
  switch (theme) {
    case 'theme-blue':
      return 'bg-blue-50/80 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100'
    case 'theme-pink':
      return 'bg-pink-50/80 border-pink-200 text-pink-900 dark:bg-pink-950/40 dark:border-pink-900 dark:text-pink-100'
    case 'theme-mint':
      return 'bg-teal-50/80 border-teal-200 text-teal-900 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-100'
    case 'theme-yellow':
      return 'bg-yellow-50/80 border-yellow-200 text-yellow-900 dark:bg-yellow-950/40 dark:border-yellow-900 dark:text-yellow-100'
    case 'theme-purple':
      return 'bg-purple-50/80 border-purple-200 text-purple-900 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-100'
    case 'theme-orange':
      return 'bg-orange-50/80 border-orange-200 text-orange-900 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-100'
    default:
      return 'bg-slate-50/80 border-slate-200 text-slate-900 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-100'
  }
}
