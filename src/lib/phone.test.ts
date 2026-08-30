import { describe, expect, it } from 'vitest'
import { displayPhoneNumber, normalizePhoneNumber } from './phone'

describe('phone number normalization', () => {
  it('normalizes Pakistani local numbers to E.164', () => {
    expect(normalizePhoneNumber('0300 1234567')).toBe('+923001234567')
  })

  it('preserves valid international numbers in E.164', () => {
    expect(normalizePhoneNumber('+1 (213) 373-4253')).toBe('+12133734253')
    expect(displayPhoneNumber('+12133734253')).toContain('+1 213')
  })

  it('rejects invalid numbers and allows an empty optional value', () => {
    expect(normalizePhoneNumber('')).toBe('')
    expect(() => normalizePhoneNumber('123')).toThrow('Enter a valid phone number')
  })
})
