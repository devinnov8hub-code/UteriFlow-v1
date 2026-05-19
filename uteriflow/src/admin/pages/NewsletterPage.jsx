import { useState, useEffect, useCallback } from 'react'
import { Download, Mail, Search, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../api'
import { PageHeader, Card, Spinner, Empty, ConfirmModal, Badge } from '../components/UI'

const PAGE = 50

export default function NewsletterPage() {
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [offset,  setOffset]  = useState(0)
  const [pending, setPending] = useState(null) // { id, email } for delete confirm

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getNewsletter({ limit: PAGE, offset, search: search.trim() || undefined })
      setItems(res?.subscribers ?? [])
      setTotal(res?.pagination?.total ?? 0)
    } catch (e) {
      toast.error(e.message || 'Failed to load subscribers')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [offset, search])

  useEffect(() => { load() }, [load])

  // Debounced search — reset to first page whenever the search term changes.
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0) }, 250)
    return () => clearTimeout(t)
  }, [search])

  const confirmDelete = async () => {
    if (!pending) return
    try {
      await api.deleteNewsletter(pending.id)
      toast.success(`Removed ${pending.email}`)
      setPending(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Failed to remove subscriber')
    }
  }

  const exportCSV = () => {
    if (!items.length) { toast.error('Nothing to export'); return }
    const header = 'email,source,created_at\n'
    const rows = items.map(r =>
      [r.email, r.source ?? '', r.created_at ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `uteriflow-newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle={`${total} subscriber${total === 1 ? '' : 's'} from the landing page newsletter form.`}
      />

      {/* Toolbar */}
      <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap', marginBottom:'20px', marginTop:'24px' }}>
        <div style={{ position:'relative', flex:'1 1 280px', maxWidth:'420px' }}>
          <Search size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email…"
            style={{
              width:'100%', padding:'10px 14px 10px 36px',
              border:'1.5px solid var(--gray-200)', borderRadius:'8px',
              fontSize:'14px', outline:'none', background:'white', fontFamily:'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
          />
        </div>

        <button
          onClick={exportCSV}
          disabled={!items.length}
          style={{
            display:'inline-flex', alignItems:'center', gap:'8px',
            padding:'10px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:500,
            background:'var(--purple-pale)', color:'var(--purple)',
            border:'none', cursor: items.length ? 'pointer' : 'not-allowed',
            opacity: items.length ? 1 : 0.5, fontFamily:'inherit',
          }}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <Card style={{ padding:'0', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'48px', display:'flex', justifyContent:'center' }}>
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding:'48px' }}>
            <Empty icon="📨" message={search ? 'No matching subscribers.' : 'No newsletter subscribers yet.'} />
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:'var(--gray-50)', borderBottom:'1px solid var(--gray-200)' }}>
                  <th style={th}>Email</th>
                  <th style={th}>Source</th>
                  <th style={th}>Joined</th>
                  <th style={{ ...th, textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                    <td style={td}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={iconCircle}><Mail size={14} color="var(--purple)" /></div>
                        <span style={{ fontWeight:500, color:'var(--gray-900)' }}>{s.email}</span>
                      </div>
                    </td>
                    <td style={td}><Badge color="gray">{s.source || 'landing'}</Badge></td>
                    <td style={{ ...td, color:'var(--gray-500)' }}>
                      {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix:true }) : '—'}
                    </td>
                    <td style={{ ...td, textAlign:'right' }}>
                      <button
                        onClick={() => setPending({ id: s.id, email: s.email })}
                        title="Remove subscriber"
                        style={{
                          background:'transparent', border:'none', cursor:'pointer',
                          padding:'6px', borderRadius:'6px', color:'var(--red)',
                          display:'inline-flex', alignItems:'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--red-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
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

      {/* Pagination */}
      {!loading && total > PAGE && (
        <Pagination total={total} offset={offset} setOffset={setOffset} />
      )}

      <ConfirmModal
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirmDelete}
        title="Remove subscriber?"
        description={pending ? `${pending.email} will be removed from the newsletter list. This cannot be undone.` : ''}
        icon="🗑️"
        confirmLabel="Remove"
      />
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
