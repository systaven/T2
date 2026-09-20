import { Tab } from '@headlessui/react'
import { SignInButton, UserButton, UserProfile, useAuth } from '@clerk/nextjs'
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
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'
const buttonClass =
  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

const StatCard = ({ label, value, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100',
    green:
      'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100',
    amber: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100'
  }
  return (
    <article className={`rounded-2xl p-5 ${tones[tone]}`}>
      <p className='text-sm opacity-70'>{label}</p>
      <p className='mt-2 text-2xl font-semibold'>{value}</p>
    </article>
  )
}

const AnnouncementPanel = ({ isAdmin, announcements, reload }) => {
  const api = useAdminApi()
  const [form, setForm] = useState({ title: '', content: '', published: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const createAnnouncement = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      setForm({ title: '', content: '', published: true })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateAnnouncement = async (item, changes) => {
    setError('')
    try {
      await api(`/api/admin/announcements/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, ...changes })
      })
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteAnnouncement = async item => {
    if (!window.confirm(`确定删除公告“${item.title}”吗？`)) return
    try {
      await api(`/api/admin/announcements/${item.id}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      setError(err.message)
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
            <input
              className={inputClass}
              required
              maxLength={255}
              placeholder='公告标题'
              value={form.title}
              onChange={event =>
                setForm(current => ({ ...current, title: event.target.value }))
              }
            />
            <textarea
              className={inputClass}
              rows={5}
              placeholder='公告内容'
              value={form.content}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  content: event.target.value
                }))
              }
            />
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
      {error && (
        <p className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>{error}</p>
      )}
      {announcements.length === 0 ? (
        <div className={panelClass}>暂无公告。</div>
      ) : (
        announcements.map(item => (
          <article className={panelClass} key={item.id}>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h3 className='text-lg font-semibold'>{item.title}</h3>
                <p className='mt-1 text-xs text-slate-500'>
                  {new Date(item.$createdAt).toLocaleString()}
                </p>
              </div>
              {isAdmin && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${item.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {item.published ? '已发布' : '草稿'}
                </span>
              )}
            </div>
            <p className='mt-4 whitespace-pre-wrap text-slate-600 dark:text-slate-300'>
              {item.content || '（无正文）'}
            </p>
            {isAdmin && (
              <div className='mt-4 flex gap-3 text-sm'>
                <button
                  className='text-blue-600 hover:underline'
                  onClick={() =>
                    void updateAnnouncement(item, {
                      published: !item.published
                    })
                  }
                >
                  {item.published ? '转为草稿' : '发布'}
                </button>
                <button
                  className='text-red-600 hover:underline'
                  onClick={() => void deleteAnnouncement(item)}
                >
                  删除
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  )
}

const UserPanel = ({ users, reload }) => {
  const api = useAdminApi()
  const [error, setError] = useState('')
  const changeRole = async (user, role) => {
    setError('')
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      })
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <div className={panelClass}>
      <h2 className='text-lg font-semibold'>用户与权限</h2>
      {error && (
        <p className='mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700'>
          {error}
        </p>
      )}
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
                className='border-b border-slate-100 dark:border-slate-800'
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
                    value={user.role}
                    onChange={event =>
                      void changeRole(user, event.target.value)
                    }
                  >
                    <option value='user'>普通用户</option>
                    <option value='admin'>管理员</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const api = useAdminApi()
  const [session, setSession] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

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
  if (error)
    return (
      <main className='grid min-h-screen place-items-center bg-slate-50 p-6'>
        <div className={`${panelClass} max-w-lg`}>
          <h1 className='text-xl font-semibold'>后台暂时无法载入</h1>
          <p className='mt-3 text-red-600'>{error}</p>
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
    <main className='min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
      <header className='border-b bg-white dark:border-slate-800 dark:bg-slate-900'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-5 py-4'>
          <div>
            <p className='font-semibold'>站点管理</p>
            <p className='text-xs text-slate-500'>{session.email}</p>
          </div>
          <UserButton afterSignOutUrl='/' />
        </div>
      </header>
      <Tab.Group>
        <div className='mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_1fr]'>
          <Tab.List className='flex gap-2 overflow-x-auto lg:flex-col'>
            {tabs.map(tab => (
              <Tab as={Fragment} key={tab}>
                {({ selected }) => (
                  <button
                    className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-medium ${selected ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
                  >
                    {tab}
                  </button>
                )}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel className='space-y-5'>
              <div>
                <h1 className='text-2xl font-semibold'>
                  你好，{session.fullName}
                </h1>
                <p className='mt-1 text-slate-500'>
                  这里与博客主题和 Notion 内容完全独立。
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
            <Tab.Panel>
              <AnnouncementPanel
                isAdmin={isAdmin}
                announcements={announcements}
                reload={loadAnnouncements}
              />
            </Tab.Panel>
            {isAdmin && (
              <Tab.Panel>
                <UserPanel users={users} reload={loadUsers} />
              </Tab.Panel>
            )}
            <Tab.Panel>
              <UserProfile routing='hash' />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>
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
      </section>
    </main>
  )
}
