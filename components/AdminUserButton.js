import { UserButton } from '@clerk/nextjs'

/**
 * Keeps Clerk's native avatar menu intact and gives every signed-in user an
 * entry point to the dashboard. Admin-only actions are authorized by the API.
 */
export default function AdminUserButton({ afterSignOutUrl = '/' }) {
  return (
    <UserButton afterSignOutUrl={afterSignOutUrl}>
      <UserButton.MenuItems>
        <UserButton.Link
          href='/admin'
          label='进入管理后台'
          labelIcon={<span aria-hidden='true'>⌘</span>}
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
