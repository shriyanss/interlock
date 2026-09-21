const NATION_FLAGS: Record<string, string> = {
  Russia: "🇷🇺",
  Ukraine: "🇺🇦",
  Iran: "🇮🇷",
  China: "🇨🇳",
};

const FALLBACK_FLAG = "🏳️";

export function flagFor(country: string): string {
  return NATION_FLAGS[country] ?? FALLBACK_FLAG;
}
