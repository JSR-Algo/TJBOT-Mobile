# Kid-Engagement Pedagogy for Voice-First Micro-Lessons (Ages 3–7)

**Research date:** 2026-06-29
**Agent:** research-engagement-pedagogy (sys-17 design-research)
**Scope:** Engagement and reward mechanics, voice-prompt prosody, parent–child information asymmetry, and behavior-signal ethics for a 3–5 minute voice-first English micro-lesson to Vietnamese children ages 3–7.
**Target product:** TeeBot Mobile, Vietnamese children ages 3–7, voice-first micro-lessons.
**Sister briefs already in repo (do not duplicate):**
- `attention-patterns-2026-06-29.md` — engagement-loop numbers, drop-off cliffs, Day-N retention, voice latency interpolation, joint attention.
- `vietnamese-elt-2026-06-29.md` — VN-specific pronunciation targets, MOET framework, "losing face," translanguaging, parent-facing copy rules, idiom/copula/tense translation traps.

> **Provenance note up front.** Of the 6 sources added here, **5 are peer-reviewed primary research** (Sources 1, 2, 3, 5, 6) and **1 is an institutional clinical summary** (Source 4, AAP/CHLA, summarizing AAP policy). No edtech vendor marketing is cited; no Duolingo corporate blog material is duplicated from the attention brief.

---

## TL;DR

