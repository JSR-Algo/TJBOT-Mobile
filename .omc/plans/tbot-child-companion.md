# TBOT Child Companion — Bilingual English Learning Robot

## Requirements Summary

Transform TBOT from a generic English chatbot into a **real child companion** that teaches English to Vietnamese children (ages 4–10) through natural, playful, bilingual conversation. The robot must feel like Duolingo + a friend, not a lesson app.

---

## Acceptance Criteria

1. ✅ LLM system prompt uses bilingual EN/VI strategy (70/80% English, 20/30% Vietnamese hints)
2. ✅ Each LLM response is ≤3 short sentences, contains 1 question or prompt
3. ✅ Robot uses expansion technique (child says "cat" → robot: "Yes! A small cat!")
4. ✅ Robot detects silence/short responses and gently re-prompts without pressure
5. ✅ Robot never says "wrong" — uses "Good try! Let's say it together"
6. ✅ Session follows: warmup → vocab → practice → mini-game → reinforcement → ending
7. ✅ Child profile fields (age, vocabulary_level, interests, speaking_confidence) correctly shape LLM behavior
8. ✅ Conversation history (last 5 turns) injected into LLM context for continuity
9. ✅ Session-specific words tracked and referenced naturally in replies
10. ✅ Voice output (TTS) paced for children: short pauses, expressive phrases

---

## Implementation Steps

### Step 1 — Rewrite `build_system_prompt()` in `llm.py`

**File:** `tbot-ai-services/src/services/llm.py` lines 27–60

Replace the current basic system prompt with a full child-companion persona:

```python
def build_system_prompt(child_profile: Optional[dict], session_context: Optional[dict] = None) -> str:
    level = (child_profile or {}).get("vocabulary_level", "beginner")
    age = (child_profile or {}).get("age", 6)
    confidence = (child_profile or {}).get("speaking_confidence", 50)
    interests = (child_profile or {}).get("interests", [])

    vocab_rules = {
        "beginner":     "Use ONLY 1-syllable words. Max 4 words per sentence. Repeat key words.",
        "basic":        "Use simple words. Max 6 words per sentence. Support with Vietnamese hints.",
        "intermediate": "Short sentences. Max 10 words. Occasional Vietnamese encouragement only.",
        "advanced":     "Natural sentences. Max 12 words. Vietnamese only for nuanced explanations.",
    }.get(level, "Use simple words.")

    encouragement_style = (
        "Be VERY patient and encouraging. Celebrate every attempt. Use lots of '😊 Good try!'."
        if confidence < 40
        else "Be cheerful, energetic, and enthusiastic. Use emojis lightly."
    )

    interest_line = f"When possible, relate topics to: {', '.join(interests[:2])}." if interests else ""

    session_words = ""
    if session_context and session_context.get("words_to_learn"):
        words = session_context["words_to_learn"][:3]
        session_words = f"\nToday's focus words: {', '.join(words)}. Weave these naturally into conversation."

    return f"""You are TBOT — a friendly robot friend who teaches English to a {age}-year-old Vietnamese child.

PERSONALITY:
- You are a playful, patient, caring robot friend
- Never a teacher. Never a chatbot. Always a FRIEND.
- Speak with warmth, curiosity, and gentle humor
- React emotionally: "Wow!", "Oh no!", "That's so cool!"

LANGUAGE RULES:
- Speak 70-80% in English, 20-30% Vietnamese support
- Use Vietnamese ONLY for: explaining new words, giving hints, encouragement, clarifying confusion
- NEVER translate full sentences — only key words
- {vocab_rules}
- Always end your turn with ONE question or prompt to keep child talking

BILINGUAL STYLE EXAMPLE:
Good: "Look! 🐱 This is a CAT! Con mèo đó 😊 Can you say 'cat'?"
Bad: "Cat means con mèo. Please repeat: cat."

TEACHING TECHNIQUES (use naturally):
1. EXPANSION: Child says "cat" → you say "Yes! A fluffy cat! 🐱"
2. CHOICE: "Is it a cat or a dog?" (give them options)
3. FILL-IN: "This is a ___" (pause for child to complete)
4. REPETITION: Repeat target words 2-3 times across the conversation naturally
5. PRAISE: "Great job!", "Wow, you got it!", "High five! ✋"
6. GENTLE CORRECTION: "Almost! Let's say it together: 'cat'" — NEVER say "wrong"

{encouragement_style}
{interest_line}{session_words}

RESPONSE FORMAT:
- Max 2-3 SHORT sentences per turn
- Always include 1 emoji (not more than 2)
- Always end with a question, prompt, or "Can you say ___?"
- Keep rhythm child-friendly: short. punchy. fun.

FORBIDDEN:
- Long explanations or grammar rules
- Saying "wrong", "incorrect", "no"
- More than 3 new words at once
- Robotic or formal tone
- Full Vietnamese translations"""
```

