import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, Plus, Search, Trash2, Pencil, Eye, EyeOff, X, UploadCloud, Link2, Loader2, ImageIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../api'
import { PageHeader, Card, Spinner, Empty, ConfirmModal, Badge, Btn } from '../components/UI'

const PAGE = 50
const CATEGORIES = ['Daily Habits', 'Stress Management', 'Cycle Care']

const emptyDraft = {
  title: '', summary: '', content: '',
  category: 'Daily Habits', readTime: 4, imageUrl: '', isPublished: true,
}

export default function ArticlesPage() {
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('all')      // all | published | draft
  const [offset,  setOffset]  = useState(0)

  const [editor,  setEditor]  = useState(null)        // draft object or null
  const [saving,  setSaving]  = useState(false)
  const [pending, setPending] = useState(null)        // { id, title } for delete confirm

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getArticles({
        limit: PAGE, offset,
        search: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
      })
      setItems(res?.articles ?? [])
      setTotal(res?.pagination?.total ?? 0)
    } catch (e) {
      toast.error(e.message || 'Failed to load articles')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [offset, search, status])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => setOffset(0), 250)
    return () => clearTimeout(t)
  }, [search, status])

  // ── Create / edit ──────────────────────────────────────────────
  const openCreate = () => setEditor({ ...emptyDraft })

  const openEdit = async (id) => {
    try {
      const res = await api.getArticle(id)
      const a = res?.article
      if (!a) throw new Error('Article not found')
      setEditor({
        id: a.id,
        title: a.title ?? '',
        summary: a.summary ?? '',
        content: a.content ?? '',
        category: a.category ?? 'Daily Habits',
        readTime: a.read_time ?? 4,
        imageUrl: a.image_url ?? '',
        isPublished: a.is_published ?? true,
      })
    } catch (e) {
      toast.error(e.message || 'Could not open article')
    }
  }

  const saveEditor = async () => {
    if (!editor.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = {
        title: editor.title.trim(),
        summary: editor.summary?.trim() || null,
        content: editor.content ?? '',
        category: editor.category,
        readTime: Number(editor.readTime) || 4,
        imageUrl: editor.imageUrl?.trim() || null,
        isPublished: !!editor.isPublished,
      }
      if (editor.id) {
        await api.updateArticle(editor.id, payload)
        toast.success('Article updated')
      } else {
        await api.createArticle(payload)
        toast.success('Article published')
      }
      setEditor(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Failed to save article')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (a) => {
    try {
      await api.updateArticle(a.id, { isPublished: !a.is_published })
      toast.success(a.is_published ? 'Moved to draft' : 'Published')
      load()
    } catch (e) {
      toast.error(e.message || 'Failed to update')
    }
  }

  const confirmDelete = async () => {
    if (!pending) return
    try {
      await api.deleteArticle(pending.id)
      toast.success('Article deleted')
      setPending(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Failed to delete article')
    }
  }

  return (
    <div>
      <PageHeader
        title="Articles"
        subtitle="Health-education articles shown on the landing page and the app. Publishing makes an article public immediately."
      />

      {/* Toolbar */}
      <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap', marginBottom:'20px', marginTop:'24px' }}>
        <div style={{ position:'relative', flex:'1 1 260px', maxWidth:'400px' }}>
          <Search size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title…"
            style={{
              width:'100%', padding:'10px 14px 10px 36px',
              border:'1.5px solid var(--gray-200)', borderRadius:'8px',
              fontSize:'14px', outline:'none', background:'white', fontFamily:'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
          />
        </div>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{
            padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'8px',
            fontSize:'14px', background:'white', fontFamily:'inherit', color:'var(--gray-700)', cursor:'pointer',
          }}
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>

        <Btn onClick={openCreate} style={{ marginLeft:'auto' }}>
          <Plus size={15} /> New article
        </Btn>
      </div>

      {/* Table */}
      <Card style={{ padding:'0', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'48px', display:'flex', justifyContent:'center' }}><Spinner /></div>
        ) : items.length === 0 ? (
          <div style={{ padding:'48px' }}>
            <Empty icon="📚" message={search ? 'No matching articles.' : 'No articles yet. Create your first one.'} />
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', borderBottom:'1px solid var(--gray-200)' }}>
                  <th style={th}>Title</th>
                  <th style={th}>Category</th>
                  <th style={th}>Status</th>
                  <th style={th}>Updated</th>
                  <th style={{ ...th, textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                    <td style={td}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={iconCircle}><BookOpen size={14} color="var(--purple)" /></div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--gray-900)' }}>{a.title}</div>
                          {a.summary && <div style={{ fontSize:'12px', color:'var(--gray-500)', marginTop:'2px', maxWidth:'420px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.summary}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={td}><Badge color="gray">{a.category}</Badge></td>
                    <td style={td}>
                      {a.is_published
                        ? <Badge color="green">Published</Badge>
                        : <Badge color="yellow">Draft</Badge>}
                    </td>
                    <td style={{ ...td, color:'var(--gray-500)' }}>
                      {a.updated_at ? formatDistanceToNow(new Date(a.updated_at), { addSuffix:true }) : '—'}
                    </td>
                    <td style={{ ...td, textAlign:'right', whiteSpace:'nowrap' }}>
                      <button onClick={() => togglePublish(a)} title={a.is_published ? 'Unpublish' : 'Publish'} style={iconBtn('var(--gray-500)')}>
                        {a.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button onClick={() => openEdit(a.id)} title="Edit" style={iconBtn('var(--purple)')}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setPending({ id: a.id, title: a.title })} title="Delete" style={iconBtn('var(--red)')}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && total > PAGE && <Pagination total={total} offset={offset} setOffset={setOffset} />}

      {/* Editor */}
      {editor && (
        <EditorModal
          draft={editor}
          setDraft={setEditor}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirmDelete}
        title="Delete article?"
        description={pending ? `“${pending.title}” will be permanently removed from the website and the app. This cannot be undone.` : ''}
        icon="🗑️"
        confirmLabel="Delete article"
      />
    </div>
  )
}

function EditorModal({ draft, setDraft, onClose, onSave, saving }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000,
        padding:'40px 16px', overflowY:'auto',
      }}
    >
      <div style={{ background:'white', borderRadius:'16px', width:'100%', maxWidth:'640px', boxShadow:'var(--shadow-lg)', animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 28px', borderBottom:'1px solid var(--gray-100)' }}>
          <h3 style={{ fontSize:'18px', fontWeight:700, color:'var(--gray-900)' }}>{draft.id ? 'Edit article' : 'New article'}</h3>
          <button onClick={onClose} style={{ background:'var(--gray-100)', border:'none', borderRadius:'8px', padding:'7px', cursor:'pointer', display:'flex', color:'var(--gray-600)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:'24px 28px' }}>
          <Field label="Title">
            <input value={draft.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Understanding Your Cycle with PCOS" style={inp} maxLength={200} />
          </Field>

          <Field label="Summary (shown on the article card)">
            <input value={draft.summary} onChange={e => set('summary', e.target.value)} placeholder="One-line description" style={inp} maxLength={500} />
          </Field>

          <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
            <Field label="Category" style={{ flex:'1 1 200px' }}>
              <select value={draft.category} onChange={e => set('category', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Read time (min)" style={{ flex:'0 0 140px' }}>
              <input type="number" min={1} max={60} value={draft.readTime} onChange={e => set('readTime', e.target.value)} style={inp} />
            </Field>
          </div>

          <Field label="Cover image (optional)">
            <CoverImageField
              value={draft.imageUrl}
              onChange={v => set('imageUrl', v)}
            />
          </Field>

          <Field label="Content">
            <textarea
              value={draft.content}
              onChange={e => set('content', e.target.value)}
              placeholder="Write the full article here. Blank lines separate paragraphs."
              rows={10}
              style={{ ...inp, resize:'vertical', lineHeight:1.6, minHeight:'160px' }}
            />
          </Field>

          <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', marginTop:'4px' }}>
            <input type="checkbox" checked={!!draft.isPublished} onChange={e => set('isPublished', e.target.checked)} style={{ width:'16px', height:'16px', accentColor:'var(--purple)', cursor:'pointer' }} />
            <span style={{ fontSize:'14px', color:'var(--gray-700)' }}>Published <span style={{ color:'var(--gray-400)' }}>— visible on the website &amp; app</span></span>
          </label>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', padding:'18px 28px', borderTop:'1px solid var(--gray-100)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn loading={saving} onClick={onSave}>{draft.id ? 'Save changes' : 'Publish article'}</Btn>
        </div>
      </div>
    </div>
  )
}

/**
 * CoverImageField
 * ---------------
 * Replaces the old "paste an image URL" input, which kept failing because:
 *   • Google Drive / Dropbox share links point at an HTML preview page, not an
 *     actual image file, so the <img> tag rendered nothing.
 *   • Hotlinked URLs expire or block embedding from another domain.
 *
 * Admins can now:
 *   1. Upload straight from their device (click or drag & drop)
 *   2. Paste a link — including a Google Drive / Dropbox / OneDrive share link.
 *      The backend downloads it and re-hosts it in our own Supabase bucket, so
 *      the cover keeps working forever.
 *
 * Either way, `value` ends up as a permanent public URL from our own storage.
 */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_MB   = 5

function CoverImageField({ value, onChange }) {
  const [tab, setTab]           = useState('upload')   // 'upload' | 'link'
  const [busy, setBusy]         = useState(false)
  const [link, setLink]         = useState('')
  const [dragging, setDragging] = useState(false)
  const [broken, setBroken]     = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, WEBP or GIF image.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum size is ${MAX_MB} MB.`)
      return
    }
    setBusy(true)
    try {
      const res = await api.uploadArticleImage(file)
      if (!res?.url) throw new Error('Upload did not return an image URL.')
      setBroken(false)
      onChange(res.url)
      toast.success('Cover image uploaded')
    } catch (e) {
      toast.error(e.message || 'Image upload failed. Please try again.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleImport = async () => {
    const url = link.trim()
    if (!url) { toast.error('Paste an image link first.'); return }
    setBusy(true)
    try {
      const res = await api.importArticleImage(url)
      if (!res?.url) throw new Error('Import did not return an image URL.')
      setBroken(false)
      onChange(res.url)
      setLink('')
      toast.success('Cover image imported')
    } catch (e) {
      toast.error(e.message || 'Could not import that image.')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    handleFile(e.dataTransfer.files?.[0])
  }

  // ── Already has an image → show a preview with a Replace / Remove action ──
  if (value) {
    return (
      <div style={{ border:'1.5px solid var(--gray-200)', borderRadius:'10px', overflow:'hidden', background:'var(--gray-50)' }}>
        {broken ? (
          <div style={{ padding:'20px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:'var(--gray-600)' }}>
            <ImageIcon size={16} />
            This image could not be displayed. Try uploading it from your device.
          </div>
        ) : (
          <img
            src={value}
            alt="Cover preview"
            onError={() => setBroken(true)}
            style={{ width:'100%', height:'180px', objectFit:'cover', display:'block', background:'var(--gray-100)' }}
          />
        )}
        <div style={{ display:'flex', gap:'8px', padding:'10px 12px', borderTop:'1px solid var(--gray-200)', background:'white' }}>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={miniBtn}>
            {busy ? <Loader2 size={13} style={{ animation:'spin 0.7s linear infinite' }} /> : <UploadCloud size={13} />}
            {busy ? 'Uploading…' : 'Replace'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => { onChange(''); setBroken(false) }}
            style={{ ...miniBtn, color:'var(--red)', marginLeft:'auto' }}
          >
            <Trash2 size={13} /> Remove
          </button>
        </div>
        <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} onChange={e => handleFile(e.target.files?.[0])} style={{ display:'none' }} />
      </div>
    )
  }

  // ── No image yet → upload / link tabs ────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
        <TabBtn active={tab === 'upload'} onClick={() => setTab('upload')}><UploadCloud size={13} /> Upload from device</TabBtn>
        <TabBtn active={tab === 'link'}   onClick={() => setTab('link')}><Link2 size={13} /> Paste a link</TabBtn>
      </div>

      {tab === 'upload' ? (
        <div
          onClick={() => !busy && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${dragging ? 'var(--purple)' : 'var(--gray-200)'}`,
            background: dragging ? 'var(--purple-pale)' : 'var(--gray-50)',
            borderRadius:'10px', padding:'26px 16px', textAlign:'center',
            cursor: busy ? 'wait' : 'pointer', transition:'all 0.15s',
          }}
        >
          {busy ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', color:'var(--gray-600)', fontSize:'13px' }}>
              <Loader2 size={15} style={{ animation:'spin 0.7s linear infinite' }} /> Uploading…
            </div>
          ) : (
            <>
              <UploadCloud size={22} color="var(--purple)" />
              <div style={{ fontSize:'13px', color:'var(--gray-700)', marginTop:'8px', fontWeight:500 }}>
                Click to choose an image, or drag it here
              </div>
              <div style={{ fontSize:'12px', color:'var(--gray-400)', marginTop:'3px' }}>
                JPG, PNG, WEBP or GIF · up to {MAX_MB} MB
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} onChange={e => handleFile(e.target.files?.[0])} style={{ display:'none' }} />
        </div>
      ) : (
        <div>
          <div style={{ display:'flex', gap:'8px' }}>
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && handleImport()}
              placeholder="Paste an image or Google Drive link…"
              style={{ ...inp, flex:1 }}
              disabled={busy}
            />
            <Btn onClick={handleImport} loading={busy} style={{ flexShrink:0 }}>Import</Btn>
          </div>
          <div style={{ fontSize:'12px', color:'var(--gray-400)', marginTop:'6px', lineHeight:1.5 }}>
            Works with Google Drive, Dropbox, OneDrive or any public image link. The image is copied
            into UteriFlow storage, so it keeps working even if the original link is removed.
            On Google Drive, set sharing to <strong>“Anyone with the link”</strong> first.
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:'6px', padding:'7px 12px',
        borderRadius:'8px', fontSize:'12.5px', fontWeight:500, fontFamily:'inherit',
        cursor:'pointer', transition:'all 0.15s',
        border: `1.5px solid ${active ? 'var(--purple)' : 'var(--gray-200)'}`,
        background: active ? 'var(--purple-pale)' : 'white',
        color: active ? 'var(--purple)' : 'var(--gray-600)',
      }}
    >
      {children}
    </button>
  )
}

const miniBtn = {
  display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 10px',
  borderRadius:'7px', border:'1.5px solid var(--gray-200)', background:'white',
  fontSize:'12.5px', fontWeight:500, fontFamily:'inherit', cursor:'pointer',
  color:'var(--gray-700)',
}

function Field({ label, children, style={} }) {
  return (
    <div style={{ marginBottom:'18px', ...style }}>
      <label style={{ display:'block', fontSize:'13px', fontWeight:500, color:'var(--gray-700)', marginBottom:'6px' }}>{label}</label>
      {children}
    </div>
  )
}

function Pagination({ total, offset, setOffset }) {
  const page = Math.floor(offset / PAGE) + 1
  const last = Math.ceil(total / PAGE)
  const btn = (label, target, disabled) => (
    <button
      key={label}
      disabled={disabled}
      onClick={() => setOffset(target)}
      style={{
        padding:'7px 14px', borderRadius:'8px', fontSize:'13px', fontFamily:'inherit',
        border:'1.5px solid var(--gray-200)', background:'white',
        color: disabled ? 'var(--gray-300)' : 'var(--gray-700)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{label}</button>
  )
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'16px', gap:'8px' }}>
      <span style={{ fontSize:'13px', color:'var(--gray-500)' }}>Page {page} of {last}</span>
      <div style={{ display:'flex', gap:'8px' }}>
        {btn('Previous', Math.max(0, offset - PAGE), offset === 0)}
        {btn('Next',     offset + PAGE,              offset + PAGE >= total)}
      </div>
    </div>
  )
}

const th = { padding:'12px 16px', textAlign:'left', fontSize:'12px', fontWeight:600, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.3px' }
const td = { padding:'14px 16px', verticalAlign:'middle' }
const iconCircle = { width:'28px', height:'28px', borderRadius:'8px', background:'var(--purple-pale)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }
const inp = {
  width:'100%', padding:'11px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'8px',
  fontSize:'14px', color:'var(--gray-900)', background:'white', outline:'none', fontFamily:'inherit',
}
const iconBtn = (color) => ({
  background:'transparent', border:'none', cursor:'pointer', padding:'6px', borderRadius:'6px',
  color, display:'inline-flex', alignItems:'center', marginLeft:'2px',
})
