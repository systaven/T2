import { useCallback, useEffect, useState } from 'react'

const panelClass =
  'rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900'
const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800'
const primaryButton =
  'rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

const title = (heading, description) => (
  <div className='border-b border-slate-200 pb-5 dark:border-slate-800'>
    <h1 className='text-3xl font-semibold tracking-[-0.025em] text-[#172033] dark:text-white'>
      {heading}
    </h1>
    <p className='mt-2 max-w-3xl leading-6 text-slate-500'>{description}</p>
  </div>
)

const Field = ({ label, hint, children }) => (
  <label className='block'>
    <span className='mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200'>
      {label}
    </span>
    {children}
    {hint && (
      <span className='mt-1.5 block text-xs leading-5 text-slate-500'>
        {hint}
      </span>
    )}
  </label>
)

const Toggle = ({ label, description, checked, onChange }) => (
  <label className='flex cursor-pointer items-start justify-between gap-4 rounded-md border border-slate-200 px-4 py-3 dark:border-slate-800'>
    <span>
      <span className='block text-sm font-medium'>{label}</span>
      {description && (
        <span className='mt-0.5 block text-xs leading-5 text-slate-500'>
          {description}
        </span>
      )}
    </span>
    <input
      type='checkbox'
      className='mt-1 h-4 w-4 accent-blue-600'
      checked={Boolean(checked)}
      onChange={event => onChange(event.target.checked)}
    />
  </label>
)

const getAt = (object, path) =>
  path.reduce((value, key) => value?.[key], object)
const setAt = (object, path, value) => {
  const output = structuredClone(object)
  let current = output
  path.slice(0, -1).forEach(key => {
    current[key] ||= {}
    current = current[key]
  })
  current[path.at(-1)] = value
  return output
}

const SettingInput = ({
  settings,
  setSettings,
  path,
  label,
  hint,
  type = 'text',
  ...props
}) => (
  <Field label={label} hint={hint}>
    <input
      {...props}
      className={inputClass}
      type={type}
      value={getAt(settings, path) ?? ''}
      onChange={event =>
        setSettings(current =>
          setAt(
            current,
            path,
            type === 'number' ? Number(event.target.value) : event.target.value
          )
        )
      }
    />
  </Field>
)

const SettingToggle = ({ settings, setSettings, path, ...props }) => (
  <Toggle
    {...props}
    checked={getAt(settings, path)}
    onChange={value => setSettings(current => setAt(current, path, value))}
  />
)

const SettingsSection = ({ title: sectionTitle, description, children }) => (
  <section className={panelClass}>
    <div className='border-b border-slate-100 pb-4 dark:border-slate-800'>
      <h2 className='text-lg font-semibold'>{sectionTitle}</h2>
      {description && (
        <p className='mt-1 text-sm leading-6 text-slate-500'>{description}</p>
      )}
    </div>
    <div className='mt-5 space-y-4'>{children}</div>
  </section>
)