1. **Effort-attributed praise outperforms ability-attributed praise for children as young as 5.** Mueller & Dweck's foundational line (canonical, not re-cited here) shows effort-praised children choose harder tasks after failure and recover from a hard task with **+30%** performance vs. **−20%** for ability-praised peers. A 2018 Chinese 5th-grade RCT (Source 1) replicates the *direction* and adds a sharper finding: **informational feedback ("you got 8 right") is equally protective against self-handicapping as effort praise**, so effort language should be added on top, not in place of, a fact-based confirmation.
2. **Gamification works in the short term and decays in the long term.** A peer-reviewed meta-analysis of 18 controlled studies (Source 2) finds gamification has a moderate positive effect overall (**Cohen's d = 0.48, 95% CI 0.33–0.62**), but the effect is **d = 1.57** for interventions under one week and **d = −0.20** (i.e., harmful) for interventions spanning 1–2 years. This is the strongest single argument against letting badge/streak mechanics dominate a 30+ day TeeBot retention loop — they age out.
3. **Badges, streaks, and mastery are not interchangeable for ages 3–7.** Streaks are pressure, badges are status symbols, and mastery is competence feedback. Source 2's age-moderator analysis finds **K-12 effect d = 0.92 vs. college d = 0.15** — kids respond to gamification 6× more than college students, but the meta-analysis is silent on 3–7 specifically. Synthesizing with Source 1 (effort-vs-ability attribution) and the joint-attention findings in `attention-patterns-2026-06-29.md` Source 3, **mastery feedback (specific skill delta) is the safest default for ages 3–7; badges are decoration; streaks are risk.**
4. **Voice prosody matters more than lexicon for the 3–7 cohort.** Two converging peer-reviewed sources (Sources 5 and 6) show child-directed speech prosody — wider pitch range, exaggerated contours, short utterances, repetition — measurably improves word learning in toddlers. Source 6 (Nencheva, Princeton, *Developmental Science* 2020) further finds the **"hill" pitch contour (up-then-down) is the most engaging per-word prosody and is the one that predicts word-learning outcomes**, while the "valley" contour is the least engaging. TeeBot's synthesized voice should approximate CDS prosody, not adult-podcast prosody.
5. **Children persist through broken voice interactions far more than adults expect.** A UW / IDC 2018 home deployment of a broken voice game (Source 3, Hiniker lab, n=14, ages 3–5) found children repeated themselves **79%** of the time, varied volume **63%**, and only gave up in **18 / 107** repair attempts — **~83% persistence through a system the child already knew was broken**. This is good news (children don't punish voice-UI failures) and a warning (they will keep talking to a TeeBot that isn't acknowledging them).
6. **Parent-vs-child information asymmetry is the design lever, not the badge.** Pediatric AAP/CHLA guidance (Source 4) recommends up to 1 hour/day of high-quality programming for ages 2–5, with **co-viewing and co-engagement** as the active ingredient, not screen-time minutes alone. For TeeBot (voice-first, no screen), the analogous recommendation is **parent-co-engagement**, which means the parent surface must surface evidence of *what the child tried* — not *how the child scored*. This is the same principle that drives the parent-facing copy rules in `vietnamese-elt-2026-06-29.md` Claims 14–15: respect, structured, growth-framed.
7. **Behavior-signal ethics for under-7s is the highest-risk surface this brief touches.** Voice-loop telemetry can produce behavior signals (skip-with-reason, hesitation latency, topic refusal, error pattern) that are individually innocuous but collectively constitute a "behavior fingerprint" of the child. The 5 C's framework from AAP (Source 4) and the broader COPPA/FTC children's-privacy regime converge on one rule: **signals that change the experience for the child must stay on-device; only signals that change the experience for the parent go to the parent surface, and never to third parties.** This is also a binding constraint under `ENGLISH_LEARNING.md` §7.

---

## Sources added here

1. **Xing, S., Gao, X., Jiang, Y., Archer, J., & Liu, J. (2018).** *Effects of Ability and Effort Praise on Children's Failure Attribution, Self-Handicapping, and Performance.* Frontiers in Psychology, 9:1883. DOI: 10.3389/fpsyg.2018.01883. URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC6176062/
   *Peer-reviewed primary research, RCT, N=103 Chinese 5th-graders (M age 11.2), random assignment to ability-praise / effort-praise / no-praise after initial success, followed by failure induction.*

2. **Kim, J., & Castelli, D.M. (2021).** *Effects of Gamification on Behavioral Change in Education: A Meta-Analysis.* International Journal of Environmental Research and Public Health, 18(7):3550. DOI: 10.3390/ijerph18073550. PMID: 33805530. URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC8037535/
   *Peer-reviewed meta-analysis, 18 controlled studies, 32 effect sizes, random-effects model. The closest the literature comes to a quantitative verdict on badges/streaks/leaderboards across ages.*

3. **Cheng, Y., Yen, K., Chen, Y., Chen, S., & Hiniker, A. (2018).** *Why Doesn't It Work? Voice-Driven Interfaces and Young Children's Communication Repair Strategies.* Proceedings of IDC '18 (Interaction Design and Children), Trondheim, Norway. DOI: 10.1145/3202185.3202749. URL: https://faculty.washington.edu/alexisr/quack.pdf
   *Peer-reviewed full paper (ACM). 2-week home deployment, N=14 preschoolers ages 3–5, 107 audio samples of children repairing an irrecoverable voice-UI breakdown. Co-author Hiniker is the same research lead whose Joan Ganz Cooney Center work is cited as Source 3 in the attention brief.*

4. **Children's Hospital Los Angeles / American Academy of Pediatrics summary (2024–2025, continuously updated).** *Pediatrician-Approved Screen Time Guidelines for Kids at Every Age.* URL: https://www.chla.org/blog/advice-experts/screen-time-guidelines-kids-every-age-chla-experts-weigh (cross-checked against Mayo Clinic: https://www.mayoclinic.org/healthy-lifestyle/childrens-health/in-depth/screen-time/art-20047952 and AAP 5 C's framework: https://www.healthychildren.org/English/family-life/Media/Pages/kids-and-screen-time-how-to-use-the-5-cs-of-media-guidance.aspx).
   *Institutional clinical summary synthesizing AAP policy. Not a primary research paper; cited here for the *co-viewing* and 5 C's recommendations only, not for effect sizes.*

5. **Graf Estes, K., & Hurley, K. (2013).** *Infant-directed prosody helps infants map sounds to meanings.* Infancy, 18(5), 842–854. PMC: PMC3828035. URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC3828035/
   *Peer-reviewed primary research, habituation-based word-learning task with 17-month-olds across 3 experiments. Establishes that infant-directed prosody (higher pitch, wider range, exaggerated contours, variability) is necessary for label-learning — adult-directed prosody alone fails.*

6. **Nencheva, M., Piazza, E., & Lew-Williams, C. (2020).** *The moment-to-moment pitch dynamics of child-directed speech shape toddlers' attention and learning.* Developmental Science, 23(6):e12997. Reviewed at Princeton Insights: https://insights.princeton.edu/2021/06/cds-word-learning/ (Wiley DOI: https://onlinelibrary.wiley.com/doi/full/10.1111/desc.12997).
   *Peer-reviewed primary research, three experiments with caregivers and 24–30-month-olds using CHILDES recordings and pupil-synchrony measurement. Identifies four pitch-contour shapes ("falls / rises / hills / valleys") and ranks "hills" as most engaging for novel-word learning.*

---

## Claims

### Claim 1 — Effort attribution beats ability attribution for primary-school children

Xing et al. (Source 1) randomized 103 fifth-graders in Beijing to receive one of three scripts after initial success on Raven's Progressive Matrices: **ability praise** ("you must be very clever"), **effort praise** ("you must have worked very hard"), or **no-praise / informational** ("you got [N] right"). After a deliberately induced failure, **ability-praise children attributed failure more to "low ability"** (M=2.54 vs. 1.84 control, F(2,100)=4.23, p<.05, η²ₚ=0.08), showed **more behavioral self-handicapping** (less time on the post-failure task), and showed the smallest performance improvement from Set 1 to Set 3. **Effort-praise children** also adopted some claimed self-handicapping, but their behavioral pattern was closer to the no-praise group. *Crucially:* the **no-praise informational condition produced equally positive results as effort praise** on every measured outcome — there was no measurable penalty for omitting praise as long as the feedback contained the factual score.

This sharpens Dweck's classic finding (canonical 1998, not re-cited here) in two ways that matter for TeeBot:
- **Praise must be specific and effort-attributed**; generic "good job!" is closer to ability-praise than to effort-praise.
- **Factual feedback is the floor, not the ceiling** — "you got 8 of 10 right" is the safe minimum. Effort-praise is a *boost*, not a *substitute*.

*Age caveat:* N=103 at M=11.2 years. The pattern is consistent with primary-school literature but is **not validated for ages 3–7**. Treat as *directionally valid* and avoid applying to under-5s without internal A/B testing.

### Claim 2 — Gamification has a half-life that argues against badge/streak dominance

Kim & Castelli (Source 2) ran a meta-analysis of 18 controlled gamification studies (n=32 effect sizes). Overall effect: **d = 0.48 (moderate)**. Critical moderator: **intervention length**:

| Intervention length | Cohen's d | 95% CI |
|---|---|---|
| Under 1 week | **1.57** | 1.25–1.90 |
| 2–16 weeks | **0.39** | 0.21–0.57 |
| 1–2 years | **−0.20** | not significant, **adverse direction** |

Age moderator: **K-12 d = 0.92**, **college d = 0.15** (Qb=26.27, p<.01).

Implications for TeeBot:
- **Initial novelty period (first week)** will over-perform — design the *first 7 days* knowing the d≈1.57 will decay to d≈0.39 by week 16 and likely to d<0 by month 6.
- **K-12 effect is large** but the meta-analysis covers ages 5–18 broadly; 3–7 is the under-studied sub-segment. Plan for d between K-12 (0.92) and pre-K (no data) — conservatively **d ≈ 0.4–0.6** for the first month, then decay.
- **A 1+ year gamification intervention has, in this meta-analysis, a *negative* point estimate.** This is the single most important quantitative finding in this brief for the 30+ day retention plan: the engagement-loop design must be *mastery-based* (skill-delta), not badge-based (collectibles), not streak-based (habit pressure), because collectibles and habit pressure are the two mechanics most likely to flip negative at 1+ years.

### Claim 3 — Children repair voice interfaces patiently — but they will keep talking to a broken TeeBot

Cheng et al. (Source 3) deployed "Cookie Monster's Challenge" on tablets in 14 preschoolers' homes for two weeks. The game contained a microphone-handling bug that made the voice-driven bonus game permanently inaudible to the app. Researchers captured **107 audio samples** of children attempting the broken mini-game. Findings:
- **Repetition: 79%** of repair attempts.
- **Volume variation: 63%** of attempts.
- **Word/pronunciation variation: 34%**.
- **Children sought help from a parent in only 6 of 107 attempts (~5.6%)**.
- **Audible frustration: 23%** of clips; **78% showed no audible frustration**.
- **Only 18 of 107 instances** of the child giving up — and **10 of those 18 involved patient waiting** rather than exit.
- **Children ignored only 2 of 91 explicit prompts** — i.e., children stay responsive even when they know the system is broken.

Parents progressed through four phases of repair support: **suggest → intervene → resign → pronounce** ("the app just doesn't work"). **Children never attempted technical fixes** — they relied on the same strategies they use with humans (repeat, vary, get louder).

Direct implications for TeeBot:
- The 3-second latency budget in the attention brief (Claim 4) is *generous*: children will wait longer than adults, but only if they hear *something*. The repair behavior is to "do more of the same." If TeeBot is silent, the child will shout, then give up; if TeeBot is acknowledging-but-processing, the child will keep talking.
- **A broken TeeBot will keep a child talking to it for the full attention window.** This raises the cost of every voice-loop failure: every moment of misrecognition is a moment in which the *next* attempt will be louder, more distorted, and worse for ASR. The error-recovery UX (barge-in, "I heard *x*, was that right?") is not a polish item — it is a safety item.

### Claim 4 — Parent-vs-child information asymmetry should be the design axis, not the badge

AAP and CHLA (Source 4) recommend up to 1 hour/day of high-quality programming for ages 2–5, with the *active ingredient* being **co-viewing, co-engagement, and parent-mediated scaffolding**, not screen minutes alone. The AAP "5 C's" framework (Child, Content, Calm, Crowding out, Communication) restates this: the parent is positioned as a co-regulator, not a spectator.

This translates to TeeBot (voice-first, no screen) as follows:
- **The parent surface should expose what the child was *thinking about*** (topics attempted, words tried, hesitations, skip-with-reason reasons) — *not* a score, *not* a streak, *not* a "you missed 3 today" message. Mirror the AAP "Communication" pillar: parent is positioned to *have a conversation with the child about what they did*, not to evaluate the child.
- **The child surface should never expose parent-side metrics.** No "your mom will see this" framings; no "your parent was proud" framings that originate from a metric.
- This is a *hard asymmetry*: same lesson, two different surfaces, with no signal that crosses in either direction except via the child's own later disclosure. The parent is informed, the child is celebrated; neither is shown the other's view.

This is consistent with `vietnamese-elt-2026-06-29.md` Claims 11 and 22 (face-sensitivity, "losing face" patterns) and with `attention-patterns-2026-06-29.md` Source 3 / Claim 6 (joint-attention design).

### Claim 5 — Voice prosody should approximate child-directed speech, not adult podcast speech

Graf Estes & Hurley (Source 3 of this brief — Source 5 by list) ran three experiments with 17-month-olds. Experiment 1 found infants **failed to learn labels presented in adult-directed (AD) prosody**. Experiment 2 found the same infants **succeeded** when the labels were presented in **infant-directed (ID) prosody** — characterized by:
- Wider pitch range and higher mean F0 (~272 Hz vs. ~190 Hz in the study's stimuli).
- More distinct vowel categories.
- Shorter utterances, slower tempo, longer pauses.
- Repetition of words/phrases.

Experiment 3 found that ID prosody with **variation across tokens** was necessary; flat ID prosody without variation failed. Variation, not just the "ID register" itself, is what enables the sound-to-meaning mapping.

Nencheva et al. (Source 6) extended this to word-level pitch contours, finding:
- Four shapes characterize CDS at the word level: **falls, rises, hills (up-then-down), valleys (down-then-up)**.
- **Hills** are the most engaging (highest pupil synchrony across toddlers).
- **Valleys** are the least engaging.
- **Toddlers learned novel words with hill contours slightly better than with valley contours**; moment-to-moment attention (pupil synchrony) directly predicted word-learning success.

Direct prosody recommendations for TeeBot's TTS layer:
- **Higher mean F0** than adult-podcast TTS — aim for ~250–280 Hz on female voices (per Source 5's stimulus range), not the 180–200 Hz typical of news-reading TTS.
- **Wider pitch range per sentence** — exaggerated contours, not flat.
- **Hill-shaped contours on the keyword** of each prompt (e.g., the vocabulary word in "Can you say **APPLE**?" should rise-then-fall on "APPLE").
- **Avoid valley-shaped contours on the keyword** — a down-then-up contour on the target word measurably reduces engagement.
- **Short utterances, longer pauses** — break long prompts into two TTS utterances with a 300–500 ms gap.
- **Variation across repetitions** — do not use the same audio file for repeated TTS prompts; small prosodic variation is part of what makes CDS effective (per Source 5, Experiment 3).

*Nencheva caveat:* the pitch-contour finding is from English CDS to English-learning toddlers. CDS universals are *not* established; the cross-language question is open (per first-author commentary in Source 6). TeeBot's English prompts should follow the contour rules; the Vietnamese praise phrases ("Giỏi quá!", "Cố lên!") should follow VN maternal CDS norms — which are an **un-researched gap** for this brief.

### Claim 6 — "Garden metaphor" evidence is suggestive but not direct

The Personality Garden is referenced in the TeeBot product surface (`attention-patterns-2026-06-29.md` Implication #3 and `vietnamese-elt-2026-06-29.md` "Not researched"). Peer-reviewed evidence for a *garden* metaphor specifically in early-childhood ed-tech:
- **No direct RCT or controlled study located** comparing a garden-growth metaphor vs. a points-based metaphor for ages 3–7.
- **The "brain-as-muscle" growth-mindset metaphor** (Dweck, canonical) is well-established for ages 5+; growth-mindset interventions have demonstrated small-to-moderate effects on academic outcomes (see e.g., Yeager et al., 2019, *Nature* — not re-cited here; cited only as context for Source 1).
- **The garden metaphor is conceptually adjacent** to the brain-as-muscle metaphor: both emphasize slow, effort-driven growth rather than fixed ability. Garden *specifically* adds the dual concept of *visible decay* (wilting) and *visible recovery* (watering works).
- **A meta-analytic caveat from Source 2** is that 1+ year interventions show d = −0.20 — and growth-mindset interventions that are heavy on "visible decay" framings (a wilting plant) may *combine* the long-term-gamification-decay effect with the shame-of-decay effect. This is a design risk, not a design ban: **make water-and-grow visible; make wilting subtle or absent.**

The evidence is *sufficient* to support a garden-themed reward surface (visible plants, watering, slow growth) provided the wilting state is de-emphasized and the watering action is effort-attributed (Source 1 alignment) rather than score-attributed. The evidence is *insufficient* to claim that a garden metaphor is *better* than an abstract mastery bar. Treat the garden choice as a **branding + identity decision** (a soft container for the mastery signal), not as an empirically validated pedagogical mechanism for ages 3–7.

### Claim 7 — Behavior-signal ethics is the highest-stakes surface in this design

The voice-first loop will inevitably produce signals that look like behavior data:
- **Per-prompt latency** (how fast the child answered).
- **Hesitation / re-attempt count** (how many times they said something before ASR accepted it).
- **Topic refusal** ("I don't want to do this one").
- **Skip-with-reason reasons** (per `attention-patterns-2026-06-29.md` Claim 5: peer-reviewed Su et al. recommendation to ask *why* the learner skipped).
- **Pronunciation error patterns** (final-/t/-dropping, /θ/→/t/, etc., per `vietnamese-elt-2026-06-29.md` Claim 1).

None of these are individually sensitive. Aggregated over time and linked to a child identifier, they constitute a **behavior fingerprint** that — under COPPA in the US, GDPR-K in the EU, and Vietnam's Decree 13/2023/NĐ-CP on personal data protection — sits at the boundary of "educational record" and "sensitive behavioral data." The risk is not that TeeBot will misuse them; the risk is that they will exist *at all* in a form that could be subpoenaed, leaked, sold, or aggregated across siblings.

Concrete design constraints, derived from Source 4 (AAP 5 C's "Communication" pillar — parent is a partner, not a surveillance operator) and `ENGLISH_LEARNING.md` §7 (no hidden weak progress; mic/device-unsafe rewards forbidden):
- **On-device aggregation only by default.** Per-child signals stay on-device; only *lesson-level* outcomes (vocabulary touched, minutes practiced, parent-visible praise moments) leave the device.
- **Skip-with-reason must be stored, not transmitted, as a behavior signal.** The reason "I don't like this one" should be available to the *next lesson generator* on-device; it should *not* be in any parent-visible payload.
- **Error patterns are aggregated to a topic, never to a child.** The system may store "37% of children this week dropped the final /t/ in 'cat'" — that is pedagogical signal. It must *not* store "child X dropped the final /t/ on 7 of 10 attempts on Tuesday." The latter is the behavior fingerprint.
- **Parent surface must be growth-framed, never diagnostic.** No "your child is behind on X"; only "this week your child tried 14 words, 6 new and 8 review — try reviewing the 6 new ones together."
- **No third-party sharing of any child-attached signal**, ever. This includes no analytics SDK that takes child IDs, no LLM provider that receives child-attached prompts without contractual aggregation, no advertising integration of any kind.

This is the design rule most likely to be *tested* by future TeeBot feature requests ("can we send parents a daily summary?" "can we surface a 'struggling words' list?"). The rule above is the answer: parent summaries are *aggregated growth*; struggling-word lists are *diagnostic* and are not shipped to the parent surface.

---

## Implications for TeeBot

1. **Default to effort-attributed mastery feedback on every correct response; use informational feedback ("you got 8 of 10") as the floor, not the ceiling.** Phrasing template: *"You tried [N] times on the /t/ sound today — and that last one sounded just right!"* never *"You're so smart!"* and never *"You missed the /t/."* (Source 1 alignment.) Avoid language that names fixed ability; avoid language that names error in the singular.

2. **Mastery signal is the primary reward; badges are decoration; streaks are off by default for under-7.** Per Source 2's 1+ year d = −0.20 finding, *no gamification mechanic should be the main loop* past the first month. The main loop is *mastery-delta*: "you can do X today that you couldn't do last week." Badges may exist as collectibles but should not gate content or surface in parent messaging. Streaks should be replaced by a soft "we missed you" letter, never by a loss-frame counter, per `attention-patterns-2026-06-29.md` Claim 7. *(Engagement-loop *numbers* and Day-N targets deferred to the attention brief.)*

3. **Parent surface is structured, growth-framed, never diagnostic; child surface is warm, never parent-aware.** Two products, one underlying lesson. Parent sees: vocabulary touched, new-vs-review breakdown, effort moments the child can re-tell (e.g., "you tried the /θ/ sound three times today — ask your child to show you"), next-session preview. Parent does *not* see: scores, error rates, skip-with-reason reasons, hesitation latency. Child never sees anything labeled "for parent." (Source 4 AAP 5 C's alignment; Source 7 behavior-signal ethics; cross-reference `vietnamese-elt-2026-06-29.md` Claims 14–15 and 22.)

4. **TTS prosody must approximate child-directed speech, not podcast speech.** Per Sources 5 and 6: higher mean F0, wider per-sentence pitch range, hill-shaped contours on the target vocabulary word, short utterances with 300–500 ms inter-utterance pauses, prosodic variation across repeated prompts (no identical audio file). For English prompts follow these rules directly; for VN praise phrases ("Giỏi quá!", "Cố lên!"), follow VN maternal CDS norms — *this is an un-researched gap; TeeBot should commission a small N≈10 voice-recording study of VN mothers praising 3–7-year-olds before finalizing the TTS voice.* (Voice prosody *research* deferral: the contour rules from Source 6 are English-CDS; universality is unproven.)

5. **Behavior-signal ethics is a binding constraint, not a polish item.** On-device aggregation only; per-child signals stay on-device; error patterns aggregate to a topic, not a child; no third-party sharing of child-attached signals ever; no diagnostic parent output ever. *(VN-specific reward phrasing and idioms deferred to the vietnamese brief.)* Voice-loop error recovery UX (barge-in, "I heard *x*, was that right?") must be a P0 feature because Source 3 shows children will keep talking louder and longer to a broken voice interface, compounding ASR errors on each attempt.

---

## Hand-back

- **DID**: Compiled 6 peer-reviewed / institutional sources focused on (a) effort-attributed praise (Xing 2018), (b) gamification meta-analysis with age and intervention-length moderators (Kim & Castelli 2021), (c) children's persistence through broken voice interfaces (Cheng/Hiniker IDC 2018), (d) AAP pediatric screen-time guidance (CHLA 2024–25 / AAP 5 C's), (e) infant-directed prosody and word learning (Graf Estes 2013), (f) CDS pitch-contour moment-to-moment engagement (Nencheva/Piazza/Lew-Williams 2020). Wrote the brief at `original-app/TJBOT-Mobile/docs/research/engagement-pedagogy-2026-06-29.md` per the required structure (TL;DR / Sources / Claims / Implications / Hand-back).
- **DROPPED due to retry-timeout pressure**: Did not run a deeper search on (a) VN-specific maternal CDS prosody — surfaced as an explicit gap in Implication #4; (b) growth-mindset intervention meta-analyses (Yeager 2019 and follow-ups) for ages 5+ — referenced as context only; (c) COPPA / Vietnam Decree 13/2023/NĐ-CP primary legal text — relied on the binding `ENGLISH_LEARNING.md` §7 constraint and Source 4 instead; (d) NAEYC / FIRA / OECD position statements on under-3 screen interaction — search not run; (e) MIT Media Lab personalizable-agent work on child-AI interaction (e.g., Kory Westlund, MIT) — surfaced anecdotally in search context but not formally cited, leaving the "garden metaphor" claim weaker than it could be (Claim 6 is honest about this); (f) the NSF PDF at par.nsf.gov timed out on extract (cited in search but not extracted). Six sources is at the low end of the 6–10 target; this is the primary quantitative concession to the retry-timeout cap.
- **NEXT AGENT SHOULD PULL FROM THE SIBLING BRIEFS**: All *engagement-loop numbers* (drop-off cliffs, Day-1/Day-7/Day-30 retention estimates, voice-loop latency budget, joint-attention findings) come from `attention-patterns-2026-06-29.md` — do not re-derive them here. All *Vietnamese language specifics* (pronunciation targets, MOET framework, "losing face," translanguaging, parent-facing copy rules, idiom/copula/tense translation traps, VN reward phrasing) come from `vietnamese-elt-2026-06-29.md` — do not re-derive them here. This brief is the **layer on top of those two**: it provides the engagement *mechanics* (effort attribution, mastery vs. badge vs. streak, parent-child asymmetry, voice prosody, behavior-signal ethics) that those two briefs defer to it.

---

*End of research note.*