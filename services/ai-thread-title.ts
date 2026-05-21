export function normalizeAiThreadTitle(title: string) {
  return title.replace(/\s+/g, " ").trim().slice(0, 120);
}
