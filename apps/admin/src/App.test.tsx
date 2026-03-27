import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders frontend scaffold title', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /flowza frontend/i }),
    ).toBeInTheDocument()
  })
})
