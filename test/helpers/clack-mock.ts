import { vi } from 'vitest'

/**
 * Drop-in mock for `@clack/prompts`, used in every command test via:
 *   vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))
 * Import `text`/`confirm`/`select` back in the test to queue answers with
 * `.mockResolvedValueOnce(...)`, and use `CANCEL` to simulate a cancelled prompt.
 */
export const CANCEL = Symbol('clack-cancel')

export const intro = vi.fn()
export const outro = vi.fn()
export const cancel = vi.fn()
export const log = {
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  step: vi.fn(),
}
export const isCancel = (value: unknown): boolean => value === CANCEL
export const text = vi.fn(async (): Promise<string | symbol> => '')
export const confirm = vi.fn(async (): Promise<boolean | symbol> => false)
export const select = vi.fn(async (): Promise<string | symbol> => '')
