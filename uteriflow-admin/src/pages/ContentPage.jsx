import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Filter, MoreVertical, ThumbsUp, Share2, Send, Image, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../api'
import { PageHeader, Tabs, SearchInput, Btn, Avatar, Spinner, Empty, ConfirmModal, Dropdown } from '../components/UI'

const POST_TABS = [
  { value:'flagged',        label:'Flagged Posts'   },
  { value:'community',      label:'Community Posts' },
  { value:'lifestyle_tips', label:'Lifestyle Tips'  },
]
const COMPOSE_CATS = [
  { value:'discord',        label:'Discord'         },
  { value:'community',      label:'Community Posts' },
  { value:'lifestyle_tips', label:'Lifestyle Tips'  },
]

/* ── chip button ───────────────────────────────── */
const chip = (bg, color) => ({
  display:'inline-flex', alignItems:'center', gap:'4px',
  padding:'4px 10px', borderRadius:'20px', fontSize:'11px',
  fontWeight:500, cursor:'pointer', border:'none',
  background:bg, color, fontFamily:'inherit',
})

/* ── Comment item ──────────────────────────────── */
function CommentItem({ comment, onDelete, onFlag, onBan }) {
  const name = comment.author?.display_name || comment.author?.email || 'Anonymous user'
  const ago  = formatDistanceToNow(new Date(comment.created_at), { addSuffix:true })
  return (
    <div style={{ padding:'12px 0', borderBottom:'1px solid var(--gray-50)' }}>
      <div style={{
        background: comment.is_flagged ? '#fffbeb' : 'transparent',
        borderLeft: comment.is_flagged ? '3px solid var(--yellow)' : 'none',
        borderRadius: comment.is_flagged ? '0 8px 8px 0' : 0,
        padding: comment.is_flagged ? '8px 10px' : 0,
      }}>
        {comment.is_flagged && <span style={{ ...chip('#fef3c7','#92400e'), marginBottom:'6px', display:'inline-flex' }}>🚩 Flagged for review</span>}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'6px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <Avatar name={name} size={28} />
            <span style={{ fontSize:'13px', fontWeight:600 }}>{name}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
            <span style={{ fontSize:'11px', color:'var(--gray-400)' }}>{ago}</span>
            <Dropdown
              trigger={<button style={{ width:'26px', height:'26px', borderRadius:'6px', background:'var(--gray-100)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--gray-500)' }}><MoreVertical size={13}/></button>}
              items={[
                { icon:'🗑', label:'Delete comment', onClick:() => onDelete(comment.id), danger:true },
                '---',
                { icon:'⏱', label:'Ban (7 days)',    onClick:() => onBan(comment.author_id, 7),    danger:true },
                { icon:'🚫', label:'Ban permanently', onClick:() => onBan(comment.author_id, null), danger:true },
              ]}
            />
          </div>
        </div>
        <p style={{ fontSize:'13px', color:'var(--gray-600)', lineHeight:1.55, marginBottom:'8px' }}>{comment.content}</p>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          <button style={chip('#e0f2fe','#0369a1')}><ThumbsUp size={11}/> {comment.likes_count||0}</button>
          <button style={chip('var(--gray-100)','var(--gray-600)')}>↩ Reply</button>
          {!comment.is_flagged && <button onClick={() => onFlag(comment.id)} style={chip('#fef3c7','#92400e')}>🚩 Flag</button>}
          <button onClick={() => onDelete(comment.id)} style={chip('#fee2e2','#991b1b')}>🗑</button>
        </div>
      </div>
    </div>
  )
}

