import Link from 'next/link'
import { useEffect, useState } from 'react'
import { WALLPAPER_SOURCES } from '@/lib/wallpapers/constants'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950'
const buttonClass =
  'rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'

export default function WallpaperSettingsPanel({ api, notify }) {
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [changed, setChanged] = useState(false)
  useEffect(() => {
    let active = true
    api('/api/admin/wallpapers')
      .then(body => {
        if (active) setSettings(body.data)
      })
      .catch(err => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [api])
  const update = (key, value) => {
    setSettings(current => ({ ...current, [key]: value }))
    setChanged(true)
  }
  const request = async action => {
    setBusy(action)
    try {
      const body = await api('/api/admin/wallpapers', {
        method: action === 'save' ? 'PUT' : 'POST',
        body: JSON.stringify({ settings })
      })
      if (action === 'save') {
        setSettings(body.data)
        setChanged(false)
        notify('壁纸墙设置已保存。')
      } else {
        notify(
          `连接成功，获取到 ${body.count} 幅作品。${body.fallback ? '主数据源不可用，已使用备用源。' : ''}`
        )
      }
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusy('')
    }
  }
  if (error)
    return (
      <div role='alert' className='rounded-lg bg-white p-6 dark:bg-slate-900'>
        <p>{error}</p>
        <button
          className={`${buttonClass} mt-4`}
          onClick={() => {
            setError('')
            api('/api/admin/wallpapers')
              .then(body => setSettings(body.data))
              .catch(err => setError(err.message))
          }}
        >
          重试加载
        </button>
      </div>
    )
  if (!settings)
    return (
      <p role='status' className='p-6'>
        正在加载壁纸墙设置…
      </p>
    )
  const field = (key, label, hint, type = 'text', options = {}) => (
    <label className='block'>
      <span className='mb-1.5 block text-sm font-medium'>{label}</span>
      <input
        {...options}
        aria-label={label}
        type={type}
        className={inputClass}
        value={settings[key]}
        onChange={event =>
          update(
            key,
            type === 'number' ? Number(event.target.value) : event.target.value
          )
        }
      />
      {hint && (
        <span className='mt-1.5 block text-xs leading-5 text-slate-500'>
          {hint}
        </span>
      )}
    </label>
  )
  const toggle = (key, label, hint) => (
    <label className='flex items-start justify-between gap-4 rounded-md border border-slate-200 p-4 dark:border-slate-700'>
      <span>
        <span className='block text-sm font-medium'>{label}</span>
        <span className='mt-1 block text-xs text-slate-500'>{hint}</span>
      </span>
      <input
        type='checkbox'
        aria-label={label}
        checked={settings[key]}
        onChange={event => update(key, event.target.checked)}
        className='mt-1 h-4 w-4 accent-blue-600'
      />
    </label>
  )
  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800'>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight'>壁纸墙</h1>
          <p className='mt-2 text-sm text-slate-500'>
            图片自动从精选图库与榜单获取，无需手动收图。
          </p>
        </div>
        <Link
          href='/image'
          target='_blank'
          className='text-sm text-blue-600 hover:underline'
        >
          查看壁纸墙
        </Link>
      </div>
      <form
        className='space-y-5'
        onSubmit={event => {
          event.preventDefault()
          void request('save')
        }}
      >
        <fieldset disabled={Boolean(busy)} className='space-y-5'>
          <section className='space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900'>
            {toggle(
              'enabled',
              '开放壁纸墙',
              '关闭后访客将看到暂未开放的提示。'
            )}
            <div className='grid gap-5 sm:grid-cols-2'>
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium'>
                  默认数据源
                </span>
                <select
                  className={inputClass}
                  value={settings.source}
                  onChange={event => update('source', event.target.value)}
                >
                  {Object.entries(WALLPAPER_SOURCES).map(([key, name]) => (
                    <option value={key} key={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium'>
                  备用数据源
                </span>
                <select
                  className={inputClass}
                  value={settings.fallbackSource}
                  onChange={event =>
                    update('fallbackSource', event.target.value)
                  }
                >
                  <option value='none'>关闭自动切换</option>
                  {Object.entries(WALLPAPER_SOURCES).map(([key, name]) => (
                    <option value={key} key={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {field(
                'pageSize',
                '每批展示数量',
                '12–48；社区接口单次数量不足时按实际返回数量展示。',
                'number',
                { min: 12, max: 48, required: true }
              )}
              {field(
                'maxPages',
                '最多加载批数',
                '1–10，控制每日上游调用次数。',
                'number',
                { min: 1, max: 10, required: true }
              )}
              {field(
                'cacheHours',
                '自动更新间隔（小时）',
                '1–72；同一批作品缓存后供所有访客共享。',
                'number',
                { min: 1, max: 72, required: true }
              )}
              {field(
                'proxy',
                '图片代理域名',
                '例如 i.pixiv.re，填写域名即可。',
                'text',
                { required: true }
              )}
              {field(
                'keyword',
                '图库关键词',
                '只用于社区精选图库；留空展示所有精选。'
              )}
            </div>
            <p className='text-xs leading-6 text-slate-500'>
              Anosu
              目前可能无法连接，建议设置备用源。更改设置会使用新的缓存；已缓存作品最长保留
              7 天供故障时使用。
            </p>
          </section>
          <section className='space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900'>
            <h2 className='text-lg font-semibold'>作品筛选</h2>
            {toggle(
              'excludeAI',
              '排除 AI 作品',
              '依据上游提供的 AI 标记筛选。'
            )}
            {toggle(
              'excludeLongImages',
              '排除超长图片',
              '过滤高宽比超过 2.4 或宽高比超过 3 的作品。'
            )}
            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium'>屏蔽标签</span>
              <textarea
                className={inputClass}
                rows={4}
                value={settings.blockedTags.join('\n')}
                onChange={event =>
                  update('blockedTags', event.target.value.split('\n'))
                }
              />
              <span className='mt-1.5 block text-xs leading-5 text-slate-500'>
                每行一个，匹配标签中的文字。系统始终过滤年龄限制标签；上游分类无法保证内容完全准确。
              </span>
            </label>
          </section>
        </fieldset>
        <div className='flex flex-wrap items-center gap-3'>
          <button
            type='submit'
            className={buttonClass}
            disabled={Boolean(busy)}
          >
            {busy === 'save' ? '保存中…' : '保存设置'}
          </button>
          <button
            type='button'
            className='rounded-md border border-slate-300 px-4 py-2.5 text-sm disabled:opacity-50 dark:border-slate-700'
            disabled={Boolean(busy)}
            onClick={() => void request('test')}
          >
            {busy === 'test' ? '测试中…' : '测试数据源'}
          </button>
          <span className='text-xs text-slate-500' role='status'>
            {changed ? '有尚未保存的修改' : '设置已同步'}
          </span>
        </div>
      </form>
    </div>
  )
}
