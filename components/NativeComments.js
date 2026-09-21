import {
  IconCheck,
  IconHeart,
  IconLoader2,
  IconMessageCircle2,
  IconMoodSmile,
  IconPhoto,
  IconPencil,
  IconSend,
  IconTrash,
  IconX
} from '@tabler/icons-react'
import { useAuth, useUser } from '@clerk/nextjs'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import styles from './NativeComments.module.css'

const PROFILE_KEY = 'native-comment-profile'
const TOKEN_KEY = 'native-comment-guest-token'
const builtinEmoji = {
  颜文字: [
    '|´・ω・)ノ',
    'ヾ(≧∇≦*)ゝ',
    '(☆ω☆)',
    '（╯‵□′）╯︵┴─┴',
    '(/ω＼)',
    '∠( ᐛ 」∠)＿',
    '→_→',
    '٩(ˊᗜˋ*)و',
    '(ฅ´ω`ฅ)',
    'Σ(っ °Д °;)っ',
    '╮(╯▽╰)╭',
    '＞﹏＜'
  ],
  Emoji: [
    '😀',
    '😂',
    '🥰',
    '😮',
    '🤔',
    '😭',
    '👍',
    '🎉',
    '❤️',
    '✨',
    '💡',
    '👀'
  ]
}

const makeGuestToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return `${crypto.randomUUID()}${crypto.randomUUID()}`
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

const getStoredIdentity = () => {
  if (typeof window === 'undefined')
    return { guestToken: '', profile: { name: '', email: '' } }
  let guestToken = window.localStorage.getItem(TOKEN_KEY)
  if (!guestToken) {
    guestToken = makeGuestToken()
    window.localStorage.setItem(TOKEN_KEY, guestToken)
  }
  try {
    return {
      guestToken,
      profile: {
        name: '',
        email: '',
        ...JSON.parse(window.localStorage.getItem(PROFILE_KEY) || '{}')
      }
    }
  } catch {
    return { guestToken, profile: { name: '', email: '' } }
  }
}

let turnstileLoader
const loadTurnstile = () => {
  if (typeof window === 'undefined')
    return Promise.reject(new Error('浏览器环境不可用'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileLoader) return turnstileLoader
  turnstileLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-native-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile), {
        once: true
      })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.nativeTurnstile = 'true'
    script.onload = () => resolve(window.turnstile)
    script.onerror = reject
    document.head.appendChild(script)
  })
  return turnstileLoader
}

const TurnstileWidget = forwardRef(function TurnstileWidget(
  { siteKey, onToken },
  ref
) {
  const container = useRef(null)
  const widgetId = useRef(null)
  const callback = useRef(onToken)
  callback.current = onToken

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetId.current && window.turnstile)
          window.turnstile.reset(widgetId.current)
        callback.current('')
      }
    }),
    []
  )

  useEffect(() => {
    let disposed = false
    loadTurnstile()
      .then(turnstile => {
        if (disposed || !container.current || !turnstile) return
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          action: 'comment',
          theme: 'auto',
          size: 'flexible',
          callback: token => callback.current(token),
          'expired-callback': () => callback.current(''),
          'error-callback': () => callback.current('')
        })
      })
      .catch(() => callback.current(''))
    return () => {
      disposed = true
      if (widgetId.current && window.turnstile)
        window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey])
  return <div ref={container} className={styles.turnstile} />
})

const parseOwo = data => {
  if (!data || typeof data !== 'object') return builtinEmoji
  if (Array.isArray(data)) {
    const groups = {}
    data.forEach((group, index) => {
      if (typeof group === 'string') return
      const name = group.name || `表情 ${index + 1}`
      groups[name] = (group.items || [])
        .map(item =>
          typeof item === 'string' ? item : item.val || item.icon || ''
        )
        .filter(Boolean)
    })
    return Object.keys(groups).length ? groups : builtinEmoji
  }
  const groups = {}
  Object.entries(data).forEach(([name, group]) => {
    groups[name] = (group?.container || [])
      .map(item => item?.icon || '')
      .filter(Boolean)
  })
  return Object.keys(groups).length ? groups : builtinEmoji
}

