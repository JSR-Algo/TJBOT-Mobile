import React from 'react';
import { PA } from '../components/palette';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';

export default function ParentSafetyPage({ go }){
  const Section = ({ title, body, items }) => (
    <div style={{ padding:'18px 20px 4px' }}>
      <div style={{ fontSize:16, fontWeight:600, color:PA.ink, marginBottom:6, letterSpacing:-0.2 }}>{title}</div>
      {body && <div style={{ fontSize:14, color:PA.ink2, lineHeight:1.5, marginBottom: items? 10:0 }}>{body}</div>}
      {items && (
        <ul style={{ margin:0, padding:'0 0 0 18px', color:PA.ink2, fontSize:14, lineHeight:1.6 }}>
          {items.map((x,i)=> <li key={i} style={{ marginBottom:4 }}>{x}</li>)}
        </ul>
      )}
    </div>
  );
  return (
    <ParentScroll title="Safety & Privacy" onBack={()=>go('parent_summary')}>
      <Section
        title="Microphone"
        body="The microphone turns on only during a lesson, while your child is speaking with the robot. It turns off automatically when the lesson ends or the app goes to the background."
      />
      <Section
        title="Voice data"
        items={[
          'Your child\'s voice is processed in real time and is not saved.',
          'We do not store audio recordings.',
          'We do not store word-by-word transcripts.',
          'Lesson summaries (which words were practiced, how long) are saved for 30 days.',
        ]}
      />
      <Section
        title="Child safety"
        items={[
          'No chat, friends, or social features.',
          'No advertising. No third-party trackers.',
          'No links out of the app from the play area.',
          'Purchases and account changes live in Parent Space only.',
        ]}
      />
      <Section
        title="What we collect"
        body="A pseudonymous learner ID, lesson summaries (last 30 days), app version, and crash diagnostics. We do not collect contact info or location."
      />

      <PRowGroup>
        <PRow icon="📄" label="Privacy Policy" chevron/>
        <PRow icon="📄" label="Terms of Service" chevron/>
        <PRow icon="✉" label="Contact privacy team" chevron isLast/>
      </PRowGroup>

      <div style={{ padding:'10px 20px 36px', fontSize:12, color:PA.ink3, lineHeight:1.5 }}>
        Robot English is designed for children ages 5–9 and complies with children's privacy regulations including COPPA and GDPR-K.
      </div>
    </ParentScroll>
  );
}
