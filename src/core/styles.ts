/** Papers, pens, hands and colour names. Every colour here is diagram ink, not UI chrome. */

export interface Paper {
  label: string;
  ground: string;
  dark: boolean;
  /** Ink for annotations: the "red pen" on light paper, a yellow chalk on dark. */
  mark: string;
}

export const PAPERS: Record<string, Paper> = {
  notebook: { label: 'Notebook', ground: '#fbfaf5', dark: false, mark: '#d23b2f' },
  graph: { label: 'Graph paper', ground: '#f8fbfc', dark: false, mark: '#d23b2f' },
  whiteboard: { label: 'Whiteboard', ground: '#fdfdfd', dark: false, mark: '#d6332a' },
  napkin: { label: 'Napkin', ground: '#f4eee2', dark: false, mark: '#c2412f' },
  blank: { label: 'Blank', ground: '#ffffff', dark: false, mark: '#d23b2f' },
  chalkboard: { label: 'Chalkboard', ground: '#24312c', dark: true, mark: '#ffd166' },
  blueprint: { label: 'Blueprint', ground: '#1f4f8a', dark: true, mark: '#ffe08a' },
};

export interface Pen {
  label: string;
  ink: string;
  inkOnDark: string;
  width: number;
  /** Extra roughness this pen adds on top of the mess setting. */
  grain: number;
  opacity: number;
}

export const PENS: Record<string, Pen> = {
  ballpoint: { label: 'Blue ballpoint', ink: '#1f3a9e', inkOnDark: '#dfe8ff', width: 1.5, grain: 0, opacity: 1 },
  marker: { label: 'Black marker', ink: '#1d1d1f', inkOnDark: '#f6f4ee', width: 2.6, grain: -0.1, opacity: 1 },
  pencil: { label: 'Pencil', ink: '#4a4e57', inkOnDark: '#d9d9d4', width: 1.2, grain: 0.5, opacity: 0.88 },
  felt: { label: 'Green felt tip', ink: '#126b57', inkOnDark: '#c6f2df', width: 2, grain: 0.1, opacity: 1 },
  chalk: { label: 'Chalk', ink: '#3a3a3a', inkOnDark: '#f3f0e4', width: 2.4, grain: 0.7, opacity: 0.92 },
};

export interface Hand {
  label: string;
  family: string;
  /** Size multiplier so different hands read at the same apparent size. */
  scale: number;
  weight: number;
}

export const HANDS: Record<string, Hand> = {
  caveat: { label: 'Caveat (quick notes)', family: 'Caveat', scale: 1.3, weight: 500 },
  kalam: { label: 'Kalam (neat print)', family: 'Kalam', scale: 1, weight: 400 },
  patrick: { label: 'Patrick Hand (rounded)', family: 'Patrick Hand', scale: 1.08, weight: 400 },
  gochi: { label: 'Gochi Hand (marker)', family: 'Gochi Hand', scale: 1.06, weight: 400 },
  architect: { label: "Architect's Daughter", family: 'Architects Daughter', scale: 0.96, weight: 400 },
};

/** Named fills and highlighter colours you can write in source. */
export const COLORS: Record<string, string> = {
  yellow: '#ffe14d',
  pink: '#ff8fc2',
  green: '#7fe0a0',
  blue: '#8cc8ff',
  orange: '#ffb35c',
  purple: '#c9a6ff',
  red: '#ff8a80',
  gray: '#c9c9c9',
};

/** Ink colours for `color=`: a darker value for light paper, a lighter one for dark paper. */
export const INKS: Record<string, { light: string; dark: string }> = {
  red: { light: '#c62828', dark: '#ff8a80' },
  blue: { light: '#1f4fbf', dark: '#9cc4ff' },
  green: { light: '#1b7a43', dark: '#8ce6a8' },
  orange: { light: '#c25e00', dark: '#ffc27a' },
  purple: { light: '#6a3fb5', dark: '#d0b3ff' },
  black: { light: '#1d1d1f', dark: '#f6f4ee' },
  gray: { light: '#6b6f76', dark: '#c9c9c9' },
  pink: { light: '#b8326e', dark: '#ff9fcf' },
};

export const SIZES: Record<string, number> = { small: 0.8, normal: 1, large: 1.3 };

export const STICKY = '#fff2a1';

export const DEFAULTS = {
  layout: 'flow',
  direction: 'right' as const,
  paper: 'notebook',
  pen: 'ballpoint',
  hand: 'caveat',
  mess: 0.45,
  seed: 7,
};

export const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Kalam:wght@400;700&family=Patrick+Hand&family=Gochi+Hand&family=Architects+Daughter&display=swap';