const emojiValue = value => {
  const image = String(value).match(/<img[^>]+src=["']([^"']+)["']/i)
  if (image?.[1] && /^https?:\/\//.test(image[1])) return `![](${image[1]})`
  return String(value).replace(/<[^>]+>/g, '')
}

const EmojiPicker = ({ groups, onPick }) => (
  <div className={styles.emojiPanel} role='dialog' aria-label='选择表情'>
    {Object.entries(groups).map(([name, items]) => (
      <div className={styles.emojiGroup} key={name}>
        <p className={styles.emojiGroupTitle}>{name}</p>
        <div className={styles.emojiGrid}>
          {items.map((item, index) => {
            const image = String(item).match(
              /<img[^>]+src=["']([^"']+)["']/i
            )?.[1]
            return (
              <button
                className={styles.emojiItem}
                key={`${name}-${index}`}
                type='button'
                onClick={() => onPick(emojiValue(item))}
              >
                {image && /^https?:\/\//.test(image) ? (
                  // OwO packs can point at arbitrary administrator-approved hosts.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt='' loading='lazy' />
                ) : (
                  emojiValue(item)
                )}
              </button>
            )
          })}
        </div>
      </div>
    ))}
  </div>
)

const Avatar = ({ src, name }) => (
  <span className={styles.avatar} aria-hidden='true'>
    {src ? (
      // Clerk and guest avatar hosts are not known at build time.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt='' loading='lazy' />
    ) : (
      String(name || '?')
        .slice(0, 1)
        .toUpperCase()
    )}
  </span>
)

const relativeTime = value => {
  const date = new Date(value)
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return formatter.format(days, 'day')
  return date.toLocaleDateString('zh-CN')
}

