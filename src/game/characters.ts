import { CharacterDef, CharacterId } from './types';

export const BASE_CHARACTERS: Record<string, CharacterDef> = {
  oren: {
    id: 'oren',
    name: 'Oren',
    instrument: 'Sintetizador Clásico',
    traitLabel: 'Equilibrado · Ideal para empezar',
    bodyColor: '#F97316',
    bodyShadow: '#C2410C',
    accentColor: '#FACC15',
    eyeBg: '#FFFFFF',
    speedMultiplier: 1.0,
    jumpMultiplier: 1.0,
    gravityMultiplier: 1.0,
    voicePitchOffset: 0,
    accessory: 'headphones',
  },
  clukr: {
    id: 'clukr',
    name: 'Clukr',
    instrument: 'Platillos Metálicos',
    traitLabel: 'Salto Alto · Alcance extra',
    bodyColor: '#CBD5E1',
    bodyShadow: '#64748B',
    accentColor: '#38BDF8',
    eyeBg: '#FFFFFF',
    speedMultiplier: 0.98,
    jumpMultiplier: 1.07,
    gravityMultiplier: 0.98,
    voicePitchOffset: 5,
    accessory: 'cap',
  },
  pinky: {
    id: 'pinky',
    name: 'Pinky',
    instrument: 'Coro Melódico',
    traitLabel: 'Flotación Suave · Control aéreo',
    bodyColor: '#F472B6',
    bodyShadow: '#BE185D',
    accentColor: '#FDE047',
    eyeBg: '#FFFFFF',
    speedMultiplier: 1.0,
    jumpMultiplier: 1.02,
    gravityMultiplier: 0.9,
    voicePitchOffset: 7,
    accessory: 'bow',
  },
  raddy: {
    id: 'raddy',
    name: 'Raddy',
    instrument: 'Bombo Turbo',
    traitLabel: 'Velocidad Extra · Carrera rápida',
    bodyColor: '#EF4444',
    bodyShadow: '#991B1B',
    accentColor: '#FCA5A5',
    eyeBg: '#FFFFFF',
    speedMultiplier: 1.09,
    jumpMultiplier: 0.99,
    gravityMultiplier: 1.02,
    voicePitchOffset: -5,
    accessory: 'horns',
  },
};

const STORAGE_CUSTOM_KEY = 'super_sprunki_custom_chars_v2';

export function getCustomCharacters(): CharacterDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CharacterDef[];
  } catch {
    return [];
  }
}

export function saveCustomCharacter(char: CharacterDef): void {
  try {
    const existing = getCustomCharacters();
    const idx = existing.findIndex((c) => c.id === char.id);
    if (idx >= 0) {
      existing[idx] = char;
    } else {
      existing.push(char);
    }
    localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function deleteCustomCharacter(id: string): void {
  try {
    const existing = getCustomCharacters();
    const filtered = existing.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function getCharacterDef(id: CharacterId): CharacterDef {
  if (BASE_CHARACTERS[id]) return BASE_CHARACTERS[id];
  const custom = getCustomCharacters().find((c) => c.id === id);
  if (custom) return custom;
  return BASE_CHARACTERS.oren;
}

export const CHARACTERS: Record<string, CharacterDef> = new Proxy(BASE_CHARACTERS, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    const custom = getCustomCharacters().find((c) => c.id === prop);
    return custom ?? target.oren;
  },
});

export function getAllCharacters(): CharacterDef[] {
  return [
    BASE_CHARACTERS.oren,
    BASE_CHARACTERS.clukr,
    BASE_CHARACTERS.pinky,
    BASE_CHARACTERS.raddy,
    ...getCustomCharacters(),
  ];
}
