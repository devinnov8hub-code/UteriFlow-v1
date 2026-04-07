import { useState, useEffect, useCallback, useRef } from 'react'
import { Filter, MoreVertical, ThumbsUp, Share2, Send, X, ImagePlus, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../api'
import { PageHeader, Tabs, SearchInput, Btn, Avatar, Spinner, Empty, ConfirmModal, Dropdown } from '../components/UI'

const POST_TABS = [
  { value: 'flagged',        label: 'Flagged Posts'   },
  { value: 'community',     label: 'Community Posts' },
  { value: 'lifestyle_tips', label: 'Lifestyle Tips'  },
]

const COMPOSE_CATS = [
  { value: 'community',      label: 'Community Posts' },
  { value: 'lifestyle_tips', label: 'Lifestyle Tips'  },
  { value: 'discord',        label: 'Discord'         },
]

const chip = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
  fontWeight: 500, cursor: 'pointer', border: 'none',
  background: bg, color, fontFamily: 'inherit',
})

async function uploadToSupabase(file, token) {
  const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
  const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY
  const BUCKET           = 'post-images'

  if (!SUPABASE_URL) throw new Error('Add VITE_SUPABASE_URL to uteriflow-admin/.env')

  const ext  = file.name.split('.').pop().toLowerCase()
  const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON || '',
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: file,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 404 || err.error === 'Bucket not found') {
      throw new Error(`Storage bucket "${BUCKET}" not found. Go to Supabase → Storage → New bucket → name it "${BUCKET}" → set Public.`)
    }
    throw new Error(err.message || err.error || `Upload failed (${res.status})`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

function CommentItem({ comment, onDelete, onFlag, onUnflag, onBan }) {
  const name = comment.author?.display_name || comment.author?.email || 'Anonymous'
  const ago  = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    : ''

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--gray-50)' }}>
      <div style={{
        background: comment.is_flagged ? '#fffbeb' : 'transparent',
        borderLeft: comment.is_flagged ? '3px solid var(--yellow)' : 'none',
        borderRadius: comment.is_flagged ? '0 8px 8px 0' : 0,
        padding: comment.is_flagged ? '8px 10px' : 0,
      }}>
        {comment.is_flagged && (
          <span style={{ ...chip('#fef3c7', '#92400e'), marginBottom: '6px', display: 'inline-flex' }}>
            🚩 Flagged for review
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar name={name} size={28} />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>{name}</span>
              <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{ago}</span>
            </div>
          </div>
          <Dropdown
            trigger={
              <button style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}>
                <MoreVertical size={13} />
              </button>
            }
            items={[
              { icon: '🗑', label: 'Delete comment',  onClick: () => onDelete(comment.id),              danger: true },
              comment.is_flagged
                ? { icon: '🏳️', label: 'Unflag comment', onClick: () => onUnflag(comment.id) }
                : { icon: '🚩', label: 'Flag comment',   onClick: () => onFlag(comment.id)   },
              '---',
              { icon: '⏱', label: 'Ban (7 days)',     onClick: () => onBan(comment.author_id, 7),       danger: true },
              { icon: '🚫', label: 'Ban permanently',  onClick: () => onBan(comment.author_id, null),   danger: true },
            ]}
          />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.55, marginBottom: '8px' }}>
          {comment.content}
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button style={chip('#e0f2fe', '#0369a1')}>
            <ThumbsUp size={11} /> {comment.likes_count || 0}
          </button>
          {!comment.is_flagged && (
            <button onClick={() => onFlag(comment.id)} style={chip('#fef3c7', '#92400e')}>
              🚩 Flag
            </button>
          )}
          <button onClick={() => onDelete(comment.id)} style={chip('#fee2e2', '#991b1b')}>
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function PostItem({ post, isSelected, onSelect, onDelete, onBan, onUnflag, onTogglePublish }) {
  const excerpt = post.content?.length > 180
    ? post.content.slice(0, 180) + '…'
    : post.content

  return (
    <div
      onClick={() => onSelect(post.id)}
      style={{
        borderBottom: '1px solid var(--gray-100)',
        padding: '20px',
        background: isSelected ? 'var(--purple-xpale)' : 'white',
        transition: 'background 0.15s',
        cursor: 'pointer',
      }}
    >
      {post.is_flagged && (
        <span style={{ ...chip('#fef3c7', '#92400e'), marginBottom: '10px', display: 'inline-flex' }}>
          🚩 Flagged
        </span>
      )}

      {post.image_url ? (
        <img src={post.image_url} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '14px', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '140px', background: 'linear-gradient(135deg, var(--purple-pale), #e0e7ff)', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
          🌸
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ ...chip('var(--purple-pale)', 'var(--purple)'), fontSize: '10px', textTransform: 'capitalize' }}>
          {post.category?.replace('_', ' ')}
        </span>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', lineHeight: 1.3 }}>{post.title}</h3>
      <p style={{ fontSize: '13px', color: 'var(--gray-500)', lineHeight: 1.6, marginBottom: '12px' }}>{excerpt}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--gray-400)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ThumbsUp size={12} /> {post.likes_count || 0}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Share2 size={12} /> {post.shares_count || 0}
          </span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <Dropdown
            trigger={
              <button style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--gray-100)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}>
                <MoreVertical size={15} />
              </button>
            }
            items={[
              { icon: '💬', label: 'View comments',                  onClick: () => onSelect(post.id)                                                          },
              { icon: post.is_published ? '🙈' : '✅', label: post.is_published ? 'Unpublish' : 'Publish', onClick: () => onTogglePublish(post.id, post.is_published) },
              post.is_flagged
                ? { icon: '🏳️', label: 'Unflag post',   onClick: () => onUnflag(post.id)                                       }
                : null,
              { icon: '🗑', label: 'Delete post',                    onClick: () => onDelete(post.id),             danger: true   },
              '---',
              { icon: '⏱', label: 'Ban author (7d)',                 onClick: () => onBan(post.author_id, 7),       danger: true   },
              { icon: '🚫', label: 'Ban permanently',                 onClick: () => onBan(post.author_id, null),   danger: true   },
            ].filter(Boolean)}
          />
        </div>
      </div>
    </div>
  )
}

