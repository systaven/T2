'use client'

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

const ClerkAuthControls = () => {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return null
  }

  return (
    <div className='flex items-center'>
      <SignedOut>
        <SignInButton mode='modal'>
          <button className='fuwari-tool-btn' title='Login'>
            <i className='fas fa-user' />
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className='w-8 h-8 flex items-center justify-center'>
          <UserButton afterSignOutUrl='/' />
        </div>
      </SignedIn>
    </div>
  )
}

export default ClerkAuthControls
