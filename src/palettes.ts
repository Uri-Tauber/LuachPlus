export const paletteOptions = {
  forma: ['blue', 'green', 'purple', 'red'],
  monarch: ['purple', 'blue', 'green', 'red', 'yellow'],
  breezy: ['indigo', 'amber', 'emerald', 'rose'],
  pulse: ['red', 'blue', 'green', 'purple'],
  classic: ['default'],
} as const;
export type Theme = keyof typeof paletteOptions;
export function paletteFor(theme: Theme, value?: string): string {
  const options: readonly string[] = paletteOptions[theme];
  return value && options.includes(value) ? value : options[0];
}