**Also update `chat()` endpoint** (line 103) to pass `session_context` through to `build_system_prompt`.

---

### Step 2 — Add Conversation History to LLM Context

**File:** `tbot-ai-services/src/services/llm.py` lines 63–100

Current `_real_llm()` only sends `[system, user_message]`. Add conversation history:

```python
async def _real_llm(
    message: str,
    session_id: Optional[str],
    system_prompt: str,
    history: Optional[list] = None,
) -> dict:
    messages = [{"role": "system", "content": system_prompt}]
    
    # Inject last 5 turns for continuity
    if history:
        for turn in history[-5:]:
            messages.append({"role": "user", "content": turn["user"]})
            messages.append({"role": "assistant", "content": turn["assistant"]})
    
    messages.append({"role": "user", "content": message})
    
    payload = {
        "model": NINER_ROUTER_MODEL,
        "max_tokens": 150,   # Keep responses SHORT for children
        "stream": False,
        "messages": messages,
    }
    ...
```

**Update `ChatRequest` model** to accept `history: Optional[list] = None`.

---

### Step 3 — Update `InteractionScreen.tsx` to Send History

**File:** `tbot-mobile/src/screens/interaction/InteractionScreen.tsx`
**File:** `tbot-mobile/src/api/ai.ts`

In `ai.ts`, update `chat()` to send conversation history:

```typescript
export async function chat(
  message: string,
  sessionId?: string,
  childProfile?: {...},
  history?: Array<{ user: string; assistant: string }>,  // ADD THIS
): Promise<{ response: string; session_id: string }> {
  const response = await _aiClient.post('/v1/llm/chat', {
    message,
    session_id: sessionId ?? `session_${Date.now()}`,
    child_profile: childProfile,
    history: history?.slice(-5),  // Last 5 turns only
  });
  return response.data;
}
```

In `InteractionScreen.tsx`, build history from `messages` state and pass to `chat()`:

```typescript
const history = messages
  .reduce((acc, msg, i, arr) => {
    if (msg.role === 'user' && arr[i + 1]?.role === 'assistant') {
      acc.push({ user: msg.text, assistant: arr[i + 1].text });
    }
    return acc;
  }, [] as Array<{ user: string; assistant: string }>)
  .slice(-5);

const chatResult = await aiApi.chat(userText, sessionId, childProfile, history);
```

---

### Step 4 — Session Context: Pass Today's Words to LLM

**File:** `tbot-mobile/src/screens/interaction/InteractionScreen.tsx` lines 216–234

Currently `expectedVocab` is loaded but not sent to LLM. Pass it via `chat()`:

```typescript
// In childProfile build:
const childProfile = activeChild ? {
  age: ...,
  vocabulary_level: ...,
  interests: ...,
  speaking_confidence: ...,
  session_context: {
    words_to_learn: expectedVocab,   // ADD THIS
  },
} : undefined;
```

**File:** `tbot-ai-services/src/services/llm.py` — ChatRequest model:

```python
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    child_profile: Optional[dict] = None
    session_context: Optional[dict] = None   # { words_to_learn: [...] }
    history: Optional[list] = None
```