export function CommentManagementPanel({ api, notify }) {
  const [comments, setComments] = useState([])
  const [status, setStatus] = useState('all')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api(
        `/api/admin/comments?limit=100&offset=0&status=${encodeURIComponent(status)}`
      )
      setComments(result.data || [])
      setTotal(result.total || 0)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [api, status])

  useEffect(() => {
    void load()
  }, [load])

  const changeStatus = async (comment, nextStatus) => {
    setBusyId(comment.id)
    try {
      await api('/api/admin/comments', {
        method: 'PATCH',
        body: JSON.stringify({ id: comment.id, status: nextStatus })
      })
      await load()
      notify(
        `评论已${nextStatus === 'visible' ? '显示' : nextStatus === 'hidden' ? '隐藏' : '移入回收状态'}。`
      )
    } catch (changeError) {
      notify(changeError.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  const remove = async comment => {
    if (!window.confirm('确定永久删除这条评论吗？此操作无法撤销。')) return
    setBusyId(comment.id)
    try {
      await api(`/api/admin/comments?id=${encodeURIComponent(comment.id)}`, {
        method: 'DELETE'
      })
      await load()
      notify('评论已永久删除。')
    } catch (removeError) {
      notify(removeError.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className='space-y-5'>
      {title('评论管理', '集中审核、隐藏、恢复或删除站内原生评论。')}
      <div
        className={`${panelClass} flex flex-wrap items-center justify-between gap-3`}
      >
        <div>
          <p className='font-medium'>评论列表</p>
          <p className='mt-1 text-sm text-slate-500'>当前筛选共 {total} 条</p>
        </div>
        <select
          className={`${inputClass} w-auto min-w-36`}
          value={status}
          onChange={event => setStatus(event.target.value)}
          aria-label='筛选评论状态'
        >
          <option value='all'>全部状态</option>
          <option value='visible'>公开</option>
          <option value='pending'>待审核</option>
          <option value='hidden'>已隐藏</option>
          <option value='spam'>垃圾评论</option>
          <option value='deleted'>已删除</option>
        </select>
      </div>
      {error ? (
        <div className={`${panelClass} border-l-4 border-l-amber-500`}>
          <p className='font-medium'>评论数据暂时无法读取</p>
          <p className='mt-1 text-sm text-slate-500'>{error}</p>
          <p className='mt-2 text-sm text-slate-500'>
            如果是首次使用，请先到“评论设置”初始化数据表。
          </p>
        </div>
      ) : loading ? (
        <div className={panelClass}>正在读取评论…</div>
      ) : comments.length === 0 ? (
        <div className={`${panelClass} text-center text-slate-500`}>
          这个筛选下还没有评论。
        </div>
      ) : (
        <div className='divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900'>
          {comments.map(comment => (
            <article className='p-5 sm:p-6' key={comment.id}>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='font-medium'>
                    {comment.authorName || '匿名访客'}
                    <span className='ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800'>
                      {comment.authorType === 'user' ? '登录用户' : '访客'}
                    </span>
                  </p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {comment.authorEmail || '未提供邮箱'} ·{' '}
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className='rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                  {comment.status}
                </span>
              </div>
              <p className='mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200'>
                {comment.content || '（内容已删除）'}
              </p>
              <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800'>
                {comment.href ? (
                  <a
                    className='max-w-full truncate font-medium text-blue-600 hover:underline'
                    href={comment.href}
                    target='_blank'
                    rel='noreferrer'
                  >
                    {comment.postTitle || comment.postId || '查看文章'}
                  </a>
                ) : (
                  <span className='text-slate-500'>
                    {comment.postTitle || comment.postId}
                  </span>
                )}
                {comment.status !== 'visible' && (
                  <button
                    disabled={busyId === comment.id}
                    className='font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400'
                    onClick={() => void changeStatus(comment, 'visible')}
                  >
                    显示
                  </button>
                )}
                {comment.status !== 'hidden' && (
                  <button
                    disabled={busyId === comment.id}
                    className='font-medium text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400'
                    onClick={() => void changeStatus(comment, 'hidden')}
                  >
                    隐藏
                  </button>
                )}
                {comment.status !== 'spam' && (
                  <button
                    disabled={busyId === comment.id}
                    className='font-medium text-slate-600 hover:underline disabled:opacity-50 dark:text-slate-300'
                    onClick={() => void changeStatus(comment, 'spam')}
                  >
                    标为垃圾
                  </button>
                )}
                <button
                  disabled={busyId === comment.id}
                  className='font-medium text-red-600 hover:underline disabled:opacity-50'
                  onClick={() => void remove(comment)}
                >
                  永久删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

const Channel = ({
  name,
  description,
  settings,
  setSettings,
  path,
  children
}) => (
  <details className='rounded-md border border-slate-200 open:bg-slate-50/60 dark:border-slate-800 dark:open:bg-slate-950/30'>
    <summary className='cursor-pointer list-none px-4 py-3 marker:hidden'>
      <div className='flex items-center justify-between gap-3'>
        <span>
          <span className='block text-sm font-medium'>{name}</span>
          <span className='mt-0.5 block text-xs text-slate-500'>
            {description}
          </span>
        </span>
        <input
          type='checkbox'
          className='h-4 w-4 accent-blue-600'
          checked={Boolean(getAt(settings, [...path, 'enabled']))}
          onClick={event => event.stopPropagation()}
          onChange={event =>
            setSettings(current =>
              setAt(current, [...path, 'enabled'], event.target.checked)
            )
          }
          aria-label={`启用 ${name}`}
        />
      </div>
    </summary>
    <div className='grid gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:grid-cols-2'>
      {children}
    </div>
  </details>
)

export function CommentSettingsPanel({ api, notify }) {
  const [schema, setSchema] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const schemaResult = await api('/api/admin/comments/schema')
      setSchema(schemaResult)
      if (schemaResult.ready) {
        const result = await api('/api/admin/comments/settings')
        setSettings(result.data)
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const initialize = async () => {
    setInitializing(true)
    try {
      await api('/api/admin/comments/schema', { method: 'POST' })
      await load()
      notify('评论数据表已初始化。')
    } catch (initializeError) {
      notify(initializeError.message, 'error')
    } finally {
      setInitializing(false)
    }
  }

  const save = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await api('/api/admin/comments/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      })
      setSettings(result.data)
      notify('评论设置已保存并立即生效。')
    } catch (saveError) {
      notify(saveError.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const testNotifications = async () => {
    setTesting(true)
    try {
      const result = await api('/api/admin/comments/settings', {
        method: 'POST',
        body: JSON.stringify({ settings })
      })
      const failed = Number(result.failed) || 0
      notify(
        failed
          ? `测试完成，但有 ${failed} 个通道发送失败。`
          : '测试通知已发送。',
        failed ? 'error' : 'success'
      )
    } catch (testError) {
      notify(testError.message, 'error')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className={panelClass}>正在读取评论配置…</div>

  if (!schema?.ready) {
    const missing = Object.entries(schema?.tables || {})
      .filter(([, exists]) => !exists)
      .map(([name]) => name)
    return (
      <div className='space-y-5'>
        {title(
          '评论设置',
          '启用原生评论前，需要先在现有 Appwrite 数据库中建立专用数据表。'
        )}
        <section className={`${panelClass} border-l-4 border-l-blue-600`}>
          <h2 className='text-lg font-semibold'>初始化评论系统</h2>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
            这个操作只会补齐缺少的评论数据表，不会修改文章、页面、友链或已有后台数据。
          </p>
          {missing.length > 0 && (
            <p className='mt-2 break-all text-xs text-slate-400'>
              待创建：{missing.join('、')}
            </p>
          )}
          {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}
          <button
            type='button'
            className={`${primaryButton} mt-5`}
            disabled={initializing}
            onClick={() => void initialize()}
          >
            {initializing ? '正在初始化…' : '一键初始化'}
          </button>
        </section>
      </div>
    )
  }

  if (!settings)
    return <div className={panelClass}>{error || '评论配置无法读取。'}</div>

  return (
    <form className='space-y-5' onSubmit={event => void save(event)}>
      {title(
        '评论设置',
        '前台行为、验证、图床和通知都在这里配置；敏感字段保存后只显示掩码。'
      )}
      <SettingsSection
        title='基本行为'
        description='控制评论入口、审核方式和访客编辑窗口。'
      >
        <SettingToggle
          settings={settings}
          setSettings={setSettings}
          path={['enabled']}
          label='启用原生评论'
          description='关闭后前台会显示暂停提示，但不会删除任何评论。'
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field label='发布方式'>
            <select
              className={inputClass}
              value={settings.moderationMode}
              onChange={event =>
                setSettings(current => ({
                  ...current,
                  moderationMode: event.target.value
                }))
              }
            >
              <option value='direct'>直接发布</option>
              <option value='review'>先审核后显示</option>
            </select>
          </Field>
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['pageSize']}
            label='每次加载数量'
            type='number'
            min='5'
            max='100'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['maxCommentLength']}
            label='评论字数上限'
            type='number'
            min='100'
            max='20000'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['guestEditMinutes']}
            label='访客可编辑分钟数'
            type='number'
            min='0'
            max='1440'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['rateLimitSeconds']}
            label='连续评论间隔（秒）'
            type='number'
            min='0'
            max='3600'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['emojiDataUrl']}
            label='OwO 表情数据地址'
            hint='可留空使用内置表情；支持 OwO/Artalk 常见 JSON 数据格式。'
            placeholder='https://…/owo.json'
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title='访客人机验证'
        description='登录用户自动跳过。开启后，访客发布评论和上传图片需要通过 Cloudflare Turnstile。'
      >
        <SettingToggle
          settings={settings}
          setSettings={setSettings}
          path={['turnstile', 'enabled']}
          label='启用 Turnstile'
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['turnstile', 'siteKey']}
            label='Site key'
            autoComplete='off'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['turnstile', 'secretKey']}
            label='Secret key'
            type='password'
            autoComplete='new-password'
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title='兰空图床'
        description='图片由本站服务端转发到 Lsky Pro，访问令牌不会下发给浏览器。'
      >
        <SettingToggle
          settings={settings}
          setSettings={setSettings}
          path={['imageUpload', 'enabled']}
          label='允许评论上传图片'
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['imageUpload', 'endpoint']}
            label='Lsky 地址'
            hint='例如 https://img.example.com；也可填写完整 /api/v1/upload 地址。'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['imageUpload', 'token']}
            label='API Token'
            type='password'
            autoComplete='new-password'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['imageUpload', 'strategyId']}
            label='储存策略 ID（可选）'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['imageUpload', 'albumId']}
            label='相册 ID（可选）'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['imageUpload', 'maxSizeMb']}
            label='单张图片上限（MB）'
            type='number'
            min='1'
            max='20'
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title='评论通知'
        description='可以同时开启多个通道。回复通知会在评论者填写邮箱时发送。'
      >
        <div className='grid gap-4 sm:grid-cols-2'>
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'adminEmail']}
            label='管理员收件邮箱'
            type='email'
          />
          <div className='space-y-3'>
            <SettingToggle
              settings={settings}
              setSettings={setSettings}
              path={['notifications', 'notifyAdmin']}
              label='新评论通知管理员'
            />
            <SettingToggle
              settings={settings}
              setSettings={setSettings}
              path={['notifications', 'notifyReplies']}
              label='回复时通知被回复者'
            />
          </div>
        </div>

        <Channel
          name='SMTP 邮件'
          description='使用现有邮箱服务商发送邮件'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'smtp']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'host']}
            label='服务器'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'port']}
            label='端口'
            type='number'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'user']}
            label='用户名'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'password']}
            label='密码 / 授权码'
            type='password'
            autoComplete='new-password'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'fromName']}
            label='发件人名称'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'fromEmail']}
            label='发件邮箱'
            type='email'
          />
          <SettingToggle
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'smtp', 'secure']}
            label='使用 TLS（通常为 465 端口）'
          />
        </Channel>

        <Channel
          name='Resend'
          description='通过 Resend API 发送邮件'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'resend']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'resend', 'apiKey']}
            label='API Key'
            type='password'
            autoComplete='new-password'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'resend', 'from']}
            label='发件人'
            hint='例如 Blog <comments@example.com>'
          />
        </Channel>

        <Channel
          name='Server 酱'
          description='通过 SendKey 推送'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'serverchan']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'serverchan', 'token']}
            label='SendKey'
            type='password'
            autoComplete='new-password'
          />
        </Channel>
        <Channel
          name='PushPlus'
          description='微信公众号消息推送'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'pushplus']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'pushplus', 'token']}
            label='Token'
            type='password'
            autoComplete='new-password'
          />
        </Channel>
        <Channel
          name='Telegram'
          description='机器人消息通知'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'telegram']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'telegram', 'botToken']}
            label='Bot Token'
            type='password'
            autoComplete='new-password'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'telegram', 'chatId']}
            label='Chat ID'
          />
        </Channel>
        <Channel
          name='Bark'
          description='iOS Bark 推送地址'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'bark']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'bark', 'endpoint']}
            label='完整推送地址'
          />
        </Channel>
        <Channel
          name='飞书'
          description='群机器人 Webhook'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'feishu']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'feishu', 'webhook']}
            label='Webhook URL'
          />
        </Channel>
        <Channel
          name='钉钉'
          description='群机器人 Webhook'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'dingtalk']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'dingtalk', 'webhook']}
            label='Webhook URL'
          />
        </Channel>
        <Channel
          name='企业微信'
          description='群机器人 Webhook'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'wecom']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'wecom', 'webhook']}
            label='Webhook URL'
          />
        </Channel>
        <Channel
          name='自定义 Webhook'
          description='向任意兼容地址发送 JSON'
          settings={settings}
          setSettings={setSettings}
          path={['notifications', 'webhook']}
        >
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'webhook', 'url']}
            label='Webhook URL'
          />
          <SettingInput
            settings={settings}
            setSettings={setSettings}
            path={['notifications', 'webhook', 'bearerToken']}
            label='Bearer Token（可选）'
            type='password'
            autoComplete='new-password'
          />
        </Channel>
      </SettingsSection>

      <div className='sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95'>
        <p className='text-sm text-slate-500'>
          修改不会写入环境变量，保存后直接生效。
        </p>
        <div className='flex gap-3'>
          <button
            type='button'
            className={secondaryButton}
            disabled={testing || saving}
            onClick={() => void testNotifications()}
          >
            {testing ? '测试中…' : '测试通知'}
          </button>
          <button
            type='submit'
            className={primaryButton}
            disabled={saving || testing}
          >
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      </div>
    </form>
  )
}
