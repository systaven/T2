import { ClerkLoading, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import AdminUserButton from '@/components/AdminUserButton'
import Icon from './Icon'
import styles from '../Theme.module.css'

function LoadingAccount() {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setFailed(true), 15000)
    return () => window.clearTimeout(timer)
  }, [])
  const label = failed ? '账号服务未能加载，点击重试' : '账号正在加载'
  return (
    <button
      className={styles.tool}
      type='button'
      aria-label={label}
      title={label}
      disabled={!failed}
      onClick={() => window.location.reload()}
    >
      <Icon name='user' />
    </button>
  )
}

export default function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null
  return (
    <div className={styles.auth}>
      <ClerkLoading>
        <LoadingAccount />
      </ClerkLoading>
      <SignedOut>
        <SignInButton mode='modal'>
          <button type='button' className={styles.tool} aria-label='登录账号'>
            <Icon name='user' />
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <AdminUserButton />
      </SignedIn>
    </div>
  )
}
