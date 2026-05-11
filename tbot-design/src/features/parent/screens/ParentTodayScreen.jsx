import React from 'react';
import { PA } from '../components/palette';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';

export default function ParentTodayPage({ go }){
  return (
    <ParentScroll title="Today" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'18px 16px 8px' }}>
        <div style={{ fontSize:13, color:PA.ink3, marginBottom:6 }}>Tuesday, Mar 12 · 4:12 PM</div>
        <div style={{ fontSize:20, fontWeight:600, letterSpacing:-0.3, lineHeight:1.3, marginBottom:18 }}>
          Mira practiced greetings, feelings, and three new words.
        </div>
      </div>

      <PRowGroup header="Lesson">
        <PRow icon="📖" label="How are you?" value="Unit 3 · Lesson 3"/>
        <PRow icon="⏱" label="Time on task" value="8 min"/>
        <PRow icon="🎤" label="Speaking turns" value="8" isLast/>
      </PRowGroup>

      <PRowGroup header="Words practiced" footer="We don't store voice recordings or transcripts. These summaries are generated from lesson activity.">
        {[
          { w:'Hello', s:'getting stronger' },
          { w:'Cat', s:'getting stronger' },
          { w:'Happy', s:'new this week' },
          { w:'Friend', s:'visit again soon' },
          { w:'Dog', s:'visit again soon' },
        ].map((r,i,a)=>(
          <PRow key={r.w} label={r.w} value={r.s} isLast={i===a.length-1}/>
        ))}
      </PRowGroup>

      <PRowGroup header="What's next">
        <PRow icon="→" label="Continue Unit 3" value="Lesson 4" chevron/>
        <PRow icon="↻" label="Review 2 words" chevron isLast/>
      </PRowGroup>

      <div style={{ height:24 }}/>
    </ParentScroll>
  );
}
