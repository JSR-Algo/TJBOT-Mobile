// Robot Device Management — parent-facing admin area.
// 12 frames: my_robot, status, battery, wifi, storage, firmware, sound,
// mic_test, speaker_test, factory_reset, offline_help, support
// Reuses DvShell / DvRow / DvBigBtn / RobotDevice / LCDFace via globals.

const RM = {
  bg:'#F5F5F2', card:'#FFFFFF', ink:'#1A1A1F', ink2:'#5A5A66', ink3:'#8B8B96',
  hair:'rgba(0,0,0,0.07)', accent:'#2A6FDB', good:'#1F8A5B', warn:'#C99227', danger:'#C0392B',
};

function RmStat({ icon, label, value, status='ok', onClick }){
  const colors = { ok: RM.good, warn: RM.warn, bad: RM.danger };
  const bgs = { ok:'#E6F4EE', warn:'#FFF4D9', bad:'#FBE6E2' };
  return (
    <button onClick={(e)=>{e.stopPropagation(); onClick && onClick();}} style={{
      flex:1, minWidth:0, background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:12,
      padding:'12px 12px', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
      display:'flex', flexDirection:'column', gap:6,
    }}>
      <div style={{ width:30, height:30, borderRadius:8, background:bgs[status], color:colors[status], display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{icon}</div>
      <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color:RM.ink, letterSpacing:-0.2 }}>{value}</div>
    </button>
  );
}

function RmChip({ children, color=RM.good, bg='#E6F4EE' }){
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:bg, color, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, letterSpacing:0.2 }}>{children}</span>;
}