function NativeCommentsCore({
  frontMatter,
  clerkUser,
  clerkLoaded = true,
  getToken
}) {
  const [config, setConfig] = useState(null)
  const [comments, setComments] = useState([])
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState(null)
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [guestToken, setGuestToken] = useState('')
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiGroups, setEmojiGroups] = useState(builtinEmoji)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [preview, setPreview] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [reactions, setReactions] = useState({ counts: {}, selected: null })
  const turnstileRef = useRef(null)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)
  const postId = String(frontMatter?.id || frontMatter?.slug || '')

  const api = useCallback(
    async (url, options = {}) => {
      const token = getToken ? await getToken().catch(() => null) : null
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || '请求失败')
      return body
    },
    [getToken, guestToken]
  )

  useEffect(() => {
    const stored = getStoredIdentity()
    setGuestToken(stored.guestToken)
    setProfile(stored.profile)
  }, [])

  useEffect(() => {
    if (!config?.emojiDataUrl) return
    fetch(config.emojiDataUrl)
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error())
      )
      .then(data => setEmojiGroups(parseOwo(data)))
      .catch(() => setEmojiGroups(builtinEmoji))
  }, [config?.emojiDataUrl])

  const loadComments = useCallback(
    async ({ append = false, cursor = '' } = {}) => {
      if (!postId || !guestToken) return
      setLoading(true)
      try {
        const query = new URLSearchParams({
          postId,
          sort,
          limit: String(config?.pageSize || 30)
        })
        if (cursor) query.set('cursor', cursor)
        const result = await api(`/api/comments?${query.toString()}`)
        setComments(current =>
          append ? [...current, ...(result.data || [])] : result.data || []
        )
        setTotal(result.total || 0)
        setNextCursor(result.nextCursor || null)
        setMessage(null)
      } catch (error) {
        setMessage({ type: 'error', text: error.message })
      } finally {
        setLoading(false)
      }
    },
    [api, config?.pageSize, guestToken, postId, sort]
  )

  const loadReactions = useCallback(async () => {
    if (!postId || !guestToken) return
    try {
      const result = await api(
        `/api/comments/reactions?postId=${encodeURIComponent(postId)}`
      )
      setReactions(result)
    } catch {
      // Reactions are optional; a missing table must not hide the comment form.
    }
  }, [api, guestToken, postId])

  useEffect(() => {
    if (!guestToken) return
    api('/api/comments/config')
      .then(result => setConfig(result.data))
      .catch(error => setMessage({ type: 'error', text: error.message }))
  }, [api, guestToken])

  useEffect(() => {
    if (!config || !guestToken) return
    void loadComments()
    void loadReactions()
  }, [config, guestToken, sort, loadComments, loadReactions])

  const saveProfile = next => {
    setProfile(next)
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
  }

  const resetChallenge = () => {
    setTurnstileToken('')
    turnstileRef.current?.reset()
  }

  const submit = async event => {
    event.preventDefault()
    setSending(true)
    setMessage(null)
    try {
      const result = await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          postId,
          postTitle: frontMatter?.title || '',
          href: window.location.href.split('#')[0],
          parentId: replyTo?.id || '',
          content,
          authorName: profile.name,
          authorEmail: profile.email,
          guestToken,
          turnstileToken
        })
      })
      if (!clerkUser)
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
      setContent('')
      setReplyTo(null)
      setPreviewOpen(false)
      setMessage({
        type: 'success',
        text: result.pending ? '评论已提交，等待审核。' : '评论已发布。'
      })
      resetChallenge()
      await loadComments()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
      resetChallenge()
    } finally {
      setSending(false)
    }
  }

  const toggleReaction = async reaction => {
    try {
      const result = await api('/api/comments/reactions', {
        method: 'PUT',
        body: JSON.stringify({ postId, reaction, guestToken })
      })
      setReactions(result)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const toggleLike = async comment => {
    try {
      const result = await api(`/api/comments/${comment.id}/like`, {
        method: 'POST',
        body: JSON.stringify({ guestToken })
      })
      setComments(current =>
        current.map(item =>
          item.id === comment.id ? { ...item, ...result } : item
        )
      )
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const saveEdit = async comment => {
    try {
      const result = await api(`/api/comments/${comment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editContent, guestToken })
      })
      setComments(current =>
        current.map(item => (item.id === comment.id ? result.data : item))
      )
      setEditing(null)
      setMessage({ type: 'success', text: '评论已更新。' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const removeComment = async comment => {
    if (!window.confirm('确定删除这条评论吗？回复关系会被保留。')) return
    try {
      const result = await api(`/api/comments/${comment.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ guestToken })
      })
      setComments(current =>
        current.map(item => (item.id === comment.id ? result.data : item))
      )
      setMessage({ type: 'success', text: '评论已删除。' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const showPreview = async () => {
    if (previewOpen) return setPreviewOpen(false)
    try {
      const result = await api('/api/comments/preview', {
        method: 'POST',
        body: JSON.stringify({ content })
      })
      setPreview(result.html)
      setPreviewOpen(true)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const insertAtCursor = value => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? content.length
    const end = textarea?.selectionEnd ?? content.length
    setContent(
      current => `${current.slice(0, start)}${value}${current.slice(end)}`
    )
    setEmojiOpen(false)
    window.setTimeout(() => textarea?.focus(), 0)
  }

  const uploadImage = async file => {
    if (!file) return
    setSending(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await api('/api/comments/upload', {
        method: 'POST',
        body: JSON.stringify({ dataUrl, guestToken, turnstileToken })
      })
      insertAtCursor(`\n![图片](${result.url})\n`)
      resetChallenge()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
      resetChallenge()
    } finally {
      setSending(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const byId = useMemo(
    () => new Map(comments.map(comment => [comment.id, comment])),
    [comments]
  )
  const threads = useMemo(() => {
    const roots = comments.filter(
      comment =>
        !comment.parentId ||
        (!byId.has(comment.parentId) && !byId.has(comment.rootId))
    )
    return roots.map(root => ({
      root,
      replies: comments.filter(
        comment =>
          comment.parentId &&
          (comment.rootId === root.id || comment.parentId === root.id)
      )
    }))
  }, [byId, comments])

  const renderCommentItem = (comment, nested = false) => {
    const parent = comment.parentId ? byId.get(comment.parentId) : null
    return (
      <article
        className={styles.comment}
        id={`comment-${comment.id}`}
        key={comment.id}
      >
        <Avatar src={comment.authorAvatar} name={comment.authorName} />
        <div className={styles.commentBody}>
          <header className={styles.commentHeader}>
            <span className={styles.author}>{comment.authorName}</span>
            {comment.authorType === 'clerk' && (
              <span className={styles.badge}>已登录</span>
            )}
            {nested && parent && (
              <span className={styles.time}>回复 {parent.authorName}</span>
            )}
            <time
              className={styles.time}
              title={new Date(comment.createdAt).toLocaleString()}
            >
              {relativeTime(comment.createdAt)}
            </time>
            {comment.edited && <span className={styles.time}>已编辑</span>}
          </header>
          {comment.status === 'deleted' ? (
            <p className={`${styles.content} ${styles.deleted}`}>
              这条评论已被删除
            </p>
          ) : editing === comment.id ? (
            <div>
              <textarea
                className={styles.textarea}
                value={editContent}
                onChange={event => setEditContent(event.target.value)}
              />
              <div className={styles.actions}>
                <button type='button' onClick={() => void saveEdit(comment)}>
                  <IconCheck size={15} /> 保存
                </button>
                <button type='button' onClick={() => setEditing(null)}>
                  <IconX size={15} /> 取消
                </button>
              </div>
            </div>
          ) : (
            <div
              className={styles.content}
              dangerouslySetInnerHTML={{ __html: comment.html }}
            />
          )}
          {comment.status !== 'deleted' && editing !== comment.id && (
            <div className={styles.actions}>
              <button
                type='button'
                onClick={() => {
                  setReplyTo(comment)
                  textareaRef.current?.focus()
                }}
              >
                <IconMessageCircle2 size={14} /> 回复
              </button>
              <button type='button' onClick={() => void toggleLike(comment)}>
                <IconHeart
                  size={14}
                  fill={comment.liked ? 'currentColor' : 'none'}
                />{' '}
                {comment.likes || 0}
              </button>
              {comment.canManage && (
                <button
                  type='button'
                  onClick={() => {
                    setEditing(comment.id)
                    setEditContent(comment.content)
                  }}
                >
                  <IconPencil size={14} /> 编辑
                </button>
              )}
              {comment.canManage && (
                <button
                  type='button'
                  onClick={() => void removeComment(comment)}
                >
                  <IconTrash size={14} /> 删除
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    )
  }

  if (!config && message?.type === 'error')
    return <div className={styles.empty}>{message.text}</div>
  if (!config)
    return (
      <div className={`${styles.root} ${styles.loading}`}>正在载入讨论区…</div>
    )
  if (!config.enabled)
    return <div className={styles.empty}>评论区目前暂停开放。</div>
  const needsTurnstile = !clerkUser && config.turnstile?.enabled
  const identityLoading = Boolean(getToken && !clerkLoaded)
  const canSubmit =
    content.trim() &&
    !identityLoading &&
    (!needsTurnstile || turnstileToken) &&
    !sending

  return (
    <section className={styles.root} aria-label='评论区'>
      <div className={styles.reactionPanel}>
        <p className={styles.reactionTitle}>你对此文章感觉如何？</p>
        <div className={styles.reactions}>
          {(config.reactions || []).map(item => (
            <button
              type='button'
              className={`${styles.reaction} ${reactions.selected === item.id ? styles.reactionActive : ''}`}
              aria-pressed={reactions.selected === item.id}
              key={item.id}
              onClick={() => void toggleReaction(item.id)}
            >
              <span className={styles.reactionEmoji}>{item.emoji}</span>
              <span className={styles.reactionMeta}>
                {item.label} {reactions.counts?.[item.id] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.heading}>
        <h3>
          参与讨论 <span className={styles.time}>· {total} 条</span>
        </h3>
        <div className={styles.sort} aria-label='评论排序'>
          {[
            ['latest', '最新'],
            ['oldest', '最早'],
            ['hottest', '最热']
          ].map(([value, label]) => (
            <button
              className={sort === value ? styles.sortActive : ''}
              type='button'
              key={value}
              onClick={() => setSort(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={event => void submit(event)}>
        <div className={styles.identity}>
          <Avatar
            src={clerkUser?.imageUrl}
            name={clerkUser?.fullName || profile.name}
          />
          <div className={styles.identityText}>
            <p className={styles.identityName}>
              {clerkUser
                ? clerkUser.fullName || clerkUser.username || '已登录用户'
                : profile.name || '访客评论'}
            </p>
            <p className={styles.identityHint}>
              {clerkUser
                ? '使用登录身份发布，无需人机验证'
                : '昵称和邮箱会保存在这台设备，邮箱不会公开'}
            </p>
          </div>
        </div>
        {!clerkUser && (
          <div className={styles.guestFields}>
            <input
              className={styles.input}
              maxLength={100}
              required
              placeholder='昵称'
              value={profile.name}
              onChange={event =>
                saveProfile({ ...profile, name: event.target.value })
              }
            />
            <input
              className={styles.input}
              type='email'
              maxLength={320}
              required
              placeholder='邮箱（不会公开）'
              value={profile.email}
              onChange={event =>
                saveProfile({ ...profile, email: event.target.value })
              }
            />
          </div>
        )}
        {replyTo && (
          <div className={styles.replyTarget}>
            <span>回复 {replyTo.authorName}</span>
            <button
              className={styles.iconButton}
              type='button'
              onClick={() => setReplyTo(null)}
              aria-label='取消回复'
            >
              <IconX size={16} />
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          maxLength={config.maxCommentLength}
          required
          placeholder='友善交流，留下你的想法…'
          value={content}
          onChange={event => setContent(event.target.value)}
        />
        {previewOpen && (
          <div
            className={`${styles.preview} ${styles.content}`}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        )}
        {needsTurnstile && config.turnstile.siteKey && (
          <TurnstileWidget
            ref={turnstileRef}
            siteKey={config.turnstile.siteKey}
            onToken={setTurnstileToken}
          />
        )}
        {needsTurnstile && !config.turnstile.siteKey && (
          <p className={styles.message} role='alert'>
            人机验证尚未配置完整，请联系站点管理员。
          </p>
        )}
        {message && (
          <p
            className={`${styles.message} ${message.type === 'success' ? styles.success : ''}`}
            role={message.type === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}
        <div className={styles.toolbar}>
          <div className={styles.tools}>
            <button
              className={styles.iconButton}
              type='button'
              aria-label='选择表情'
              aria-expanded={emojiOpen}
              onClick={() => setEmojiOpen(value => !value)}
            >
              <IconMoodSmile size={19} />
            </button>
            {emojiOpen && (
              <EmojiPicker groups={emojiGroups} onPick={insertAtCursor} />
            )}
            <input
              ref={fileRef}
              type='file'
              accept='image/png,image/jpeg,image/gif,image/webp'
              hidden
              onChange={event => void uploadImage(event.target.files?.[0])}
            />
            {config.imageUpload?.enabled && (
              <button
                className={styles.iconButton}
                type='button'
                disabled={sending || (needsTurnstile && !turnstileToken)}
                aria-label='上传图片'
                onClick={() => fileRef.current?.click()}
              >
                <IconPhoto size={19} />
              </button>
            )}
            <button
              className={styles.textButton}
              type='button'
              onClick={() => void showPreview()}
            >
              {previewOpen ? '关闭预览' : '预览'}
            </button>
          </div>
          <button className={styles.submit} type='submit' disabled={!canSubmit}>
            {sending ? (
              <IconLoader2 className='animate-spin' size={17} />
            ) : (
              <IconSend size={17} />
            )}{' '}
            {sending ? '发布中…' : '发布评论'}
          </button>
        </div>
      </form>

      <div className={styles.list} aria-live='polite'>
        {loading && comments.length === 0 ? (
          <div className={styles.loading}>正在载入评论…</div>
        ) : null}
        {!loading && threads.length === 0 ? (
          <div className={styles.empty}>还没有评论，来写下第一条吧。</div>
        ) : null}
        {threads.map(({ root, replies }) => (
          <div key={root.id}>
            {renderCommentItem(root)}
            {replies.length > 0 && (
              <div className={styles.children}>
                {replies.map(reply => renderCommentItem(reply, true))}
              </div>
            )}
          </div>
        ))}
        {nextCursor && (
          <button
            className={styles.loadMore}
            type='button'
            disabled={loading}
            onClick={() =>
              void loadComments({ append: true, cursor: nextCursor })
            }
          >
            {loading ? '载入中…' : '加载更多评论'}
          </button>
        )}
      </div>
    </section>
  )
}

function ClerkNativeComments({ frontMatter }) {
  const { isLoaded, user } = useUser()
  const { getToken } = useAuth()
  return (
    <NativeCommentsCore
      frontMatter={frontMatter}
      clerkUser={user}
      clerkLoaded={isLoaded}
      getToken={getToken}
    />
  )
}

export default function NativeComments({ frontMatter }) {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ClerkNativeComments frontMatter={frontMatter} />
  ) : (
    <NativeCommentsCore
      frontMatter={frontMatter}
      clerkUser={null}
      getToken={null}
    />
  )
}
