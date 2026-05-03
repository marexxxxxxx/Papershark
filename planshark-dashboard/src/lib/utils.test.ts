import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('base-class', 'added-class')).toBe('base-class added-class')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'truthy', false && 'falsy')).toBe('base truthy')
  })

  it('merges tailwind classes properly', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })
})
