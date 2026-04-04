const cp1251CharToByte = (() => {
  const map = new Map<string, number>()
  const decoder = new TextDecoder('windows-1251')
  for (let b = 0; b < 256; b++) {
    const ch = decoder.decode(new Uint8Array([b]))
    if (!map.has(ch)) {
      map.set(ch, b)
    }
  }
  return map
})()

/**
 * UTF-8 байты были ошибочно интерпретированы как Windows-1251 (два «левых» символа на одну кириллическую букву).
 * Обратное сопоставление: символ → байт CP1251 → декодирование как UTF-8.
 * Нормальная кириллица (один символ на букву) обычно даёт невалидный UTF-8 — тогда возвращаем исходную строку.
 */
export function fixUtf8MisreadAsCp1251(text: string): string {
  if (!text) {
    return text
  }

  const bytes: number[] = []
  for (const ch of text) {
    const b = cp1251CharToByte.get(ch)
    if (b === undefined) {
      return text
    }
    bytes.push(b)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
  } catch {
    return text
  }
}

/**
 * UTF-8 был ошибочно прочитан как Latin-1 (каждый байт — символ U+00..U+FF).
 */
export function fixUtf8MisreadAsLatin1(text: string): string {
  if (!text) {
    return text
  }

  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 255) {
      return text
    }
  }

  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return text
  }
}

/** Сообщения API: сначала Latin-1→UTF-8, затем типичный для Windows CP1251→UTF-8. */
export function fixApiMessageMojibake(text: string): string {
  if (!text) {
    return text
  }
  const latin1 = fixUtf8MisreadAsLatin1(text)
  if (latin1 !== text) {
    return latin1
  }
  const cp1251 = fixUtf8MisreadAsCp1251(text)
  return cp1251 !== text ? cp1251 : text
}
