import { Tab } from '@headlessui/react'
import { SignInButton, UserProfile, useAuth, useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

const useAdminApi = () => {
  const { getToken } = useAuth()

  return useCallback(
    async (url, options = {}) => {
      const token = await getToken()
      const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || '请求失败')
      return body
    },
    [getToken]
  )
}

const panelClass =
  'rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900'
const buttonClass =
  'rounded-md bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800'

const Toast = ({ toast, dismiss }) => {
  if (!toast) return null
  const success = toast.type === 'success'
  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] flex max-w-sm items-start gap-3 rounded-lg border-l-4 bg-white px-4 py-3 text-sm shadow-[0_14px_36px_rgba(15,23,42,0.18)] dark:bg-slate-900 ${success ? 'border-emerald-600 text-emerald-800 dark:text-emerald-300' : 'border-red-600 text-red-700 dark:text-red-300'}`}
      role={success ? 'status' : 'alert'}
    >
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${success ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden='true'
      >
        {success ? '✓' : '!'}
      </span>
      <div>
        <p className='font-medium'>{success ? '操作成功' : '操作失败'}</p>
        <p className='mt-0.5 text-slate-600 dark:text-slate-300'>
          {toast.message}
        </p>
      </div>
      <button
        type='button'
        className='ml-2 rounded text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-slate-100'
        onClick={dismiss}
        aria-label='关闭提示'
      >
        ×
      </button>
    </div>
  )
}

const StatCard = ({ label, value, tone = 'blue' }) => {
  const tones = {
    blue: 'border-t-blue-600',
    green: 'border-t-emerald-600',
    amber: 'border-t-amber-500'
  }
  return (
    <article
      className={`border border-t-[3px] border-slate-200 bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 ${tones[tone]}`}
    >
      <p className='text-sm text-slate-500 dark:text-slate-400'>{label}</p>
      <p className='mt-3 text-3xl font-semibold tracking-tight text-[#172033] dark:text-white'>
        {value}
      </p>
    </article>
  )
}

const AnnouncementPanel = ({ isAdmin, announcements, reload, notify }) => {
  const api = useAdminApi()
  const [form, setForm] = useState({ title: '', content: '', published: true })
  const [saving, setSaving] = useState(false)

  const createAnnouncement = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      await api('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      setForm({ title: '', content: '', published: true })
      await reload()
      notify('公告已发布。')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateAnnouncement = async (item, changes) => {
    try {
      await api(`/api/admin/announcements/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, ...changes })
      })
      await reload()
      notify(changes.published ? '公告已发布。' : '公告已转为草稿。')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const deleteAnnouncement = async item => {
    if (!window.confirm(`确定删除公告“${item.title}”吗？`)) return
    try {
      await api(`/api/admin/announcements/${item.id}`, { method: 'DELETE' })
      await reload()
      notify('公告已删除。')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <div className='space-y-5'>
      {isAdmin && (
        <form
          className={panelClass}
          onSubmit={event => void createAnnouncement(event)}
        >
          <h2 className='text-lg font-semibold'>发布公告</h2>
          <div className='mt-4 space-y-3'>
            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200'>
                标题
              </span>
              <input
                className={inputClass}
                required
                maxLength={255}
                placeholder='例如：本周站点更新'
                value={form.title}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    title: event.target.value
                  }))
                }
              />
            </label>
            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200'>
                内容
              </span>
              <textarea
                className={inputClass}
                rows={5}
                placeholder='写下要告知用户的内容'
                value={form.content}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    content: event.target.value
                  }))
                }
              />
            </label>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={form.published}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    published: event.target.checked
                  }))
                }
              />
              立即发布
            </label>
            <button className={buttonClass} disabled={saving}>
              {saving ? '保存中…' : '发布公告'}
            </button>
          </div>
        </form>
      )}
      {announcements.length === 0 ? (
        <div className={`${panelClass} text-center`}>
          <p className='font-medium text-slate-700 dark:text-slate-200'>
            还没有公告
          </p>
          <p className='mt-1 text-sm text-slate-500'>
            {isAdmin
              ? '使用上方表单发布第一条公告。'
              : '管理员发布后会显示在这里。'}
          </p>
        </div>
      ) : (
        <div className='divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900'>
          {announcements.map(item => (
            <article className='p-6' key={item.id}>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <h3 className='text-lg font-semibold text-[#172033] dark:text-white'>
                    {item.title}
                  </h3>
                  <p className='mt-1 text-xs text-slate-500'>
                    {new Date(item.$createdAt).toLocaleString()}
                  </p>
                </div>
                {isAdmin && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.published ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    {item.published ? '已发布' : '草稿'}
                  </span>
                )}
              </div>
              <p className='mt-4 max-w-3xl whitespace-pre-wrap leading-7 text-slate-600 dark:text-slate-300'>
                {item.content || '（无正文）'}
              </p>
              {isAdmin && (
                <div className='mt-5 flex gap-4 text-sm'>
                  <button
                    type='button'
                    className='font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                    onClick={() =>
                      void updateAnnouncement(item, {
                        published: !item.published
                      })
                    }
                  >
                    {item.published ? '转为草稿' : '发布'}
                  </button>
                  <button
                    type='button'
                    className='font-medium text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
                    onClick={() => void deleteAnnouncement(item)}
                  >
                    删除
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

const UserPanel = ({ users, reload, currentUserId, notify }) => {
  const api = useAdminApi()
  const [savingUserId, setSavingUserId] = useState(null)
  const changeRole = async (user, role) => {
    if (user.id === currentUserId) {
      notify('不能修改自己的管理员权限。', 'error')
      return
    }
    setSavingUserId(user.id)
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      })
      await reload()
      notify(
        `${user.name || user.email} 已设为${role === 'admin' ? '管理员' : '普通用户'}。`
      )
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSavingUserId(null)
    }
  }
  return (
    <div className='space-y-5'>
      <div className='border-b border-slate-200 pb-5 dark:border-slate-800'>
        <h1 className='text-3xl font-semibold tracking-[-0.025em] text-[#172033] dark:text-white'>
          用户管理
        </h1>
        <p className='mt-2 max-w-2xl leading-6 text-slate-500'>
          分配后台访问权限。当前管理员不能降低自己的权限。
        </p>
      </div>
      <div className={panelClass}>
        <h2 className='text-lg font-semibold'>权限列表</h2>
        <div className='mt-4 overflow-x-auto'>
          <table className='w-full min-w-[640px] text-left text-sm'>
            <thead className='border-b text-slate-500'>
              <tr>
                <th className='p-3'>用户</th>
                <th className='p-3'>邮箱</th>
                <th className='p-3'>注册时间</th>
                <th className='p-3'>权限</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  className='border-b border-slate-100 last:border-0 dark:border-slate-800'
                  key={user.id}
                >
                  <td className='p-3 font-medium'>{user.name}</td>
                  <td className='p-3'>{user.email}</td>
                  <td className='p-3'>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className='p-3'>
                    <select
                      className={inputClass}
                      aria-label={`设置 ${user.name || user.email} 的权限`}
                      value={user.role}
                      disabled={
                        user.id === currentUserId || savingUserId === user.id
                      }
                      title={
                        user.id === currentUserId
                          ? '不能修改自己的管理员权限'
                          : undefined
                      }
                      onChange={event =>
                        void changeRole(user, event.target.value)
                      }
                    >
                      <option value='user'>普通用户</option>
                      <option value='admin'>管理员</option>
                    </select>
                    {user.id === currentUserId && (
                      <p className='mt-1.5 text-xs text-slate-400'>当前账号</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AdminApp({ siteName = '我的博客' }) {
  const api = useAdminApi()
  const { signOut } = useClerk()
  const [session, setSession] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const notify = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const loadAnnouncements = useCallback(async () => {
    const result = await api('/api/admin/announcements')
    setAnnouncements(result.data || [])
  }, [api])
  const loadUsers = useCallback(async () => {
    const result = await api('/api/admin/users?limit=100&offset=0')
    setUsers(result.data || [])
  }, [api])

  useEffect(() => {
    api('/api/admin/session')
      .then(async current => {
        setSession(current)
        await loadAnnouncements()
        if (current.role === 'admin') await loadUsers()
      })
      .catch(err => setError(err.message))
  }, [api, loadAnnouncements, loadUsers])

  const isAdmin = session?.role === 'admin'
  const tabs = useMemo(
    () => ['概览', '公告', ...(isAdmin ? ['用户管理'] : []), '账号与安全'],
    [isAdmin]
  )
  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({ redirectUrl: '/' })
    } catch (err) {
      notify(err.message || '退出登录失败，请重试。', 'error')
      setIsSigningOut(false)
    }
  }
  if (error)
    return (
      <main className='grid min-h-screen place-items-center bg-slate-50 p-6'>
        <div className={`${panelClass} max-w-lg`}>
          <h1 className='text-xl font-semibold'>后台暂时无法载入</h1>
          <p className='mt-2 leading-6 text-slate-600 dark:text-slate-300'>
            {error}
          </p>
          <p className='mt-2 text-sm text-slate-500'>
            检查登录状态和后台服务配置后重试。
          </p>
          <div className='mt-5 flex items-center gap-4'>
            <button
              type='button'
              className={buttonClass}
              onClick={() => window.location.reload()}
            >
              重新载入
            </button>
            <Link
              href='/'
              className='text-sm font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            >
              返回博客
            </Link>
          </div>
        </div>
      </main>
    )
  if (!session)
    return (
      <main className='grid min-h-screen place-items-center bg-slate-50'>
        正在载入管理后台…
      </main>
    )

  return (
    <main className='min-h-screen bg-[#f7f8fa] text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
      <header className='sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95'>
        <div className='mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6'>
          <div className='flex min-w-0 items-center gap-3'>
            <span
              className='h-9 w-1 shrink-0 bg-[#2563eb]'
              aria-hidden='true'
            />
            <div className='min-w-0'>
              <p className='truncate font-semibold tracking-tight'>站点管理</p>
              <p className='truncate text-xs text-slate-500'>{siteName}</p>
            </div>
          </div>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link
              href='/'
              className='inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            >
              <span className='hidden sm:inline'>返回博客</span>
              <span className='sm:hidden'>博客</span>
            </Link>
            <div className='hidden items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-700 sm:flex'>
              {session.avatar ? (
                <Image
                  src={session.avatar}
                  alt=''
                  width={34}
                  height={34}
                  className='h-[34px] w-[34px] rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700'
                />
              ) : (
                <span className='grid h-[34px] w-[34px] place-items-center rounded-full bg-slate-200 text-xs font-semibold dark:bg-slate-700'>
                  {(session.fullName || session.email || '?')[0].toUpperCase()}
                </span>
              )}
              <div className='hidden max-w-40 lg:block'>
                <p className='truncate text-sm font-medium'>
                  {session.fullName}
                </p>
                <p className='truncate text-xs text-slate-500'>
                  {session.email}
                </p>
              </div>
            </div>
            <button
              type='button'
              className='rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              {isSigningOut ? '退出中…' : '退出登录'}
            </button>
          </div>
        </div>
      </header>
      <Tab.Group>
        <div className='mx-auto grid max-w-[1440px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8 lg:py-7'>
          <aside className='lg:sticky lg:top-[76px] lg:self-start'>
            <Tab.List className='flex gap-1.5 overflow-x-auto rounded-md bg-[#172033] p-2.5 shadow-[0_8px_24px_rgba(23,32,51,0.12)] lg:min-h-[calc(100vh-7rem)] lg:flex-col lg:p-4'>
              {tabs.map(tab => (
                <Tab as={Fragment} key={tab}>
                  {({ selected }) => (
                    <button
                      className={`whitespace-nowrap rounded px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${selected ? 'bg-[#2563eb] text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  )}
                </Tab>
              ))}
            </Tab.List>
          </aside>
          <Tab.Panels className='min-w-0 max-w-5xl'>
            <Tab.Panel className='space-y-5'>
              <div className='border-b border-slate-200 pb-5 dark:border-slate-800'>
                <h1 className='text-3xl font-semibold tracking-[-0.025em] text-[#172033] dark:text-white'>
                  工作台
                </h1>
                <p className='mt-2 max-w-2xl leading-6 text-slate-500'>
                  {session.fullName}，欢迎回来。这里汇总了站内公告和账户权限。
                </p>
              </div>
              <div className='grid gap-4 sm:grid-cols-3'>
                <StatCard
                  label='你的身份'
                  value={isAdmin ? '管理员' : '普通用户'}
                />
                <StatCard
                  label='公告'
                  value={`${announcements.length} 条`}
                  tone='green'
                />
                {isAdmin && (
                  <StatCard
                    label='注册用户'
                    value={`${users.length} 位`}
                    tone='amber'
                  />
                )}
              </div>
            </Tab.Panel>
            <Tab.Panel className='space-y-5'>
              <div className='border-b border-slate-200 pb-5 dark:border-slate-800'>
                <h1 className='text-3xl font-semibold tracking-[-0.025em] text-[#172033] dark:text-white'>
                  公告
                </h1>
                <p className='mt-2 max-w-2xl leading-6 text-slate-500'>
                  向已登录用户发布站内消息。
                </p>
              </div>
              <AnnouncementPanel
                isAdmin={isAdmin}
                announcements={announcements}
                reload={loadAnnouncements}
                notify={notify}
              />
            </Tab.Panel>
            {isAdmin && (
              <Tab.Panel>
                <UserPanel
                  users={users}
                  reload={loadUsers}
                  currentUserId={session.id}
                  notify={notify}
                />
              </Tab.Panel>
            )}
            <Tab.Panel className='space-y-5'>
              <div className='border-b border-slate-200 pb-5 dark:border-slate-800'>
                <h1 className='text-3xl font-semibold tracking-[-0.025em] text-[#172033] dark:text-white'>
                  账号与安全
                </h1>
                <p className='mt-2 max-w-2xl leading-6 text-slate-500'>
                  管理个人资料、登录方式和账户安全。
                </p>
              </div>
              <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900'>
                <UserProfile
                  routing='hash'
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      cardBox: 'w-full shadow-none',
                      card: 'w-full shadow-none'
                    }
                  }}
                />
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>
      <Toast toast={toast} dismiss={() => setToast(null)} />
    </main>
  )
}

export function AdminSignedOut() {
  return (
    <main className='grid min-h-screen place-items-center bg-slate-50 p-6'>
      <section className={`${panelClass} w-full max-w-md`}>
        <p className='font-semibold text-blue-600'>站点管理</p>
        <h1 className='mt-2 text-2xl font-semibold'>请先登录</h1>
        <p className='mt-3 text-slate-500'>
          登录后可查看公告、账户信息及相应权限的管理功能。
        </p>
        <SignInButton mode='modal'>
          <button className={`${buttonClass} mt-6`}>使用 Clerk 登录</button>
        </SignInButton>
        <Link
          href='/'
          className='ml-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600'
        >
          返回博客
        </Link>
      </section>
    </main>
  )
}
