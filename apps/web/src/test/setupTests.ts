import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
