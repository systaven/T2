import { act, render, screen } from '@testing-library/react'
import SignInGate from '@/themes/vhastro/components/SignInGate'

jest.mock('@clerk/nextjs', () => ({
  ClerkLoading: ({ children }) => children,
  ClerkLoaded: () => null,
  SignInButton: ({ children }) => children
}))

test('login-locked articles report Clerk loading failure instead of spinning forever', () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_fixture'
  jest.useFakeTimers()
  try {
    const { unmount } = render(<SignInGate />)
    expect(screen.getByText('正在加载账号服务…')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(15000))
    expect(screen.getByRole('status')).toHaveTextContent('暂时无法加载')
    expect(screen.getByRole('button', { name: '重新加载' })).toBeEnabled()
    unmount()
  } finally {
    jest.useRealTimers()
    if (key === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = key
  }
})
