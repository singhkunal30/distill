// Claude-inspired palette, shared by NativeWind classes and any place
// that hard-codes hex (status bar, audio bar, icons, the reader).

export const light = {
  background: '#f7f4ec',     // warm cream
  foreground: '#1f1c18',     // near-black, warm-tinted
  card: '#fbf8f0',
  cardForeground: '#1f1c18',
  muted: '#ece5d4',
  mutedForeground: '#6b6760',
  accent: '#c2693d',         // terracotta
  accentForeground: '#f7f4ec',
  border: '#ddd5c4',
  destructive: '#b91c1c',
};

export const dark = {
  background: '#1a1816',
  foreground: '#efeae0',
  card: '#221f1c',
  cardForeground: '#efeae0',
  muted: '#2a2624',
  mutedForeground: '#a8a39a',
  accent: '#cf7950',
  accentForeground: '#1a1816',
  border: '#3a342f',
  destructive: '#dc2626',
};

export const sepia = {
  background: '#efe5d2',
  foreground: '#3a2c20',
  card: '#f4ecdb',
  cardForeground: '#3a2c20',
  muted: '#e3d5be',
  mutedForeground: '#7a6651',
  accent: '#9a4f29',
  accentForeground: '#efe5d2',
  border: '#cdbf9e',
  destructive: '#b91c1c',
};

export type Palette = typeof light;

export function paletteFor(scheme: 'light' | 'dark' | null | undefined): Palette {
  return scheme === 'dark' ? dark : light;
}