/* ── Post item ─────────────────────────────────── */
function PostItem({ post, isSelected, onSelect, onDelete, onBan }) {
  const excerpt = post.content?.length > 190 ? post.content.slice(0,190) + '...' : post.content
  return (
    <div
      onClick={() => onSelect(post.id)}
      style={{ borderBottom:'1px solid var(--gray-100)', padding:'20px', background:isSelected ? 'var(--purple-xpale)' : 'white', transition:'background 0.15s', cursor:'pointer' }}
    >
      {post.is_flagged && <span style={{ ...chip('#fef3c7','#92400e'), marginBottom:'10px', display:'inline-flex' }}>🚩 Flagged</span>}
      {post.image_url
        ? <img src={post.image_url} alt="" style={{ width:'100%', height:'160px', objectFit:'cover', borderRadius:'8px', marginBottom:'14px', display:'block' }}/>
        : <div style={{ width:'100%', height:'150px', background:'linear-gradient(135deg,var(--purple-pale),#e0e7ff)', borderRadius:'8px', marginBottom:'14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>🌸</div>
      }
      <h3 style={{ fontSize:'17px', fontWeight:600, marginBottom:'8px' }}>{post.title}</h3>
      <p style={{ fontSize:'13px', color:'var(--gray-500)', lineHeight:1.6, marginBottom:'12px' }}>
        {excerpt}
        {post.content?.length > 190 && <span style={{ color:'var(--purple)', fontWeight:500 }}> Click to see more</span>}
      </p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', gap:'14px', fontSize:'12px', color:'var(--gray-400)', alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><ThumbsUp size={12}/> {post.likes_count||0} Likes</span>
          <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><Share2 size={12}/> {post.shares_count||0} Shares</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <Dropdown
            trigger={<button style={{ width:'28px', height:'28px', borderRadius:'6px', background:'var(--gray-100)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--gray-500)' }}><MoreVertical size={15}/></button>}
            items={[
              { icon:'🗑', label:'Delete post',     onClick:() => onDelete(post.id),                    danger:true },
              { icon:'💬', label:'View comments',   onClick:() => onSelect(post.id)                               },
              '---',
              { icon:'⏱', label:'Ban (7 days)',     onClick:() => onBan(post.author_id, 7),             danger:true },
              { icon:'🚫', label:'Ban permanently', onClick:() => onBan(post.author_id, null),          danger:true },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Compose editor ────────────────────────────── */
function ComposeEditor({ onClose, onPosted }) {
  const [category, setCategory] = useState('community')
  const [title, setTitle]       = useState('')
  const [content, setContent]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit() {
    if (!title.trim() || !content.trim()) return toast.error('Title and content are required')
    setLoading(true)
    try {
      await api.createPost({ title, content, category })
      toast.success('Post published!'); onPosted(); onClose()
    } catch (e) { toast.error(e.error||'Failed to publish') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)', marginBottom:'16px', overflow:'hidden' }}>
      <div style={{ background:'#b91c1c', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
          {COMPOSE_CATS.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              style={{ padding:'6px 12px', borderRadius:'6px', fontSize:'13px', fontWeight:500, border:'none', cursor:'pointer', fontFamily:'inherit', background:category===c.value ? 'white' : 'transparent', color:category===c.value ? 'var(--gray-900)' : 'rgba(255,255,255,0.8)', transition:'all 0.15s' }}>
              {c.label}
            </button>
          ))}
        </div>
        <button onClick={submit} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'6px', background:'white', border:'none', cursor:'pointer', fontWeight:600, fontSize:'13px', fontFamily:'inherit' }}>
          {loading ? '...' : <><span>post</span><Send size={12}/></>}
        </button>
      </div>
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
          <button style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'6px', background:'var(--gray-100)', border:'none', cursor:'pointer', fontSize:'13px', color:'var(--gray-600)', fontFamily:'inherit' }}>
            <Image size={13}/> Attach image
          </button>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)', display:'flex' }}><X size={16}/></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a title"
          style={{ width:'100%', border:'none', outline:'none', fontSize:'17px', fontWeight:600, fontFamily:'inherit', color:'var(--gray-900)', marginBottom:'10px' }}/>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write something..."
          style={{ width:'100%', minHeight:'90px', border:'none', outline:'none', fontSize:'14px', fontFamily:'inherit', color:'var(--gray-700)', resize:'none', lineHeight:1.6 }}/>
      </div>
    </div>
  )
}

/* ── Comments panel ────────────────────────────── */
function CommentsPanel({ postId, onBan, isMobileOpen, onClose }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(false)
  const [total, setTotal]       = useState(0)

  const load = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    try {
      const d = await api.getComments(postId)
      setComments(d.comments); setTotal(d.pagination.total)
    } catch { toast.error('Failed to load comments') }
    finally { setLoading(false) }
  }, [postId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    try { await api.deleteComment(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }
  async function handleFlag(id) {
    try { await api.flagComment(id); toast.success('Flagged'); load() }
    catch { toast.error('Failed to flag') }
  }

  const panel = (
    <div style={{ background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid var(--gray-100)', display:'flex', alignItems:'center', gap:'10px', flexShrink:0, justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <h3 style={{ fontSize:'15px', fontWeight:600 }}>Comments</h3>
          <span style={{ background:'var(--purple)', color:'white', borderRadius:'20px', fontSize:'11px', fontWeight:600, padding:'2px 8px' }}>{total}</span>
        </div>
        {/* mobile close btn */}
        <button className="mobile-panel-close" onClick={onClose} style={{ background:'var(--gray-100)', border:'none', cursor:'pointer', borderRadius:'8px', padding:'6px', display:'none', color:'var(--gray-600)' }}><X size={16}/></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'8px 16px' }}>
        {!postId && <Empty icon="💬" message="Select a post to view comments" />}
        {postId && loading && <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><Spinner/></div>}
        {postId && !loading && comments.length===0 && <Empty icon="💬" message="No comments yet"/>}
        {postId && !loading && comments.map(c => (
          <CommentItem key={c.id} comment={c} onDelete={handleDelete} onFlag={handleFlag} onBan={onBan}/>
        ))}
      </div>
      {postId && (
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--gray-100)', display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
          <input placeholder="Write a comment..."
            style={{ flex:1, padding:'9px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'20px', fontSize:'13px', fontFamily:'inherit', outline:'none' }}
            onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--gray-200)'}
          />
          <button style={{ width:'36px', height:'36px', borderRadius:'50%', background:'var(--purple)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Send size={14}/></button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        .mobile-panel-close { display:none !important; }
        .comments-mobile-overlay { display:none; }
        @media(max-width:900px) {
          .mobile-panel-close { display:flex !important; }
          .comments-mobile-overlay {
            position:fixed; inset:0; background:rgba(0,0,0,0.4);
            z-index:400; display:flex; align-items:flex-end;
            backdrop-filter:blur(2px);
          }
          .comments-mobile-overlay .panel-inner {
            width:100%; max-height:85vh; border-radius:20px 20px 0 0;
            overflow:hidden; display:flex; flex-direction:column;
          }
        }
      `}</style>

      {/* Desktop: always visible in grid */}
      <div className="comments-panel-desktop" style={{ height:'calc(100vh - 140px)', position:'sticky', top:'32px' }}>
        {panel}
      </div>

      {/* Mobile: drawer from bottom */}
      {isMobileOpen && (
        <div className="comments-mobile-overlay" onClick={onClose}>
          <div className="panel-inner" onClick={e => e.stopPropagation()}>
            {panel}
          </div>
        </div>
      )}

      <style>{`
        .comments-panel-desktop { display:block; }
        @media(max-width:900px) { .comments-panel-desktop { display:none; } }
      `}</style>
    </>
  )
}

/* ── Main page ─────────────────────────────────── */
export default function ContentPage() {
  const [tab, setTab]                 = useState('community')
  const [search, setSearch]           = useState('')
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedPostId, setSelected] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [mobileComments, setMobileComments] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [banTarget, setBanTarget]       = useState(null)
  const [banning, setBanning]           = useState(false)

  const timer = useRef(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.getPosts({ limit:15, category:tab, ...(search ? { search } : {}) })
      setPosts(d.posts)
    } catch { toast.error('Failed to load posts') }
    finally { setLoading(false) }
  }, [tab, search])

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(loadPosts, 400)
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
      toast.success('Post deleted'); setDeleteTarget(null)
      if (selectedPostId === deleteTarget) { setSelected(null); setMobileComments(false) }
      loadPosts()
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(false) }
  }

  async function handleBan() {
    setBanning(true)
    try {
      await api.banUser(banTarget.userId, {
        ban_type: banTarget.days ? 'temporary' : 'permanent',
        days: banTarget.days||undefined, reason:'Inappropriate content'
      })
      toast.success(banTarget.days ? `Banned for ${banTarget.days} days` : 'Permanently banned')
      setBanTarget(null)
    } catch (e) { toast.error(e.error||'Ban failed') }
    finally { setBanning(false) }
  }

  return (
    <div>
      <style>{`
        .content-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; align-items:start; }
        .mobile-comments-btn { display:none; }
        @media(max-width:900px) {
          .content-grid { grid-template-columns:1fr; }
          .mobile-comments-btn { display:flex !important; }
        }
      `}</style>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px', flexWrap:'wrap', gap:'12px' }}>
        <PageHeader title="Manage Content" subtitle="manage posts and comments" />
        {/* mobile: show comments button */}
        <button
          className="mobile-comments-btn"
          onClick={() => setMobileComments(true)}
          style={{ display:'none', alignItems:'center', gap:'6px', padding:'9px 16px', background:'var(--purple)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}
        >
          💬 Comments {selectedPostId ? '' : '(select post)'}
        </button>
      </div>

      <div className="content-grid">
        {/* Posts column */}
        <div>
          <div style={{ display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search Posts"/>
            <button style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', background:'white', color:'var(--gray-700)', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              <Filter size={14}/> Filter
            </button>
          </div>

          {/* compose toggle */}
          <div onClick={() => setShowCompose(s=>!s)} style={{ background: showCompose ? 'var(--purple-mid)' : 'var(--purple)', borderRadius:'10px', padding:'13px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', cursor:'pointer', transition:'background 0.15s' }}>
            <span style={{ color:'white', fontSize:'14px', fontWeight:500 }}>Make a post ℹ</span>
            <span style={{ color:'white', fontSize:'22px', lineHeight:1 }}>{showCompose ? '−' : '+'}</span>
          </div>

          {showCompose && <ComposeEditor onClose={() => setShowCompose(false)} onPosted={loadPosts}/>}

          {/* tabs — scrollable on small screens */}
          <div style={{ overflowX:'auto', marginBottom:'16px', paddingBottom:'2px' }}>
            <Tabs tabs={POST_TABS} active={tab} onChange={setTab}/>
          </div>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'60px', background:'white', borderRadius:'var(--radius)' }}><Spinner/></div>
          ) : posts.length === 0 ? (
            <div style={{ background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)' }}><Empty icon="📝" message="No posts found"/></div>
          ) : (
            <div style={{ background:'white', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)', overflow:'hidden' }}>
              {posts.map(p => (
                <PostItem key={p.id} post={p} isSelected={selectedPostId===p.id}
                  onSelect={selectPost}
                  onDelete={setDeleteTarget}
                  onBan={(uid,d) => setBanTarget({ userId:uid, days:d })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comments panel */}
        <CommentsPanel
          postId={selectedPostId}
          onBan={(uid,d) => setBanTarget({ userId:uid, days:d })}
          isMobileOpen={mobileComments}
          onClose={() => setMobileComments(false)}
        />
      </div>

      <ConfirmModal
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Post" icon="🗑️" confirmLabel="Delete Post"
        description="This will permanently delete the post and all its comments."
      />
      <ConfirmModal
        open={!!banTarget} onClose={() => setBanTarget(null)}
        onConfirm={handleBan} loading={banning}
        title={banTarget?.days ? `Ban User (${banTarget.days} days)` : 'Ban User Permanently'}
        icon="🚫" confirmLabel="Confirm Ban"
        description={banTarget?.days ? `Restricts user access for ${banTarget.days} days.` : "Permanently removes user access from the platform."}
      />
    </div>
  )
}
