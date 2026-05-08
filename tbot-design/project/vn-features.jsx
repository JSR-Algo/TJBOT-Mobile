// VN feature pack — three additions, ONE unified screen per concept.
//  1. Auto Wi-Fi update
//  2. Gender color theme — Hồng / Xanh
//  3. Bilingual UI — VI + EN
// Header has live VI/EN + gender toggles. Each section reflects the current state.

const { useState } = React;
const { FaceV2 } = window;

const GIRL = { primary:'#FF8FB1', primarySoft:'#FFE2EC', accent:'#FFB6CF', label:'Bé gái', labelEn:'Girl' };
const BOY  = { primary:'#5DAEFF', primarySoft:'#DCEEFF', accent:'#8AC6FF', label:'Bé trai', labelEn:'Boy' };

const T = {
  hero_title: { vi:'Ba cải tiến mới', en:'Three new improvements' },
  hero_sub:   { vi:'Robot tự động kết nối Wi-Fi · giao diện theo giới tính · ưu tiên tiếng Việt.',
                en:'Auto Wi-Fi · gendered theme · Vietnamese-first.' },

  wifi_title: { vi:'1. Tự động cập nhật Wi-Fi', en:'1. Automatic Wi-Fi' },
  wifi_sub:   { vi:'Robot tự nhớ và kết nối lại mạng quen. Khi đổi router, ứng dụng phụ huynh đẩy mạng mới qua BLE — không cần cài lại.',
                en:'Robot remembers and reconnects to known networks. When the router changes, the parent app pushes new credentials over BLE — no re-setup.' },

  g_title:    { vi:'2. Bảng hiển thị theo giới tính', en:'2. Gendered theme' },
  g_sub:      { vi:'Hồng dịu cho bé gái, xanh trời cho bé trai. Vòng đèn LCD, nút và điểm nhấn đổi màu; chữ và mặt Robot giữ nguyên.',
                en:'Soft pink for girls, sky blue for boys. The LCD ring, buttons, and accents tint; type and Robot face stay the same.' },

  l_title:    { vi:'3. Tiếng Việt + English', en:'3. Vietnamese + English' },
  l_sub:      { vi:'Toàn ứng dụng song ngữ. Tiếng Việt mặc định cho thị trường Việt Nam; phụ huynh đổi bất cứ lúc nào trong Cài đặt.',
                en:'Full bilingual UI. Vietnamese is default in Vietnam; parents can switch anytime in Settings.' },

  home_hi:    { vi:'Chào An!', en:'Hi An!' },
  home_today: { vi:'Bài học hôm nay', en:"Today's lesson" },
  home_lesson:{ vi:'Tôi thích trái cây', en:'I like fruits' },
  home_meta:  { vi:'5 từ mới · 6 phút', en:'5 new words · 6 min' },
  home_start: { vi:'Bắt đầu học', en:'Start lesson' },
  home_streak:{ vi:'ngày liên tiếp', en:'day streak' },
  home_words: { vi:'từ đã học', en:'words learned' },

  wifi_status:{ vi:'Đã kết nối', en:'Connected' },
  wifi_auto:  { vi:'Tự động cập nhật khi đổi mạng', en:'Auto-update on network change' },
  wifi_auto_s:{ vi:'Robot luôn theo mạng nhà bạn', en:'Robot follows your home network' },
  wifi_signal:{ vi:'Tín hiệu mạnh', en:'Strong signal' },
  wifi_step1: { vi:'Phụ huynh chọn mạng mới trong app', en:'Parent picks new network' },
  wifi_step2: { vi:'App gửi thông tin đến Robot qua BLE', en:'App sends details to Robot over BLE' },
  wifi_step3: { vi:'Robot tự kết nối — không cần cài lại', en:'Robot reconnects — no setup' },
  wifi_flow:  { vi:'Tự động đẩy mạng đến Robot', en:'Auto push to Robot' },
  wifi_btn:   { vi:'Đổi mạng Wi-Fi', en:'Change Wi-Fi network' },

  lang_label: { vi:'Ngôn ngữ', en:'Language' },
  lang_pref:  { vi:'Tùy chọn ngôn ngữ', en:'Language preferences' },
  lang_rule_t:{ vi:'Quy tắc song ngữ', en:'Bilingual rules' },
  rule1: { vi:'Tiếng Việt mặc định khi tải về tại Việt Nam.', en:'Vietnamese is default in Vietnam.' },
  rule2: { vi:'Phụ huynh đổi ngôn ngữ trong Cài đặt › Ngôn ngữ.', en:'Parents switch in Settings › Language.' },
  rule3: { vi:'Nội dung tiếng Anh (từ vựng, câu mẫu) luôn giữ tiếng Anh.', en:'English content always stays in English.' },
  rule4: { vi:'Robot nói hướng dẫn bằng tiếng Việt; câu mẫu bằng tiếng Anh.', en:'Robot speaks instructions in VI; modeled phrases in EN.' },
  rule5: { vi:'Tiếng Việt dài hơn ~15% — bố cục đã chừa chỗ.', en:'Vietnamese runs ~15% longer — layouts have headroom.' },

  gender_label:{ vi:'Giới tính', en:'Gender' },
  current:    { vi:'Chủ đề hiện tại', en:'Current theme' },
  swatch:     { vi:'Màu áp dụng', en:'Applied colors' },
  applied:    { vi:'Áp dụng cho', en:'Applied to' },
  tag_ring:   { vi:'Vòng đèn LCD', en:'LCD ring' },
  tag_btn:    { vi:'Nút chính', en:'Primary button' },
  tag_avatar: { vi:'Ảnh đại diện', en:'Avatar' },
  tag_stat:   { vi:'Số liệu nổi bật', en:'Stat highlight' },
};

