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
          <button className='w-8 h-8 rounded-full overflow-hidden border border-[var(--fuwari-border)] hover:border-[var(--fuwari-primary)] hover:shadow-sm transition-all focus:outline-none flex items-center justify-center shrink-0' title='Login'>
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80" 
              alt="Default User Avatar"
              className="w-full h-full object-cover"
            />
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className='w-8 h-8 flex items-center justify-center shrink-0'>
          <UserButton afterSignOutUrl='/' />
        </div>
      </SignedIn>
    </div>
  )
}

export default ClerkAuthControls
