import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Plus, Search, Trash2, Pencil, Eye, EyeOff, X } from 'lucide-react'
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

          <Field label="Cover image URL (optional)">
            <input value={draft.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://…" style={inp} maxLength={1000} />
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