const ink = '#1B1820';
const muted = '#6B6675';
const paper = '#FBF8F2';
const rule = '#E8E3D6';

const Section = ({ kicker, title, sub, children }) => (
  <section style={{ padding:'80px 56px', borderTop:`1px solid ${rule}` }}>
    <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.18em', color:muted, textTransform:'uppercase', marginBottom:8 }}>{kicker}</div>
    <h2 style={{ margin:'0 0 10px', fontFamily:'"Fraunces",Georgia,serif', fontWeight:500, fontSize:48, lineHeight:1.04, letterSpacing:'-.02em', color:ink, textWrap:'balance' }}>{title}</h2>
    {sub && <p style={{ margin:'0 0 40px', fontSize:16, lineHeight:1.55, color:muted, maxWidth:720, textWrap:'pretty' }}>{sub}</p>}
    {children}
  </section>
);

function Phone({ children, w=320, h=672, theme }){
  return (
    <div style={{
      width:w+18, height:h+18, borderRadius:42,
      background:'#1B1820', padding:9, position:'relative',
      boxShadow:'0 30px 50px rgba(0,0,0,.18), 0 6px 14px rgba(0,0,0,.1)',
      flex:'0 0 auto',
    }}>
      <div style={{ width:w, height:h, borderRadius:34, overflow:'hidden', background:'#fff', position:'relative' }}>
        {children}
      </div>
    </div>
  );
}

function LCD({ emotion='idle', scale=0.7, ring }){
  const W=320;
  return (
    <div style={{ width:(W+28)*scale, padding:14*scale, background:'linear-gradient(180deg,#1B1F2A,#0E1118)', borderRadius:24*scale, position:'relative' }}>
      <div style={{ borderRadius:14*scale, overflow:'hidden', background:'#000', position:'relative' }}>
        <FaceV2 emotion={emotion} size={W*scale}/>
        {ring && <div style={{ position:'absolute', inset:6, borderRadius:14*scale, boxShadow:`inset 0 0 0 ${4*scale}px ${ring}`, pointerEvents:'none' }}/>}
      </div>
    </div>
  );
}

