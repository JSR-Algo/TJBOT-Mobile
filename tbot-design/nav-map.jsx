// Navigation map — visual graph of all screens and their go() links.
// Loads nav-graph-data.json and renders an interactive grouped graph.

function NavMap(){
  const [data, setData] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [filter, setFilter] = React.useState('all');

  React.useEffect(()=>{
    fetch('nav-graph-data.json').then(r=>r.json()).then(setData).catch(e=>console.error('nav-graph-data load failed', e));
  },[]);

  if (!data) return <div style={{padding:40, color:'#888', fontFamily:'system-ui'}}>Loading nav graph…</div>;

  // Lay out groups in a grid
  const groupOrder = [
    'Onboarding','Home','Start','Activity','Feedback','Done','Edge',
    'Course','Progress','Parent','Fallback',
    'Course Library','Robot Device','Robot Mgmt','Purchase'
  ];
  const groupColors = {
    'Onboarding':'#A78BFA','Home':'#FB7185','Start':'#FBBF24','Activity':'#60A5FA',
    'Feedback':'#F472B6','Done':'#34D399','Edge':'#94A3B8',
    'Course':'#F59E0B','Progress':'#10B981','Parent':'#475569','Fallback':'#EF4444',
    'Course Library':'#8B5CF6','Robot Device':'#0EA5E9','Robot Mgmt':'#6366F1','Purchase':'#EC4899',
  };

  // Layout: 4 columns of groups
  const cols = 4;
  const groupW = 320, groupGap = 30;
  const groupHpadding = 50;
  const nodeR = 8, nodeRowH = 22;

  // Compute group positions and node positions
  const positions = {}; // id -> {x,y}
  const groupBoxes = {}; // gname -> {x,y,w,h}
  let cy = 30;
  let rowMaxH = 0;
  for (let i=0; i<groupOrder.length; i++){
    const gname = groupOrder[i];
    const ids = (data.groups[gname] || []).slice().sort();
    if (!ids.length) continue;
    const col = i % cols;
    if (col === 0 && i > 0) { cy += rowMaxH + groupGap; rowMaxH = 0; }
    const gx = 30 + col * (groupW + groupGap);
    const gh = groupHpadding + ids.length * nodeRowH + 10;
    groupBoxes[gname] = { x:gx, y:cy, w:groupW, h:gh };
    ids.forEach((id, idx) => {
      positions[id] = { x: gx + 24, y: cy + groupHpadding + idx * nodeRowH };
    });
    if (gh > rowMaxH) rowMaxH = gh;
  }
  const totalH = cy + rowMaxH + 30;
  const totalW = 30 + cols * (groupW + groupGap);

  // Filter logic
  const filtered = filter === 'all' ? data.edges : data.edges.filter(e => {
    if (filter === 'orphans') return false;
    return states(e.from)?.g === filter || states(e.to)?.g === filter;
  });
  function states(id){ return data.states[id]; }

  // Compute incoming edge counts (for orphan detection)
  const incoming = {};
  data.edges.forEach(e => { incoming[e.to] = (incoming[e.to] || 0) + 1; });
  const orphanIds = new Set(Object.keys(data.states).filter(id => !incoming[id]));

  // Hover highlighting
  const hoverEdges = new Set();
  if (hover) {
    data.edges.forEach((e,i) => {
      if (e.from === hover || e.to === hover) hoverEdges.add(i);
    });
  }

  return (
    <div style={{ background:'#0F172A', minHeight:'100vh', padding:'18px 24px', fontFamily:'system-ui,-apple-system,sans-serif', color:'#E2E8F0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700 }}>Navigation Map</div>
          <div style={{ fontSize:13, color:'#94A3B8' }}>
            {Object.keys(data.states).length} screens · {data.edges.length} links · {orphanIds.size} screens with no incoming link
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['all', ...groupOrder.filter(g=>data.groups[g])].map(g => (
            <button key={g} onClick={()=>setFilter(g)} style={{
              background: filter===g ? '#3B82F6' : 'transparent',
              border: `1px solid ${filter===g ? '#3B82F6' : '#334155'}`,
              color: filter===g ? '#fff' : '#94A3B8',
              padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
            }}>{g}</button>
          ))}
        </div>
      </div>

      <div style={{ position:'relative', overflow:'auto', background:'#020617', borderRadius:12, border:'1px solid #1E293B' }}>
        <svg width={totalW} height={totalH} style={{ display:'block' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"/>
            </marker>
            <marker id="arrowHi" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#FBBF24"/>
            </marker>
          </defs>

          {/* Group boxes */}
          {Object.entries(groupBoxes).map(([gname, b]) => (
            <g key={gname}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" fill="#0F172A" stroke={groupColors[gname]||'#334155'} strokeWidth="1.5" opacity="0.6"/>
              <rect x={b.x} y={b.y} width={b.w} height={32} rx="10" fill={groupColors[gname]||'#334155'} opacity="0.18"/>
              <text x={b.x+14} y={b.y+22} fontSize="13" fontWeight="700" fill={groupColors[gname]||'#94A3B8'}>{gname}</text>
              <text x={b.x+b.w-14} y={b.y+22} fontSize="11" fontWeight="600" fill="#64748B" textAnchor="end">{(data.groups[gname]||[]).length}</text>
            </g>
          ))}

          {/* Edges */}
          {filtered.map((e, i) => {
            const a = positions[e.from], b = positions[e.to];
            if (!a || !b) return null;
            const isSelf = e.from === e.to;
            const sameGroup = states(e.from)?.g === states(e.to)?.g;
            const isHi = hoverEdges.has(data.edges.indexOf(e));
            const dim = hover && !isHi;
            // Draw a curved bezier; same-group edges curve right, cross-group curve out
            let path;
            if (isSelf) {
              path = `M ${a.x-4} ${a.y} C ${a.x-30} ${a.y-15}, ${a.x-30} ${a.y+15}, ${a.x-4} ${a.y+1}`;
            } else if (sameGroup) {
              const mx = a.x + 250 + Math.abs(b.y-a.y)*0.2;
              path = `M ${a.x+8} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x+8} ${b.y}`;
            } else {
              const mx1 = (a.x+b.x)/2 + 80;
              const my = (a.y+b.y)/2;
              path = `M ${a.x+8} ${a.y} Q ${mx1} ${my} ${b.x+8} ${b.y}`;
            }
            return (
              <path key={i} d={path} fill="none"
                stroke={isHi ? '#FBBF24' : (sameGroup ? groupColors[states(e.from)?.g] || '#475569' : '#334155')}
                strokeWidth={isHi ? 1.6 : 0.7}
                opacity={dim ? 0.08 : (isHi ? 0.95 : 0.4)}
                markerEnd={isHi ? 'url(#arrowHi)' : 'url(#arrow)'}
              />
            );
          })}

          {/* Nodes */}
          {Object.entries(positions).map(([id, p]) => {
            const st = data.states[id];
            const isHi = hover === id;
            const isOrphan = orphanIds.has(id);
            const dim = hover && !isHi && !hoverEdges.has(...[...hoverEdges].find(()=>true) || -1) && ![...hoverEdges].some(i => data.edges[i].from===id || data.edges[i].to===id);
            return (
              <g key={id} onMouseEnter={()=>setHover(id)} onMouseLeave={()=>setHover(null)} style={{cursor:'pointer'}}>
                <circle cx={p.x} cy={p.y} r={isHi ? 7 : 5}
                  fill={isOrphan ? '#1E293B' : (groupColors[st.g] || '#475569')}
                  stroke={isOrphan ? '#EF4444' : (isHi ? '#FBBF24' : 'none')}
                  strokeWidth={isOrphan ? 1.5 : (isHi ? 2 : 0)}
                  strokeDasharray={isOrphan ? '2,2' : ''}
                />
                <text x={p.x+14} y={p.y+4} fontSize="11"
                  fill={isHi ? '#FBBF24' : (isOrphan ? '#94A3B8' : '#CBD5E1')}
                  fontWeight={isHi ? 700 : 500}
                  opacity={dim ? 0.3 : 1}
                >{id} <tspan fill="#64748B" fontSize="10">· {st.title.replace(/^\d+\s*[·.]\s*/,'')}</tspan></text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ marginTop:12, display:'flex', gap:18, flexWrap:'wrap', fontSize:12, color:'#94A3B8' }}>
        <span><span style={{display:'inline-block', width:10, height:10, borderRadius:5, background:'#1E293B', border:'1.5px dashed #EF4444', marginRight:6, verticalAlign:'middle'}}></span>No incoming link (orphan)</span>
        <span><span style={{display:'inline-block', width:14, height:2, background:'#FBBF24', marginRight:6, verticalAlign:'middle'}}></span>Hover to highlight links</span>
        <span style={{ color:'#64748B' }}>Hover any node to see what links to it and where it goes.</span>
      </div>

      {/* Hover detail */}
      {hover && (
        <div style={{ position:'fixed', right:20, bottom:20, background:'#1E293B', border:'1px solid #334155', borderRadius:10, padding:'12px 16px', maxWidth:320, fontSize:12, lineHeight:1.5, boxShadow:'0 8px 24px rgba(0,0,0,.4)' }}>
          <div style={{ fontWeight:700, color:'#FBBF24', marginBottom:6 }}>{hover}</div>
          <div style={{ color:'#CBD5E1', marginBottom:8 }}>{data.states[hover]?.title} · {data.states[hover]?.g}</div>
          <div style={{ color:'#94A3B8' }}>
            <div>← from: {data.edges.filter(e=>e.to===hover).map(e=>e.from).join(', ') || <span style={{color:'#EF4444'}}>(none)</span>}</div>
            <div style={{marginTop:4}}>→ to: {[...new Set(data.edges.filter(e=>e.from===hover).map(e=>e.to))].join(', ') || '(none)'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

window.NavMap = NavMap;
