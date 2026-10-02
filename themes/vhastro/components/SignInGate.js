import { ClerkLoaded, ClerkLoading, SignInButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import styles from '../Theme.module.css'

function LoadingMessage() {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setFailed(true), 15000)
    return () => window.clearTimeout(timer)
  }, [])
  return failed ? (
    <div role='status'>
      <p>账号服务暂时无法加载，请检查网络后重试。</p>
      <button
        className={styles.signIn}
        type='button'
        onClick={() => window.location.reload()}
      >
        重新加载
      </button>
    </div>
  ) : (
    <p className={styles.muted}>正在加载账号服务…</p>
  )
}

export default function SignInGate() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return <p>本站尚未配置登录服务，暂时无法解锁。</p>
  return (
    <>
      <ClerkLoading>
        <LoadingMessage />
      </ClerkLoading>
      <ClerkLoaded>
        <SignInButton mode='modal'>
          <button type='button' className={styles.signIn}>
            登录后继续阅读
          </button>
        </SignInButton>
      </ClerkLoaded>
    </>
  )
}