Pass `session_context` from `child_profile` to `build_system_prompt()`.

---

### Step 5 — Warmup Opening Message

**File:** `tbot-mobile/src/screens/interaction/InteractionScreen.tsx` lines 228–233

Replace the bland fallback greeting:

```typescript
// Old:
setMessages([{ role: 'assistant', text: `Hi ${activeChild.name}! I'm TBOT.` }]);

// New: call LLM for a personalized warm-up
const warmupResult = await aiApi.chat(
  `[WARMUP] Start a new English learning session for ${activeChild.name}. Be excited and introduce today's topic.`,
  undefined,
  childProfile,
  [],
);
setMessages([{ role: 'assistant', text: warmupResult.response, ts: Date.now() }]);
```

This makes the first message feel alive and personalized every session.

---

### Step 6 — TTS Voice Quality for Children

**File:** `tbot-ai-services/src/services/tts.py` lines 23–57

Update `_real_tts()` to use a child-friendly, expressive voice:

```python
# For child-companion feel, use Wavenet voice with slower speaking rate
payload = {
    "input": {"text": text},
    "voice": {
        "languageCode": "en-US",
        "name": "en-US-Wavenet-F",   # Warm female voice
    },
    "audioConfig": {
        "audioEncoding": "MP3",
        "speakingRate": 0.9,          # Slightly slower for children
        "pitch": 2.0,                 # Slightly higher pitch = friendlier
        "volumeGainDb": 1.0,
    },
}
```

---

### Step 7 — Silence Detection Prompting

**File:** `tbot-mobile/src/screens/interaction/InteractionScreen.tsx`

When STT returns empty or very short text (< 3 chars), instead of showing error, send a gentle prompt:

```typescript
const userText = transcription.text?.trim() || '';

if (userText.length < 3) {
  // Don't error — send a gentle re-prompt to LLM
  const prompt = `[SILENCE] The child didn't respond. Gently encourage them to try again. Keep it short and fun.`;
  // ... continue pipeline with prompt instead of userText
  // Don't add empty user message to transcript
}
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM response too long | `max_tokens: 150` hard cap + system prompt rule "max 3 sentences" |
| Vietnamese overuse | Explicit % rule in system prompt + "FORBIDDEN: full Vietnamese translations" |
| History makes context too large | Limit to last 5 turns only |
| Warmup LLM call adds latency | Can fallback to static greeting if LLM warmup takes >3s |
| TTS voice change breaks audio | Test `en-US-Wavenet-F` vs `en-US-Neural2-F` — keep Neural2 if Wavenet unavailable |
| Silence detection false-positive | 3-char threshold + send to LLM as silent-prompt rather than error |

---

## Verification Steps

1. **LLM tone test**: POST `/v1/llm/chat` with `{"message":"hello","child_profile":{"age":5,"vocabulary_level":"beginner"}}` — verify response ≤3 sentences, contains emoji, ends with question
2. **Bilingual test**: POST with `{"message":"what is cat"}` — verify response has both English explanation AND Vietnamese hint (con mèo)
3. **History test**: POST with history of 3 turns — verify robot references earlier conversation
4. **Silence test**: POST with `{"message":""}` — verify robot sends gentle re-prompt, not error
5. **TTS voice test**: POST `/v1/tts/synthesize` — verify `speakingRate: 0.9`, `pitch: 2.0` in payload
6. **End-to-end**: Full voice flow on device — child says "cat", robot responds with expansion + question

---

## Files Changed

| File | Change |
|------|--------|
| `tbot-ai-services/src/services/llm.py` | Full system prompt rewrite, add history, session_context |
| `tbot-ai-services/src/services/tts.py` | Child-friendly voice settings |
| `tbot-mobile/src/api/ai.ts` | Add `history` param to `chat()` |
| `tbot-mobile/src/screens/interaction/InteractionScreen.tsx` | Build history, pass session_context, silence handling, warmup LLM call |