// ── 1. My Robot — landing
function S_RM_MyRobot({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="My Robot" onBack={()=>go('parent_settings')}>
      {/* Hero */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:16, padding:'18px 18px',
          display:'flex', gap:14, alignItems:'center' }}>
          <RobotDevice emotion="happy" size={96} accent={accent}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Paired Robot</div>
            <div style={{ fontSize:18, fontWeight:600, color:RM.ink, letterSpacing:-0.3, marginTop:2 }}>Buddy Panda</div>
            <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>ROB-2A8F · Cream</div>
            <div style={{ marginTop:8 }}><RmChip>● Online · all good</RmChip></div>
          </div>
        </div>
      </div>

      {/* Status grid */}
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Status</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <RmStat icon="🔋" label="Battery" value="78% · charging" status="ok" onClick={()=>go('rm_battery')}/>
          <RmStat icon="📶" label="Wi-Fi" value="Casa-Familia" status="ok" onClick={()=>go('rm_wifi')}/>
          <RmStat icon="📚" label="Courses" value="3 installed" status="ok" onClick={()=>go('rm_storage')}/>
          <RmStat icon="🎙️" label="Microphone" value="Working" status="ok" onClick={()=>go('rm_mic_test')}/>
        </div>
      </div>

      {/* Care & maintenance */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Care</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔊" title="Sound & volume" body="Volume 6 · Quiet hours on" onClick={()=>go('rm_sound')}/>
          <DvRow icon="🎙️" title="Microphone test" body="Check Robot can hear" onClick={()=>go('rm_mic_test')}/>
          <DvRow icon="🔈" title="Speaker test" body="Play a chime to check audio" onClick={()=>go('rm_speaker_test')}/>
          <DvRow icon="⬆️" title="Robot software" body="v1.4.2 · update available"
            onClick={()=>go('rm_firmware')}
            right={<div style={{ background:'#FFF1C2', color:RM.warn, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:8 }}>New</div>}/>
        </div>
      </div>

      {/* Help & advanced */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Help</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📡" title="Robot offline help" body="Tips when Robot won't connect" onClick={()=>go('rm_offline_help')}/>
          <DvRow icon="🛟" title="Contact support" body="We usually reply in under a day" onClick={()=>go('rm_support')}/>
          <DvRow icon="ℹ️" title="Detailed status" body="Battery, Wi-Fi, sync, sensors" onClick={()=>go('rm_status')}/>
        </div>
      </div>

      {/* Reset */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow danger icon="⚠️" title="Factory reset" body="Erase data and start fresh · parent gate" onClick={()=>go('rm_factory')}/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ── 2. Robot Status — full health summary
function S_RM_Status({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot status" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px',
          display:'flex', gap:12, alignItems:'center' }}>
          <RobotDevice emotion="happy" size={72} accent={accent}/>
          <div style={{ flex:1 }}>
            <RmChip>● Everything is working</RmChip>
            <div style={{ fontSize:13, color:RM.ink2, lineHeight:1.5, marginTop:6, textWrap:'pretty' }}>
              Last checked just now. Robot is ready for a lesson.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Details</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔋" title="Battery" body="78% · charging on dock" onClick={()=>go('rm_battery')}/>
          <DvRow icon="📶" title="Wi-Fi" body="Casa-Familia · strong signal" onClick={()=>go('rm_wifi')}/>
          <DvRow icon="📚" title="Courses on Robot" body="3 installed · 1.2 GB used" onClick={()=>go('rm_storage')}/>
          <DvRow icon="🎙️" title="Microphone" body="Working · last test today" onClick={()=>go('rm_mic_test')}/>
          <DvRow icon="🔈" title="Speaker" body="Working · volume 6" onClick={()=>go('rm_speaker_test')}/>
          <DvRow icon="⬆️" title="Software" body="v1.4.2 · update available" onClick={()=>go('rm_firmware')}/>
          <DvRow icon="🌡️" title="Temperature" body="Normal · 28°C"/>
          <DvRow icon="⏱️" title="Uptime" body="3 days · last started Sunday"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 30px' }}>
        <div style={{ background:'#EEF1F5', borderRadius:12, padding:'12px 14px', fontSize:12, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We don't read or store anything Robot hears. This page only checks the device itself.
        </div>
      </div>
    </DvShell>
  );
}

// ── 3. Battery Status
function S_RM_Battery({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const pct = 78;
  return (
    <DvShell title="Battery" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {/* battery ring */}
        <div style={{ position:'relative', width:180, height:180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="14"/>
            <circle cx="90" cy="90" r="78" fill="none" stroke={RM.good} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(pct/100)*490} 490`}
              transform="rotate(-90 90 90)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:42, fontWeight:700, color:RM.ink, letterSpacing:-1, fontVariantNumeric:'tabular-nums' }}>{pct}%</div>
            <div style={{ fontSize:13, color:RM.ink2, marginTop:2 }}>charging</div>
          </div>
        </div>
        <div style={{ marginTop:18 }}><RmChip>⚡ On dock · 32 min to full</RmChip></div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔌" title="Power source" body="Charging dock"/>
          <DvRow icon="⏱️" title="Estimated lesson time" body="About 5 hours of talking"/>
          <DvRow icon="🌙" title="Sleeps when idle" body="After 30 minutes off the dock"/>
          <DvRow icon="🔋" title="Battery health" body="100% · like new"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:RM.ink, marginBottom:8 }}>To keep the battery healthy</div>
          <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:RM.ink2, lineHeight:1.7 }}>
            <li>Use the included dock — third-party chargers can run hot</li>
            <li>Robot is happiest between 10°C and 30°C</li>
            <li>If you'll be away a week, leave Robot at about 50%</li>
          </ul>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ── 4. Wi-Fi Status
function S_RM_Wifi({ go }){
  const [showOthers, setShowOthers] = React.useState(false);
  return (
    <DvShell title="Wi-Fi" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'18px 18px',
          display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:54, height:54, borderRadius:14, background:'#E6F4EE', color:RM.good, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8.5a14 14 0 0120 0M5 12a10 10 0 0114 0M8 15.5a6 6 0 018 0M12 19h.01"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Connected to</div>
            <div style={{ fontSize:18, fontWeight:600, color:RM.ink, marginTop:2 }}>Casa-Familia</div>
            <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>Strong signal · 5 GHz</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📡" title="Signal strength" body="Excellent · −48 dBm"/>
          <DvRow icon="⚡" title="Speed" body="Plenty for lessons"/>
          <DvRow icon="🌐" title="Robot's IP" body="192.168.1.42"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔄" title="Switch network" body="Pick a different Wi-Fi" onClick={()=>setShowOthers(s=>!s)}/>
          <DvRow icon="🔑" title="Update password" body="If your Wi-Fi password changed"/>
          <DvRow icon="📲" title="Forget this network"/>
        </div>
      </div>

      {showOthers && (
        <div style={{ padding:'18px 16px 0' }}>
          <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Other networks nearby</div>
          <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
            {[['Casa-Guest','—'],['Linden 3B','—'],['Verizon-7K2','—']].map(([n,s])=>(
              <DvRow key={n} icon="📶" title={n} body={s}/>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:'18px 16px 0', fontSize:12, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Robot needs Wi-Fi only during lessons. It doesn't browse, stream, or talk to anyone outside our service.
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ── 5. Storage / Courses Installed
function S_RM_Storage({ go, tweaks }){
  const courses = [
    { t:'Hello Friends', s:'24 lessons · all downloaded', size:'420 MB', emo:'happy' },
    { t:'Animals', s:'18 lessons · all downloaded', size:'380 MB', emo:'curious' },
    { t:'Yummy Words', s:'20 lessons · syncing 12 of 20', size:'410 MB', emo:'thinking', syncing:true },
  ];
  const used = 1.21, total = 4.0;
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Courses on Robot" onBack={()=>go('rm_my_robot')}>
      {/* Storage gauge */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'16px 16px' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5 }}>Storage</div>
            <div style={{ fontSize:13, color:RM.ink2 }}><b style={{ color:RM.ink }}>{used} GB</b> of {total} GB used</div>
          </div>
          <div style={{ display:'flex', height:10, borderRadius:6, overflow:'hidden', background:'#EEF1F5' }}>
            <div style={{ width:'30%', background:'#9BC2EB' }}/>
            <div style={{ width:'27%', background:'#B8D4A6' }}/>
            <div style={{ width:'29%', background:'#E5C56F' }}/>
          </div>
          <div style={{ display:'flex', gap:14, marginTop:10, fontSize:11, color:RM.ink2 }}>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#9BC2EB', marginRight:5 }}/>Hello Friends</span>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#B8D4A6', marginRight:5 }}/>Animals</span>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#E5C56F', marginRight:5 }}/>Yummy Words</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Installed</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {courses.map(c=>(
            <div key={c.t} style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'12px 12px', display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ background:'#0E1116', borderRadius:8, padding:4, flexShrink:0 }}>
                <LCDFace emotion={c.emo} size={48} accent={accent}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>{c.t}</div>
                <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>{c.s}</div>
                {c.syncing && (
                  <div style={{ marginTop:6, height:4, borderRadius:2, background:'#EEF1F5', overflow:'hidden' }}>
                    <div style={{ width:'60%', height:'100%', background:RM.accent, borderRadius:2 }}/>
                  </div>
                )}
              </div>
              <div style={{ fontSize:11, color:RM.ink3, fontVariantNumeric:'tabular-nums' }}>{c.size}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔄" title="Sync now" body="Check for new lessons in your courses"/>
          <DvRow icon="📚" title="Browse Course Library" body="Add or remove courses" onClick={()=>go('cl_library')}/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}

// ── 6. Update Robot Firmware
function S_RM_Firmware({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot software" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'24px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8, position:'relative' }}>
          <LCDFace emotion="thinking" size={130} accent={accent}/>
        </div>
        <div style={{ marginTop:14 }}><RmChip color={RM.warn} bg="#FFF4D9">New version available</RmChip></div>
        <div style={{ marginTop:10, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Robot has a small update
        </div>
        <div style={{ marginTop:6, fontSize:14, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Updates Robot's listening, fixes small things, and adds gentle improvements. Your child's progress is kept.
        </div>
      </div>

      {/* Version card */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Current</div>
              <div style={{ fontSize:15, fontWeight:600, color:RM.ink, marginTop:2 }}>v1.4.2</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RM.ink3} strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>New</div>
              <div style={{ fontSize:15, fontWeight:600, color:RM.accent, marginTop:2 }}>v1.5.0</div>
            </div>
          </div>
          <div style={{ paddingTop:10, borderTop:`1px solid ${RM.hair}` }}>
            <div style={{ fontSize:13, fontWeight:600, color:RM.ink, marginBottom:6 }}>What's new</div>
            <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:RM.ink2, lineHeight:1.7 }}>
              <li>Robot waits a little longer before nudging</li>
              <li>Better hearing in noisier rooms</li>
              <li>3 new gentle celebration sounds</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety reassurance */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🛡️" title="Safe to update" body="Your child's progress and courses are kept"/>
          <DvRow icon="⏱️" title="Takes about 6 minutes" body="Plug Robot in. We'll let you know when done."/>
          <DvRow icon="🔌" title="Don't unplug Robot" body="Wait until the soft chime. We handle the rest."/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>Update Robot now</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_my_robot')}>Remind me tomorrow</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 7. Sound & Volume
function S_RM_Sound({ go }){
  const [vol, setVol] = React.useState(6);
  const [chime, setChime] = React.useState(true);
  const [quiet, setQuiet] = React.useState(true);
  const [voice, setVoice] = React.useState('warm');

  const Toggle = ({ on, onChange }) => (
    <button onClick={(e)=>{e.stopPropagation(); onChange(!on);}} style={{
      width:46, height:26, borderRadius:13, background: on? RM.good:'#D5D5D5', border:'none', position:'relative', cursor:'pointer', flexShrink:0,
    }}>
      <span style={{ position:'absolute', top:2, left: on? 22:2, width:22, height:22, borderRadius:11, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.15)', transition:'left .15s' }}/>
    </button>
  );

  return (
    <DvShell title="Sound & volume" onBack={()=>go('rm_my_robot')}>
      {/* Volume slider */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'18px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:RM.ink }}>Robot's voice volume</div>
            <div style={{ fontSize:24, fontWeight:700, color:RM.ink, letterSpacing:-0.4, fontVariantNumeric:'tabular-nums' }}>{vol}<span style={{ fontSize:14, color:RM.ink3, fontWeight:500 }}>/10</span></div>
          </div>
          {/* segmented level */}
          <div style={{ display:'flex', gap:5 }}>
            {Array.from({length:10}).map((_, i)=>(
              <button key={i} onClick={(e)=>{e.stopPropagation(); setVol(i+1);}} style={{
                flex:1, height:36, borderRadius:6, border:'none', cursor:'pointer',
                background: i < vol ? RM.accent : '#EEF1F5',
              }}/>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:RM.ink3 }}>
            <span>Quiet</span><span>Living-room</span><span>Loud</span>
          </div>
        </div>
      </div>

      {/* Voice picker */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Robot's voice</div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { id:'warm',  t:'Warm',  s:'Friendly · default' },
            { id:'calm',  t:'Calm',  s:'Slower, softer' },
            { id:'bright',t:'Bright',s:'A little playful' },
          ].map(v=>{
            const sel = voice===v.id;
            return (
              <button key={v.id} onClick={(e)=>{e.stopPropagation(); setVoice(v.id);}} style={{
                flex:1, background: sel?'#E8F0FE':RM.card, border: sel? `2px solid ${RM.accent}` : `1px solid ${RM.hair}`,
                borderRadius:12, padding:'10px 8px', cursor:'pointer', textAlign:'center', fontFamily:'inherit',
              }}>
                <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>{v.t}</div>
                <div style={{ fontSize:11, color:RM.ink2, marginTop:2 }}>{v.s}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Sounds</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔔" title="Soft chimes" body="When a lesson starts and ends" right={<Toggle on={chime} onChange={setChime}/>}/>
          <DvRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM · half volume" right={<Toggle on={quiet} onChange={setQuiet}/>}/>
          <DvRow icon="▶️" title="Play test sound" body="A 2-second chime, at current volume"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 30px', fontSize:12, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Robot's voice changes apply on the next lesson. Test sound plays now.
      </div>
    </DvShell>
  );
}

// ── 8. Microphone Test
function S_RM_MicTest({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [phase, setPhase] = React.useState('idle'); // idle | listening | done
  const [level, setLevel] = React.useState(0);

  React.useEffect(()=>{
    if (phase!=='listening') return;
    let t = 0;
    const id = setInterval(()=>{
      t += 1;
      setLevel(0.3 + 0.7*Math.abs(Math.sin(t*0.6)));
      if (t > 14) { clearInterval(id); setPhase('done'); setLevel(0); }
    }, 120);
    return ()=>clearInterval(id);
  }, [phase]);

  const bars = 14;

  return (
    <DvShell title="Microphone test" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8 }}>
          <LCDFace emotion={phase==='listening'?'listening' : phase==='done'?'happy':'idle'} size={140} accent={accent}/>
        </div>

        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center' }}>
          {phase==='idle' && 'Can Robot hear you?'}
          {phase==='listening' && 'Speak in your normal voice'}
          {phase==='done' && "Robot heard you clearly"}
        </div>
        <div style={{ marginTop:6, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          {phase==='idle' && 'Stand about an arm\'s length from Robot, then tap Start.'}
          {phase==='listening' && 'Try saying "Hello, Robot!"'}
          {phase==='done' && 'You can run this test anytime if Robot seems quiet.'}
        </div>
      </div>

      {/* Level meter */}
      <div style={{ padding:'30px 30px 0', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:5, height:90 }}>
        {Array.from({length:bars}).map((_, i)=>{
          const dist = Math.abs(i - bars/2 + 0.5) / (bars/2);
          const h = phase==='listening'
            ? 6 + (1 - dist*0.6) * level * 70
            : phase==='done' ? 6 + (1-dist*0.6)*22 : 6;
          return (
            <div key={i} style={{ width:7, height: h, borderRadius:4,
              background: phase==='done' ? RM.good : phase==='listening' ? RM.accent : '#D5D9E0',
              transition: phase==='listening' ? 'none' : 'height .25s, background .25s',
            }}/>
          );
        })}
      </div>

      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📍" title="Where Robot listens best" body="Within 6 feet, away from TVs and fans"/>
          <DvRow icon="🌬️" title="Background noise" body={phase==='done'?'Low · good for lessons':'Checking…'}/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        {phase==='idle' && <DvBigBtn onClick={()=>setPhase('listening')}>Start test</DvBigBtn>}
        {phase==='listening' && <DvBigBtn secondary>Listening…</DvBigBtn>}
        {phase==='done' && (
          <>
            <DvBigBtn onClick={()=>go('rm_my_robot')}>Looks good</DvBigBtn>
            <DvBigBtn secondary onClick={()=>setPhase('idle')}>Test again</DvBigBtn>
          </>
        )}
      </div>
    </DvShell>
  );
}

// ── 9. Speaker Test
function S_RM_SpeakerTest({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [played, setPlayed] = React.useState(null); // 'chime' | 'voice' | null
  return (
    <DvShell title="Speaker test" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8 }}>
          <LCDFace emotion={played?'happy':'idle'} size={140} accent={accent}/>
        </div>
        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center' }}>
          Can you hear Robot?
        </div>
        <div style={{ marginTop:6, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:280, lineHeight:1.5, textWrap:'pretty' }}>
          Tap a sound to play it at the current volume (6 of 10).
        </div>
      </div>

      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={(e)=>{e.stopPropagation(); setPlayed('chime');}} style={{
            background:RM.card, border: played==='chime'? `2px solid ${RM.accent}` : `1px solid ${RM.hair}`,
            borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
            display:'flex', gap:14, alignItems:'center',
          }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'#E8F0FE', color:RM.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔔</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>Soft chime</div>
              <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>Robot's "lesson starting" sound</div>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={RM.accent}><path d="M8 5v14l11-7z"/></svg>
          </button>

          <button onClick={(e)=>{e.stopPropagation(); setPlayed('voice');}} style={{
            background:RM.card, border: played==='voice'? `2px solid ${RM.accent}` : `1px solid ${RM.hair}`,
            borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
            display:'flex', gap:14, alignItems:'center',
          }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'#E6F4EE', color:RM.good, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎤</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>Robot's voice</div>
              <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>"Hello! I'm so glad you're here."</div>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={RM.good}><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔊" title="Adjust volume" body="Currently 6 of 10" onClick={()=>go('rm_sound')}/>
          <DvRow icon="📐" title="Place Robot in the open" body="Not in a drawer or under a blanket"/>
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>I can hear Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_support')}>Robot sounds quiet or muffled</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 10. Factory Reset (parent-gated)
function S_RM_Factory({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [step, setStep] = React.useState('warning'); // warning | gate | confirm
  const [target] = React.useState(() => 100 + Math.floor(Math.random()*900));
  const [val, setVal] = React.useState('');
  const [shake, setShake] = React.useState(false);

  if (step === 'warning') {
    return (
      <DvShell title="Factory reset" onBack={()=>go('rm_my_robot')}>
        <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'#FBE6E2', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={RM.danger} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 17v.01"/><circle cx="12" cy="12" r="9"/></svg>
          </div>
          <div style={{ marginTop:18, fontSize:24, fontWeight:600, color:RM.ink, letterSpacing:-0.4, textAlign:'center' }}>
            This will erase your Robot
          </div>
          <div style={{ marginTop:8, fontSize:14, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
            Use this only if you're giving Robot to someone else, or troubleshooting with our support team.
          </div>
        </div>

        <div style={{ padding:'24px 16px 0' }}>
          <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
            <DvRow icon="🤖" title="Robot will forget your Wi-Fi" body="And the pairing with this app"/>
            <DvRow icon="📚" title="Courses will be removed" body="They stay in your library and re-download anytime"/>
            <DvRow icon="🌱" title="Your child's progress is safe" body="Stored in your account, not on the device"/>
            <DvRow icon="🔄" title="Robot will restart" body="Setup takes about 5 minutes"/>
          </div>
        </div>

        <div style={{ padding:'18px 16px 0' }}>
          <div style={{ background:'#FBE6E2', borderRadius:12, padding:'12px 14px', fontSize:13, color:'#7B2A1F', lineHeight:1.5, textWrap:'pretty' }}>
            <b>Have you tried smaller fixes?</b> Restarting Robot or rejoining Wi-Fi often solves the problem without erasing anything.
          </div>
        </div>

        <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
          <DvBigBtn secondary onClick={()=>go('rm_offline_help')}>Try smaller fixes first</DvBigBtn>
          <DvBigBtn danger onClick={()=>setStep('gate')}>I understand · continue</DvBigBtn>
        </div>
      </DvShell>
    );
  }

  if (step === 'gate') {
    const onPress = (k)=>{
      if (k==='back') return setVal(v=>v.slice(0,-1));
      const next = (val + k).slice(0,3);
      setVal(next);
      if (next.length === 3) {
        if (parseInt(next,10) === target) setTimeout(()=>setStep('confirm'), 200);
        else { setShake(true); setTimeout(()=>{ setShake(false); setVal(''); }, 350); }
      }
    };
    return (
      <DvShell title="Parent gate" onBack={()=>setStep('warning')}>
        <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ fontSize:13, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Type this number</div>
          <div style={{ marginTop:14, fontSize:60, fontWeight:700, color:RM.ink, letterSpacing:1, fontVariantNumeric:'tabular-nums' }}>{target}</div>
          <div style={{ marginTop:24, display:'flex', gap:10, animation: shake? 'rm-shake 0.32s' : 'none' }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ width:46, height:56, borderRadius:10, background:RM.card,
                border:`2px solid ${val.length>i ? RM.accent : RM.hair}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color:RM.ink, fontVariantNumeric:'tabular-nums' }}>
                {val[i] || ''}
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, fontSize:13, color: shake? RM.danger : RM.ink2, height:18 }}>
            {shake ? "Doesn't match. Try again." : 'This is just to keep little hands out.'}
          </div>
        </div>
        <div style={{ padding:'30px 24px 30px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            {[1,2,3,4,5,6,7,8,9,'',0,'back'].map((k, i)=>{
              if (k==='') return <div key={i}/>;
              const isBack = k==='back';
              return (
                <button key={i} onClick={(e)=>{e.stopPropagation(); onPress(isBack?'back':String(k));}} style={{
                  height:54, borderRadius:12, border:`1px solid ${RM.hair}`, background:RM.card,
                  fontSize:isBack?14:22, fontWeight:600, color:isBack?RM.ink2:RM.ink, cursor:'pointer', fontFamily:'inherit',
                }}>{isBack ? '⌫' : k}</button>
              );
            })}
          </div>
        </div>
        <style>{`@keyframes rm-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
      </DvShell>
    );
  }

  // confirm
  return (
    <DvShell title="Last check" onBack={()=>setStep('warning')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="gentle" size={150} accent={accent}/>
        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Erase Robot ROB-2A8F?
        </div>
        <div style={{ marginTop:8, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Robot will sleep, forget Wi-Fi, and need to be paired again.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🛡️" title="Account & progress kept" body="Sign in again to restore everything"/>
          <DvRow icon="⏱️" title="Takes about 90 seconds"/>
        </div>
      </div>
      <div style={{ padding:'30px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn danger onClick={()=>go('rm_my_robot')}>Yes, erase Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_my_robot')}>Cancel</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 11. Robot Offline Help
function S_RM_OfflineHelp({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Robot offline help" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'24px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="reconnect" size={150} accent={accent}/>
        <div style={{ marginTop:14 }}><RmChip color={RM.warn} bg="#FFF4D9">⚠️ Robot is offline</RmChip></div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Let's bring Robot back online
        </div>
        <div style={{ marginTop:6, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Try these in order. Most parents fix it in under a minute.
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {[
          { n:1, t:'Is Robot powered on?', b:"Look at the LCD face. If it's dark, place Robot on the dock or hold the top button for 2 seconds." },
          { n:2, t:'Is your Wi-Fi working?', b:'Open another app on your phone. If that fails too, restart your router.' },
          { n:3, t:'Move Robot closer', b:'Thick walls or a far room can drop the signal. Try the same room as the router.' },
          { n:4, t:'Restart Robot', b:'Hold the top button for 5 seconds. Robot will gently chime when it wakes up.' },
          { n:5, t:'Update Wi-Fi', b:'If your password changed, give Robot the new one.', cta:'Update Wi-Fi', go:'rm_wifi' },
        ].map(s=>(
          <div key={s.n} style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:RM.accent, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{s.n}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>{s.t}</div>
              <div style={{ fontSize:12, color:RM.ink2, lineHeight:1.5, marginTop:3, textWrap:'pretty' }}>{s.b}</div>
              {s.cta && <button onClick={(e)=>{e.stopPropagation(); go(s.go);}} style={{ marginTop:8, background:'transparent', border:'none', color:RM.accent, fontWeight:600, fontSize:13, fontFamily:'inherit', cursor:'pointer', padding:0 }}>{s.cta} →</button>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>Try connecting again</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_support')}>Still stuck · contact support</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ── 12. Contact Support
function S_RM_Support({ go }){
  const [topic, setTopic] = React.useState('hardware');
  const topics = [
    { id:'hardware', t:'Robot device' },
    { id:'sound',    t:'Sound or microphone' },
    { id:'wifi',     t:'Wi-Fi or pairing' },
    { id:'lessons',  t:'Lessons & courses' },
    { id:'account',  t:'Account & billing' },
    { id:'other',    t:'Something else' },
  ];
  return (
    <DvShell title="Contact support" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'18px 24px 0' }}>
        <div style={{ fontSize:13, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We're a small team and we read every message. Most replies arrive within a day.
        </div>
      </div>

      {/* Quick channels */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="💬" title="Chat with us" body="Mon–Fri · 9 AM – 6 PM ET" right={<span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:RM.good }}><span style={{ width:6, height:6, borderRadius:3, background:RM.good }}/>Online now</span>}/>
          <DvRow icon="✉️" title="Email support" body="hello@robotbuddy.app · reply in ~1 day"/>
          <DvRow icon="📚" title="Help articles" body="Setup, sounds, accounts, more"/>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Or send us a note</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ fontSize:12, color:RM.ink3, fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:0.4 }}>What's it about?</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {topics.map(t=>{
              const sel = topic===t.id;
              return (
                <button key={t.id} onClick={(e)=>{e.stopPropagation(); setTopic(t.id);}} style={{
                  border: sel? `1.5px solid ${RM.accent}` : `1px solid ${RM.hair}`,
                  background: sel? '#E8F0FE' : RM.card, color: sel? RM.accent : RM.ink2,
                  borderRadius:8, padding:'7px 12px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                }}>{t.t}</button>
              );
            })}
          </div>

          <div style={{ marginTop:14, fontSize:12, color:RM.ink3, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 }}>Tell us what's happening</div>
          <div style={{ background:'#F8F8F5', border:`1px solid ${RM.hair}`, borderRadius:10, padding:'12px 12px', minHeight:90, fontSize:14, color:RM.ink3, lineHeight:1.5 }}>
            Robot's voice cuts out halfway through lessons. We've tried…
          </div>

          <div style={{ marginTop:10, fontSize:11, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
            We'll attach a small device report (battery, Wi-Fi strength, software version). No audio, no transcripts.
          </div>
        </div>
      </div>

      {/* What we have */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Will be attached</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', flexWrap:'wrap', gap:6 }}>
          {['Robot ROB-2A8F','Software v1.4.2','Wi-Fi: strong','Battery: 78%','iOS app v3.1'].map(t=>(
            <span key={t} style={{ background:'#EEF1F5', color:RM.ink2, fontSize:11, fontWeight:600, padding:'4px 9px', borderRadius:6 }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>Send to support</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_my_robot')}>Cancel</DvBigBtn>
      </div>
    </DvShell>
  );
}

// ────────── Exports ──────────
const ROBOT_MGMT_STATES = [
  { id:'rm_my_robot',     title:'Robot · My Robot',           group:'Robot Mgmt' },
  { id:'rm_status',       title:'Robot · Status',             group:'Robot Mgmt' },
  { id:'rm_battery',      title:'Robot · Battery',            group:'Robot Mgmt' },
  { id:'rm_wifi',         title:'Robot · Wi-Fi',              group:'Robot Mgmt' },
  { id:'rm_storage',      title:'Robot · Courses installed',  group:'Robot Mgmt' },
  { id:'rm_firmware',     title:'Robot · Software update',    group:'Robot Mgmt' },
  { id:'rm_sound',        title:'Robot · Sound & volume',     group:'Robot Mgmt' },
  { id:'rm_mic_test',     title:'Robot · Microphone test',    group:'Robot Mgmt' },
  { id:'rm_speaker_test', title:'Robot · Speaker test',       group:'Robot Mgmt' },
  { id:'rm_factory',      title:'Robot · Factory reset',      group:'Robot Mgmt' },
  { id:'rm_offline_help', title:'Robot · Offline help',       group:'Robot Mgmt' },
  { id:'rm_support',      title:'Robot · Contact support',    group:'Robot Mgmt' },
];

const ROBOT_MGMT_SCREEN_MAP = {
  rm_my_robot:     S_RM_MyRobot,
  rm_status:       S_RM_Status,
  rm_battery:      S_RM_Battery,
  rm_wifi:         S_RM_Wifi,
  rm_storage:      S_RM_Storage,
  rm_firmware:     S_RM_Firmware,
  rm_sound:        S_RM_Sound,
  rm_mic_test:     S_RM_MicTest,
  rm_speaker_test: S_RM_SpeakerTest,
  rm_factory:      S_RM_Factory,
  rm_offline_help: S_RM_OfflineHelp,
  rm_support:      S_RM_Support,
};

Object.assign(window, { ROBOT_MGMT_STATES, ROBOT_MGMT_SCREEN_MAP });