// ─── Canonical home screen — uses current language + theme ────
function HomeScreen({ lang, theme, name='An' }){
  const tx = (k) => T[k][lang];
  return (
    <div style={{ padding:'24px 20px', height:'100%', background:`linear-gradient(180deg, ${theme.primarySoft} 0%, #FFFCF6 50%)`, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ width:44, height:44, borderRadius:99, background:theme.primary, display:'grid', placeItems:'center', color:'#fff', fontWeight:700, fontSize:18 }}>{name[0]}</div>
        <button style={{ width:38, height:38, border:'none', background:'#fff', borderRadius:99, boxShadow:'0 1px 2px rgba(0,0,0,.05)', cursor:'pointer', fontSize:14 }}>⚙</button>
      </div>

      <div style={{ marginTop:18 }}>
        <div style={{ fontFamily:'"Fraunces",serif', fontSize:32, fontWeight:600, color:ink, lineHeight:1.05 }}>{tx('home_hi')}</div>
        <div style={{ fontSize:14, color:muted, marginTop:4 }}>{lang==='vi'?'Sẵn sàng học nào!':'Ready to learn!'}</div>
      </div>

      <div style={{ margin:'24px auto 14px', width:140, height:140, borderRadius:'50%', background:`radial-gradient(circle at 50% 35%, ${theme.accent}, ${theme.primary})`, display:'grid', placeItems:'center', boxShadow:`0 16px 30px ${theme.primary}40` }}>
        <div style={{ width:108, height:108, borderRadius:'50%', background:'#fff', display:'grid', placeItems:'center', position:'relative' }}>
          <div style={{ display:'flex', gap:18 }}>
            <div style={{ width:14, height:18, borderRadius:7, background:ink }}/>
            <div style={{ width:14, height:18, borderRadius:7, background:ink }}/>
          </div>
          <div style={{ position:'absolute', left:18, bottom:34, width:14, height:8, borderRadius:99, background:theme.primary, opacity:.7 }}/>
          <div style={{ position:'absolute', right:18, bottom:34, width:14, height:8, borderRadius:99, background:theme.primary, opacity:.7 }}/>
          <div style={{ position:'absolute', bottom:24, width:30, height:14, borderTop:'3px solid transparent', borderBottom:`3px solid ${ink}`, borderRadius:'0 0 50% 50%' }}/>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:22, padding:18, boxShadow:'0 4px 14px rgba(0,0,0,.06)' }}>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:10, letterSpacing:'.16em', color:muted, textTransform:'uppercase' }}>{tx('home_today')}</div>
        <div style={{ fontFamily:'"Fraunces",serif', fontSize:22, fontWeight:600, color:ink, marginTop:6 }}>{tx('home_lesson')}</div>
        <div style={{ fontSize:13, color:muted, marginTop:4 }}>{tx('home_meta')}</div>
        <button style={{ marginTop:14, width:'100%', background:theme.primary, color:'#fff', border:'none', padding:'14px', borderRadius:99, fontSize:15, fontWeight:700, cursor:'pointer' }}>{tx('home_start')}</button>
      </div>

      <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[{ v:'7', k:'home_streak' },{ v:'42', k:'home_words' }].map((s,i)=>(
          <div key={i} style={{ background:'#fff', borderRadius:16, padding:'14px 16px', boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
            <div style={{ fontFamily:'"Fraunces",serif', fontSize:28, fontWeight:600, color:theme.primary, lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:12, color:muted, marginTop:4 }}>{tx(s.k)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 1. WiFi — single phone with full auto flow on one screen ─
function WifiScreen({ lang, theme }){
  const tx = (k) => T[k][lang];
  return (
    <div style={{ padding:'24px 18px', display:'flex', flexDirection:'column', gap:14, height:'100%', background:'#FBF8F2' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button style={{ width:36, height:36, border:'none', background:'#fff', borderRadius:99, fontSize:18, cursor:'pointer', boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>‹</button>
        <div style={{ fontFamily:'"Fraunces",serif', fontSize:20, fontWeight:600, color:ink }}>{lang==='vi'?'Mạng Wi-Fi':'Wi-Fi network'}</div>
      </div>

      <div style={{ background:'#fff', borderRadius:18, padding:18, boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:theme.primarySoft, display:'grid', placeItems:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M2 8.5 Q12 1 22 8.5" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M5 12 Q12 6.5 19 12" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M8.5 15.5 Q12 12.5 15.5 15.5" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="19" r="2" fill={theme.primary}/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, color:ink, fontWeight:600 }}>Home_5G</div>
            <div style={{ fontSize:12, color:'#1A8E5C', fontWeight:600, marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:99, background:'#1A8E5C' }}/>{tx('wifi_status')}
            </div>
          </div>
          <div style={{ display:'flex', gap:2, alignItems:'flex-end' }}>
            {[6,10,14,18].map((h,i)=>(<div key={i} style={{ width:4, height:h, borderRadius:1, background:theme.primary }}/>))}
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:18, padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ flex:1, paddingRight:12 }}>
          <div style={{ fontSize:14, fontWeight:600, color:ink }}>{tx('wifi_auto')}</div>
          <div style={{ fontSize:12, color:muted, marginTop:3, lineHeight:1.4 }}>{tx('wifi_auto_s')}</div>
        </div>
        <div style={{ width:46, height:28, borderRadius:99, background:theme.primary, position:'relative', flex:'0 0 auto' }}>
          <div style={{ position:'absolute', top:3, right:3, width:22, height:22, borderRadius:99, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.2)' }}/>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:18, padding:'16px 18px' }}>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:10, letterSpacing:'.16em', color:muted, textTransform:'uppercase', marginBottom:12 }}>{tx('wifi_flow')}</div>
        {['wifi_step1','wifi_step2','wifi_step3'].map((k,i)=>(
          <div key={k} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 0', borderTop: i?`1px solid ${rule}`:'none' }}>
            <div style={{ width:26, height:26, borderRadius:99, background:theme.primary, color:'#fff', display:'grid', placeItems:'center', fontSize:12, fontWeight:700, flex:'0 0 auto', marginTop:1 }}>{i+1}</div>
            <div style={{ flex:1, fontSize:13, color:ink, fontWeight:500, lineHeight:1.45 }}>{tx(k)}</div>
          </div>
        ))}
      </div>

      <button style={{ marginTop:'auto', background:theme.primary, color:'#fff', border:'none', padding:'14px', borderRadius:99, fontSize:15, fontWeight:700, cursor:'pointer' }}>{tx('wifi_btn')}</button>
    </div>
  );
}

function WifiSection({ lang, theme }){
  const items = [
    { k:'wifi_step1', n:'01' },
    { k:'wifi_step2', n:'02' },
    { k:'wifi_step3', n:'03' },
  ];
  return (
    <Section kicker="01 · Wi-Fi" title={T.wifi_title[lang]} sub={T.wifi_sub[lang]}>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:64, alignItems:'center' }}>
        <Phone w={320} h={672} theme={theme}>
          <WifiScreen lang={lang} theme={theme}/>
        </Phone>

        <div>
          <div style={{ display:'flex', flexDirection:'column', gap:0, maxWidth:520 }}>
            {items.map((it, i)=>(
              <div key={it.k} style={{ display:'flex', alignItems:'flex-start', gap:18, padding:'24px 0', borderTop: i?`1px solid ${rule}`:'none' }}>
                <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, color:muted, letterSpacing:'.14em', flex:'0 0 36px', paddingTop:4 }}>{it.n}</div>
                <div style={{ flex:1, fontSize:17, color:ink, lineHeight:1.45, fontWeight:500 }}>{T[it.k][lang]}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:36, display:'flex', alignItems:'center', gap:24, padding:'20px 24px', background:'#fff', borderRadius:18, border:`1px solid ${rule}` }}>
            <LCD emotion="reconnect" scale={0.5} ring={theme.primary}/>
            <div style={{ flex:1, fontSize:14, color:muted, lineHeight:1.55 }}>
              {lang==='vi'
                ? <>Khi nhận mạng mới, mặt Robot hiển thị trạng thái <b style={{ color:ink }}>đang kết nối lại</b> trong vài giây, sau đó về trạng thái nghỉ. Không cần thao tác từ trẻ.</>
                : <>While reconnecting, the Robot face shows a <b style={{ color:ink }}>reconnect</b> state for a few seconds, then returns to idle. No action needed from the child.</>}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 2. Gender — ONE phone showing current theme ──────────────
function GenderSection({ lang, gender, theme }){
  const otherTheme = gender==='girl' ? BOY : GIRL;
  return (
    <Section kicker="02 · Theme" title={T.g_title[lang]} sub={T.g_sub[lang]}>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:64, alignItems:'center' }}>
        <Phone w={320} h={672} theme={theme}>
          <HomeScreen lang={lang} theme={theme} name={gender==='girl'?'Linh':'An'}/>
        </Phone>

        <div style={{ maxWidth:560 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <span style={{ width:14, height:14, borderRadius:99, background:theme.primary }}/>
            <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.16em', color:muted, textTransform:'uppercase' }}>{T.current[lang]}</span>
          </div>
          <div style={{ fontFamily:'"Fraunces",serif', fontSize:34, fontWeight:500, color:ink, marginBottom:4, letterSpacing:'-.015em' }}>
            {gender==='girl' ? (lang==='vi'?'Hồng dịu — Bé gái':'Soft pink — Girl') : (lang==='vi'?'Xanh trời — Bé trai':'Sky blue — Boy')}
          </div>
          <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:12, color:muted, marginBottom:28 }}>{theme.primary}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderTop:`1px solid ${rule}`, borderBottom:`1px solid ${rule}` }}>
            {[
              { k:'tag_avatar', c:theme.primary },
              { k:'tag_btn',    c:theme.primary },
              { k:'tag_ring',   c:theme.primary },
              { k:'tag_stat',   c:theme.primary },
            ].map((row, i)=>(
              <div key={i} style={{ padding:'18px 0', display:'flex', alignItems:'center', gap:14, borderTop: i>=2?`1px solid ${rule}`:'none', paddingLeft: i%2?20:0, paddingRight: i%2?0:20, borderRight: i%2===0?`1px solid ${rule}`:'none' }}>
                <span style={{ width:28, height:28, borderRadius:8, background:row.c, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.06)' }}/>
                <span style={{ fontSize:14, color:ink, fontWeight:500 }}>{T[row.k][lang]}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop:32, display:'flex', alignItems:'center', gap:18, padding:'18px 22px', background:'#fff', borderRadius:14, border:`1px solid ${rule}` }}>
            <span style={{ width:40, height:40, borderRadius:99, background:otherTheme.primary, flex:'0 0 auto' }}/>
            <div style={{ flex:1, fontSize:13, color:muted, lineHeight:1.55 }}>
              {lang==='vi'
                ? <>Đổi sang <b style={{ color:ink }}>{gender==='girl'?'Bé trai':'Bé gái'}</b> bằng nút phía trên — toàn bộ ứng dụng và vòng đèn Robot sẽ chuyển sang {gender==='girl'?'xanh trời':'hồng dịu'}.</>
                : <>Toggle to <b style={{ color:ink }}>{gender==='girl'?'Boy':'Girl'}</b> in the header — the whole app and Robot ring switch to {gender==='girl'?'sky blue':'soft pink'}.</>}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 3. Language — ONE phone with picker reflecting current ───
function LanguageScreen({ lang, theme, onChange }){
  return (
    <div style={{ padding:'24px 20px', height:'100%', background:'#FBF8F2', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button style={{ width:36, height:36, border:'none', background:'#fff', borderRadius:99, fontSize:18, cursor:'pointer', boxShadow:'0 1px 2px rgba(0,0,0,.06)' }}>‹</button>
        <div style={{ fontFamily:'"Fraunces",serif', fontSize:22, fontWeight:600, color:ink }}>{T.lang_label[lang]}</div>
      </div>

      <div style={{ background:'#fff', borderRadius:18, overflow:'hidden' }}>
        {[
          { code:'vi', native:'Tiếng Việt', flag:'🇻🇳', sub:'Vietnamese · Mặc định / Default' },
          { code:'en', native:'English',    flag:'🇺🇸', sub:'English · Tiếng Anh' },
        ].map((row,i)=>(
          <button key={row.code} onClick={()=>onChange(row.code)} style={{
            width:'100%', border:'none', background:'transparent', cursor:'pointer',
            display:'flex', alignItems:'center', gap:14, padding:'16px 18px',
            borderTop: i?`1px solid ${rule}`:'none', textAlign:'left',
          }}>
            <div style={{ width:42, height:42, borderRadius:12, background:theme.primarySoft, display:'grid', placeItems:'center', fontSize:22 }}>{row.flag}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, color:ink }}>{row.native}</div>
              <div style={{ fontSize:12, color:muted, marginTop:2 }}>{row.sub}</div>
            </div>
            <div style={{ width:22, height:22, borderRadius:99, border:`2px solid ${lang===row.code?theme.primary:rule}`, background: lang===row.code?theme.primary:'#fff', display:'grid', placeItems:'center' }}>
              {lang===row.code && <div style={{ width:8, height:8, borderRadius:99, background:'#fff' }}/>}
            </div>
          </button>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:18, padding:'16px 18px' }}>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:10, letterSpacing:'.16em', color:muted, textTransform:'uppercase', marginBottom:8 }}>{lang==='vi'?'Xem trước trên Trang chủ':'Preview on Home'}</div>
        <div style={{ fontFamily:'"Fraunces",serif', fontSize:20, fontWeight:600, color:ink }}>{T.home_hi[lang]}</div>
        <div style={{ fontSize:13, color:muted, marginTop:4 }}>{T.home_today[lang]} · {T.home_lesson[lang]}</div>
      </div>

      <div style={{ background:theme.primarySoft, borderRadius:18, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:99, background:'#fff', display:'grid', placeItems:'center' }}>
          <span style={{ color:theme.primary, fontSize:16 }}>i</span>
        </div>
        <div style={{ fontSize:12, color:ink, lineHeight:1.5 }}>
          {lang==='vi'
            ? 'Robot nói hướng dẫn bằng tiếng Việt. Từ vựng và câu mẫu giữ nguyên tiếng Anh.'
            : 'Robot speaks instructions in Vietnamese. Vocabulary and model sentences stay in English.'}
        </div>
      </div>
    </div>
  );
}

function LanguageSection({ lang, setLang, theme }){
  return (
    <Section kicker="03 · Language" title={T.l_title[lang]} sub={T.l_sub[lang]}>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:64, alignItems:'center' }}>
        <Phone w={320} h={672} theme={theme}>
          <LanguageScreen lang={lang} theme={theme} onChange={setLang}/>
        </Phone>

        <div style={{ maxWidth:560 }}>
          <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.16em', color:muted, textTransform:'uppercase', marginBottom:14 }}>{T.lang_rule_t[lang]}</div>
          <div style={{ borderTop:`1px solid ${rule}` }}>
            {['rule1','rule2','rule3','rule4','rule5'].map((r,i)=>(
              <div key={r} style={{ display:'flex', gap:18, padding:'18px 0', borderBottom:`1px solid ${rule}` }}>
                <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, color:muted, letterSpacing:'.14em', flex:'0 0 36px', paddingTop:3 }}>{String(i+1).padStart(2,'0')}</div>
                <div style={{ flex:1, fontSize:15, color:ink, lineHeight:1.5 }}>{T[r][lang]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── App shell ──────────────────────────────────────────────
function VNApp(){
  const [lang, setLang] = useState('vi');
  const [gender, setGender] = useState('girl');
  const theme = gender==='girl' ? GIRL : BOY;

  return (
    <div data-persona="parent" style={{ background:paper, color:ink, minHeight:'100vh', fontFamily:'-apple-system,"SF Pro Text",Inter,system-ui,sans-serif' }}>
      <header style={{ padding:'56px 56px 36px' }}>
        <div style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.22em', color:muted, textTransform:'uppercase', marginBottom:14 }}>
          TBOT · Vietnam Feature Pack · v1.0
        </div>
        <h1 style={{ margin:0, fontFamily:'"Fraunces",Georgia,serif', fontWeight:400, fontSize:80, lineHeight:0.96, letterSpacing:'-.035em', maxWidth:1100, textWrap:'balance' }}>
          {T.hero_title[lang]}
        </h1>
        <p style={{ margin:'18px 0 0', fontSize:18, color:muted, maxWidth:760, lineHeight:1.5 }}>{T.hero_sub[lang]}</p>

        <div style={{ marginTop:32, display:'flex', gap:14, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'#fff', borderRadius:99, border:`1px solid ${rule}` }}>
            <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.14em', color:muted, textTransform:'uppercase' }}>{T.lang_label[lang]}</span>
            <div style={{ display:'flex', gap:4, padding:3, background:'#F3EFE6', borderRadius:99 }}>
              {['vi','en'].map(l=>(
                <button key={l} onClick={()=>setLang(l)} style={{
                  border:'none', background: lang===l?'#fff':'transparent', color: lang===l?ink:muted,
                  padding:'5px 14px', borderRadius:99, cursor:'pointer', fontWeight:600, fontSize:12,
                  boxShadow: lang===l?'0 1px 2px rgba(0,0,0,.08)':'none',
                }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'#fff', borderRadius:99, border:`1px solid ${rule}` }}>
            <span style={{ fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.14em', color:muted, textTransform:'uppercase' }}>{T.gender_label[lang]}</span>
            <div style={{ display:'flex', gap:4, padding:3, background:'#F3EFE6', borderRadius:99 }}>
              {[
                { v:'girl', l:lang==='vi'?'Bé gái':'Girl', c:GIRL.primary },
                { v:'boy',  l:lang==='vi'?'Bé trai':'Boy', c:BOY.primary },
              ].map(g=>(
                <button key={g.v} onClick={()=>setGender(g.v)} style={{
                  border:'none', background: gender===g.v?'#fff':'transparent', color: gender===g.v?ink:muted,
                  padding:'5px 14px', borderRadius:99, cursor:'pointer', fontWeight:600, fontSize:12, display:'inline-flex', alignItems:'center', gap:6,
                  boxShadow: gender===g.v?'0 1px 2px rgba(0,0,0,.08)':'none',
                }}>
                  <span style={{ width:8, height:8, borderRadius:99, background:g.c }}/>
                  {g.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <WifiSection lang={lang} theme={theme}/>
      <GenderSection lang={lang} gender={gender} theme={theme}/>
      <LanguageSection lang={lang} setLang={setLang} theme={theme}/>

      <footer style={{ padding:'48px 56px', borderTop:`1px solid ${rule}`, fontFamily:'ui-monospace,Menlo', fontSize:11, letterSpacing:'.22em', color:muted, textTransform:'uppercase' }}>
        TBOT · VN Feature Pack · End
      </footer>
    </div>
  );
}

window.VNFeaturesPage = VNApp;
