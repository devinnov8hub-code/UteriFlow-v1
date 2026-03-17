import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FileText, MessageSquare, Users, Flag } from 'lucide-react'
import api from '../api'
import { PageHeader, Spinner, Badge } from '../components/UI'

const buildCards = (stats, overview, days) => [
  { icon: <FileText size={20} color="var(--purple)" />, label:'Posts Published',   value: stats?.postsPublished ?? 0,      sub:`in the last ${days} days`, badge:{ label:'+20%',   color:'green'  } },
  { icon: <MessageSquare size={20} color="var(--purple)" />, label:'Comments',     value: stats?.comments ?? 0,            sub:`in the last ${days} days`, badge:{ label:'-10%',   color:'red'    } },
  { icon: <Users size={20} color="var(--purple)" />, label:'Active Users',          value: overview?.totalUsers ?? 0,       sub:`in the last ${days} days`, badge:{ label:'+12%',   color:'green'  } },
  { icon: <Flag size={20} color="var(--purple)" />, label:'Comments Flagged',       value: stats?.flaggedComments ?? 0,     sub:`in the last ${days} days`, badge:{ label:'Review', color:'yellow' } },
]

function StatCard({ icon, label, value, sub, badge, delay }) {
  return (
    <div className="stat-card animate-fade" style={{ animationDelay:`${delay}ms` }}>
      <div style={{ position:'absolute', width:'90px', height:'90px', borderRadius:'50%', background:'var(--purple-pale)', top:'-22px', right:'-22px', opacity:0.7 }} />
      <div style={{ width:'44px', height:'44px', background:'var(--purple-pale)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px', position:'relative', zIndex:1 }}>
        {icon}
      </div>
      <div style={{ fontSize:'13px', color:'var(--gray-500)', fontWeight:500, marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'clamp(28px,4vw,36px)', fontWeight:700, lineHeight:1, marginBottom:'6px' }}>{value.toLocaleString()}</div>
      <div style={{ fontSize:'12px', color:'var(--gray-400)', marginBottom:'10px' }}>{sub}</div>
      <Badge color={badge.color}>{badge.label}</Badge>
    </div>
  )
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'white', borderRadius:'8px', padding:'10px 14px', boxShadow:'var(--shadow)', border:'1px solid var(--gray-100)', fontSize:'13px' }}>
      <p style={{ fontWeight:600, marginBottom:'4px', color:'var(--gray-700)' }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData]       = useState(null)
  const [overview, setOverview] = useState(null)
  const [days, setDays]       = useState(30)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, sRes] = await Promise.all([api.getAnalytics(days), api.getStats()])
      setData(aRes); setOverview(sRes.overview)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <style>{`
        .analytics-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; gap:12px; flex-wrap:wrap; }
        .stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; }
        .stat-card  { background:white; border-radius:var(--radius); padding:24px; box-shadow:var(--shadow-sm); position:relative; overflow:hidden; }
        .charts-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .chart-card { background:white; border-radius:var(--radius); padding:24px; box-shadow:var(--shadow-sm); }
        @media(max-width:640px) {
          .stats-grid  { grid-template-columns:1fr; gap:14px; }
          .charts-row  { grid-template-columns:1fr; gap:14px; }
          .analytics-header { flex-direction:column; }
        }
      `}</style>

      <div className="analytics-header">
        <PageHeader title="Analytics" subtitle="View Community stats at a glance." />
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          style={{ padding:'8px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'8px', fontSize:'13px', outline:'none', fontFamily:'inherit', cursor:'pointer', background:'white' }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 3 months</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><Spinner size={36} /></div>
      ) : (<>
        <div className="stats-grid">
          {buildCards(data?.stats, overview, days).map((c, i) => <StatCard key={i} {...c} delay={i*60} />)}
        </div>
        <div className="charts-row">
          <div className="chart-card">
            <h3 style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>User Activity</h3>
            <p style={{ fontSize:'12px', color:'var(--gray-400)', marginBottom:'20px' }}>Users on the community section within the last 24 hours</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data?.weeklyActivity||[]} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="day" tick={{ fontSize:11, fill:'var(--gray-400)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'var(--gray-400)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT />}/>
                <Area type="monotone" dataKey="posts" name="Posts" stroke="var(--accent)" fill="url(#agrad)" strokeWidth={2.5} dot={{ r:3, fill:'var(--accent)' }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Comment Activity</h3>
            <p style={{ fontSize:'12px', color:'var(--gray-400)', marginBottom:'20px' }}>Comments on posts in the last 7 days</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.weeklyActivity||[]} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="day" tick={{ fontSize:11, fill:'var(--gray-400)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'var(--gray-400)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT />}/>
                <Bar dataKey="comments" name="Comments" fill="var(--purple)" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>)}
    </div>
  )
}