function ComposeEditor({ onClose, onPosted }) {
  const [category, setCategory]       = useState('community')
  const [title, setTitle]             = useState('')
  const [content, setContent]         = useState('')
  const [imageFile, setImageFile]     = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [posting, setPosting]         = useState(false)
  const fileInputRef                  = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, GIF or WEBP images allowed'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submit() {
    if (!title.trim())   return toast.error('Title is required')
    if (!content.trim()) return toast.error('Content is required')

    setPosting(true)
    let image_url = undefined  

    try {
      if (imageFile) {
        setUploading(true)
        const token = localStorage.getItem('uf_token')
        try {
          image_url = await uploadToSupabase(imageFile, token)
          toast.success('Image uploaded ✓')
        } catch (uploadErr) {
      
          const msg = uploadErr.message || 'Image upload failed'
          toast.error(msg)
        
          setUploading(false)
          setPosting(false)
          return
        }
        setUploading(false)
      }

      const payload = { title, content, category }
      if (image_url) payload.image_url = image_url

      await api.createPost(payload)
      toast.success('Post published! ')
      onPosted()
      onClose()
    } catch (e) {
      toast.error(e.message || 'Failed to publish post')
    } finally {
      setPosting(false)
      setUploading(false)
    }
  }

  const isLoading = uploading || posting

  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', overflow: 'hidden', border: '1px solid var(--gray-100)' }}>
      {/* Purple header bar */}
      <div style={{ background: 'var(--purple)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {COMPOSE_CATS.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              style={{
                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: category === c.value ? 'white' : 'transparent',
                color: category === c.value ? 'var(--purple)' : 'rgba(255,255,255,0.85)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={isLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px',
            borderRadius: '6px', background: 'white', border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
            fontSize: '13px', fontFamily: 'inherit', color: 'var(--purple)',
            opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.15s',
          }}
        >
          {isLoading
            ? <><Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> {uploading ? 'Uploading…' : 'Publishing…'}</>
            : <><span>Publish</span> <Send size={12} /></>
          }
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px' }}>
        {/* Image preview */}
        {imagePreview && (
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
            <button
              onClick={removeImage}
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Toolbar row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          {/* Hidden file input — triggered by the label below */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
          />
          {/* Visible attach button — onClick fires the hidden input */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px',
              background: imageFile ? 'var(--purple-pale)' : 'var(--gray-100)',
              border: imageFile ? '1.5px solid var(--purple-light)' : '1.5px solid transparent',
              cursor: 'pointer', fontSize: '13px',
              color: imageFile ? 'var(--purple)' : 'var(--gray-600)',
              fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            <ImagePlus size={14} />
            {imageFile ? imageFile.name.slice(0, 20) + (imageFile.name.length > 20 ? '…' : '') : 'Attach image'}
          </button>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add a title…"
          style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--gray-100)', outline: 'none', fontSize: '17px', fontWeight: 600, fontFamily: 'inherit', color: 'var(--gray-900)', paddingBottom: '10px', marginBottom: '12px' }}
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write something for your community…"
          rows={4}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', fontFamily: 'inherit', color: 'var(--gray-700)', resize: 'vertical', lineHeight: 1.6, minHeight: '80px' }}
        />
      </div>
    </div>
  )
}

function CommentsPanel({ postId, onBan, isMobileOpen, onClose }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(false)
  const [total, setTotal]       = useState(0)
  const [replyText, setReplyText] = useState('')

  const load = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    try {
      const d = await api.getComments(postId)
      setComments(d.comments || [])
      setTotal(d.pagination?.total || 0)
    } catch (e) {
      toast.error(e.message || 'Failed to load comments')
    } finally { setLoading(false) }
  }, [postId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    try { await api.deleteComment(id); toast.success('Comment deleted'); load() }
    catch (e) { toast.error(e.message || 'Failed to delete') }
  }
  async function handleFlag(id) {
    try { await api.flagComment(id); toast.success('Comment flagged'); load() }
    catch (e) { toast.error(e.message || 'Failed to flag') }
  }
  async function handleUnflag(id) {
    try { await api.unflagComment(id); toast.success('Comment unflagged'); load() }
    catch (e) { toast.error(e.message || 'Failed to unflag') }
  }

  const inner = (
    <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Comments</h3>
          <span style={{ background: 'var(--purple)', color: 'white', borderRadius: '20px', fontSize: '11px', fontWeight: 600, padding: '2px 8px' }}>{total}</span>
        </div>
        <button className="mobile-panel-close" onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '6px', display: 'none', color: 'var(--gray-600)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px' }}>
        {!postId     && <Empty icon="💬" message="Select a post to view its comments" />}
        {postId && loading  && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>}
        {postId && !loading && comments.length === 0 && <Empty icon="💬" message="No comments yet" />}
        {postId && !loading && comments.map(c => (
          <CommentItem
            key={c.id}
            comment={c}
            onDelete={handleDelete}
            onFlag={handleFlag}
            onUnflag={handleUnflag}
            onBan={onBan}
          />
        ))}
      </div>

      {/* Reply box — only when a post is selected */}
      {postId && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a comment as admin…"
            style={{ flex: 1, padding: '9px 14px', border: '1.5px solid var(--gray-200)', borderRadius: '20px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && toast('Admin comments require user auth flow', { icon: 'ℹ️' })}
          />
          <button
            onClick={() => toast('Admin comments require user auth flow', { icon: 'ℹ️' })}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--purple)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        .mobile-panel-close { display: none !important; }
        .comments-mobile-overlay { display: none; }
        @media(max-width: 900px) {
          .mobile-panel-close { display: flex !important; }
          .comments-mobile-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.4); z-index: 400;
            display: flex; align-items: flex-end;
            backdrop-filter: blur(2px);
          }
          .comments-mobile-sheet {
            width: 100%; max-height: 85vh;
            border-radius: 20px 20px 0 0;
            overflow: hidden; display: flex; flex-direction: column;
          }
        }
      `}</style>

      {/* Desktop — always visible in grid */}
      <div className="comments-panel-desktop" style={{ height: 'calc(100vh - 140px)', position: 'sticky', top: '32px' }}>
        {inner}
      </div>

      {/* Mobile — bottom sheet */}
      {isMobileOpen && (
        <div className="comments-mobile-overlay" onClick={onClose}>
          <div className="comments-mobile-sheet" onClick={e => e.stopPropagation()}>
            {inner}
          </div>
        </div>
      )}

      <style>{`
        .comments-panel-desktop { display: block; }
        @media(max-width: 900px) { .comments-panel-desktop { display: none; } }
      `}</style>
    </>
  )
}

export default function ContentPage() {
  const [tab, setTab]                     = useState('community')
  const [search, setSearch]               = useState('')
  const [posts, setPosts]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [selectedPostId, setSelected]     = useState(null)
  const [showCompose, setShowCompose]     = useState(false)
  const [mobileComments, setMobileComments] = useState(false)

  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [deleting, setDeleting]           = useState(false)
  const [banTarget, setBanTarget]         = useState(null)
  const [banning, setBanning]             = useState(false)

  const timer = useRef(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 20 }
      if (tab === 'flagged') {
        params.category = 'flagged'
      } else {
        params.category = tab
      }
      if (search.trim()) params.search = search.trim()
      const d = await api.getPosts(params)
      setPosts(d.posts || [])
    } catch (e) {
      toast.error(e.message || 'Failed to load posts')
    } finally { setLoading(false) }
  }, [tab, search])

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(loadPosts, 300)
    return () => clearTimeout(timer.current)
  }, [loadPosts])

  function selectPost(id) {
    setSelected(id)
    setMobileComments(true)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deletePost(deleteTarget)
      toast.success('Post deleted')
      setDeleteTarget(null)
      if (selectedPostId === deleteTarget) { setSelected(null); setMobileComments(false) }
      loadPosts()
    } catch (e) { toast.error(e.message || 'Failed to delete') }
    finally { setDeleting(false) }
  }

  async function handleBan() {
    setBanning(true)
    try {
      await api.banUser(banTarget.userId, {
        ban_type: banTarget.days ? 'temporary' : 'permanent',
        days: banTarget.days || undefined,
        reason: 'Inappropriate content / admin action',
      })
      toast.success(banTarget.days ? `Banned for ${banTarget.days} days` : 'Permanently banned')
      setBanTarget(null)
    } catch (e) { toast.error(e.message || 'Ban failed') }
    finally { setBanning(false) }
  }

  async function handleUnflagPost(id) {
    try {
      await api.updatePost(id, { is_flagged: false })
      toast.success('Post unflagged')
      loadPosts()
    } catch (e) { toast.error(e.message || 'Failed to unflag post') }
  }

  async function handleTogglePublish(id, currentlyPublished) {
    try {
      await api.updatePost(id, { is_published: !currentlyPublished })
      toast.success(currentlyPublished ? 'Post unpublished' : 'Post published')
      loadPosts()
    } catch (e) { toast.error(e.message || 'Failed to update post') }
  }

  return (
    <div>
      <style>{`
        .content-grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
        .mobile-comments-btn { display: none; }
        @media(max-width: 900px) {
          .content-grid { grid-template-columns: 1fr; }
          .mobile-comments-btn { display: flex !important; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <PageHeader title="Manage Content" subtitle="Create posts, manage comments and moderate your community." />
        <button
          className="mobile-comments-btn"
          onClick={() => setMobileComments(true)}
          style={{ display: 'none', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--purple)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          💬 {selectedPostId ? 'View Comments' : 'Comments'}
        </button>
      </div>

      <div className="content-grid">
        {/* ── Left: Posts ── */}
        <div>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search posts by title or content…" />
          </div>

          {/* Compose toggle */}
          <div
            onClick={() => setShowCompose(s => !s)}
            style={{
              background: showCompose ? 'var(--purple-mid)' : 'var(--purple)',
              borderRadius: '10px', padding: '13px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '14px', cursor: 'pointer', transition: 'background 0.15s', userSelect: 'none',
            }}
          >
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              ✏️ Make a post
            </span>
            <span style={{ color: 'white', fontSize: '22px', lineHeight: 1 }}>{showCompose ? '−' : '+'}</span>
          </div>

          {showCompose && (
            <ComposeEditor
              onClose={() => setShowCompose(false)}
              onPosted={() => { loadPosts(); setTab('community') }}
            />
          )}

          {/* Tabs */}
          <div style={{ overflowX: 'auto', marginBottom: '16px', paddingBottom: '2px' }}>
            <Tabs tabs={POST_TABS} active={tab} onChange={t => { setTab(t); setSelected(null) }} />
          </div>

          {/* Posts list */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <Spinner />
            </div>
          ) : posts.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <Empty
                icon={tab === 'flagged' ? '🚩' : tab === 'lifestyle_tips' ? '🌿' : '📝'}
                message={search ? `No posts found for "${search}"` : `No ${tab === 'flagged' ? 'flagged' : tab.replace('_', ' ')} posts yet`}
              />
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              {posts.map(p => (
                <PostItem
                  key={p.id}
                  post={p}
                  isSelected={selectedPostId === p.id}
                  onSelect={selectPost}
                  onDelete={setDeleteTarget}
                  onBan={(uid, d) => setBanTarget({ userId: uid, days: d })}
                  onUnflag={handleUnflagPost}
                  onTogglePublish={handleTogglePublish}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Comments ── */}
        <CommentsPanel
          postId={selectedPostId}
          onBan={(uid, d) => setBanTarget({ userId: uid, days: d })}
          isMobileOpen={mobileComments}
          onClose={() => setMobileComments(false)}
        />
      </div>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Post"
        icon="🗑️"
        confirmLabel="Delete Post"
        description="This will permanently delete the post and all its comments. This cannot be undone."
      />

      {/* Ban confirm */}
      <ConfirmModal
        open={!!banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={handleBan}
        loading={banning}
        title={banTarget?.days ? `Ban User for ${banTarget.days} days` : 'Ban User Permanently'}
        icon="🚫"
        confirmLabel="Confirm Ban"
        description={banTarget?.days
          ? `This will restrict the user's access for ${banTarget.days} days.`
          : "This will permanently remove the user's access to the platform."}
      />
    </div>
  )
}
