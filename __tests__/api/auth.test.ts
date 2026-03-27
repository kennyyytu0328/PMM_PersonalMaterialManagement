import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const password = 'securePassword123'
    const hash = await bcrypt.hash(password, 10)

    expect(hash).not.toBe(password)
    expect(await bcrypt.compare(password, hash)).toBe(true)
    expect(await bcrypt.compare('wrongPassword', hash)).toBe(false)
  })
})
