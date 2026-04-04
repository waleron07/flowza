import { describe, expect, it } from 'vitest'
import { fixApiMessageMojibake, fixUtf8MisreadAsCp1251, fixUtf8MisreadAsLatin1 } from './fix-utf8-mojibake'

/** UTF-8 байты строки, каждый байт отдельно интерпретирован как символ CP1251 — типичные «кракозябры». */
function utf8BytesMisreadAsCp1251(text: string): string {
  const utf8 = new TextEncoder().encode(text)
  const dec = new TextDecoder('windows-1251')
  let out = ''
  for (let i = 0; i < utf8.length; i++) {
    out += dec.decode(new Uint8Array([utf8[i]]))
  }
  return out
}

describe('fixUtf8MisreadAsCp1251', () => {
  it('восстанавливает кириллицу после UTF-8→CP1251 по байтам', () => {
    const garbled = utf8BytesMisreadAsCp1251('Капча недействительна')
    expect(garbled).not.toBe('Капча недействительна')
    expect(fixUtf8MisreadAsCp1251(garbled)).toBe('Капча недействительна')
  })

  it('не портит уже корректный Unicode', () => {
    const ok = 'Ошибка валидации'
    expect(fixUtf8MisreadAsCp1251(ok)).toBe(ok)
  })
})

describe('fixUtf8MisreadAsLatin1', () => {
  it('восстанавливает Latin-1→UTF-8', () => {
    const bytes = new TextEncoder().encode('Invalid')
    let latin1 = ''
    for (let i = 0; i < bytes.length; i++) {
      latin1 += String.fromCharCode(bytes[i])
    }
    expect(fixUtf8MisreadAsLatin1(latin1)).toBe('Invalid')
  })
})

describe('fixApiMessageMojibake', () => {
  it('объединяет оба варианта искажения', () => {
    const garbled = utf8BytesMisreadAsCp1251('Токен капчи устарел')
    expect(fixApiMessageMojibake(garbled)).toBe('Токен капчи устарел')
  })

  it('оставляет ASCII без изменений', () => {
    expect(fixApiMessageMojibake('Captcha token invalid')).toBe('Captcha token invalid')
  })
})
