import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '@/components/ui/card'

describe('Card surface prop', () => {
  it('defaults to white surface with mist border and 20px radius', () => {
    const { container } = render(<Card>content</Card>)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-white')
    expect(card.className).toContain('border-mist')
    expect(card.className).toContain('rounded-[20px]')
  })

  it('renders pastel surfaces without a border', () => {
    const { container } = render(<Card surface="sage">content</Card>)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-sage-card')
    expect(card.className).not.toContain('border-mist')
  })

  it('still merges custom className', () => {
    const { container } = render(<Card className="mt-2">content</Card>)
    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2')
  })
})
