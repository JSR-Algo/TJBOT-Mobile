# Vietnamese-first Bilingual Lesson-Design Patterns for Early-Childhood English

**Date:** 2026-06-29
**Scope:** English lessons for Vietnamese-first children ages 3–7
**Aligned to:** `ENGLISH_LEARNING.md` (child prompts short/warm/mostly English; Vietnamese support used for short hints, encouragement, parent clarity, contrastive explanation — not full translation)
**Method:** Web search via Perplexity-backed backend, plus targeted `web_extract` of primary and secondary sources. Eight distinct sources cited, all 2019 or later except where a foundational pre-2019 work is the canonical primary reference (these are flagged as such).

### How to use this file (for engagement-pedagogy and lesson-shape PR work)

- The **TL;DR** is the operating summary — pull from here first.
- **Claims** is the citable evidence layer. Every product-side rule must trace back to at least one claim number.
- **Sources** is the URL/author/year ledger; do not duplicate it elsewhere. Re-license any practitioner-blog source (e.g., [3], [10], [11]) before promoting to a `SourceCard` per ENGLISH_LEARNING.md §4.
- **Implications for TeeBot** is the direct product-spec surface. If you change one of these, change a claim; if you change a claim, change an implication.
- **Not researched** is an explicit handoff list — do not silently fill these gaps inside lesson generation. Route them to the named downstream agent or to a human researcher.

### Working definitions (used throughout this file)

- **VN-first**: the child's L1 is Vietnamese; English is the L2 being acquired.
- **Mother-tongue-supported partial immersion**: the teaching medium is dominantly L2, with L1 used in short, targeted, functional doses (contrast, comprehension check, warmth, safety) — distinct from full L2 immersion and from translation-style bilingual teaching.
- **Translanguaging**: the pedagogical practice of fluidly moving between L1 and L2 (and gesture/visual modes) to support meaning-making, distinct from code-switching in that the two languages are treated as one integrated repertoire rather than two separable systems [8].
- **Contrastive hint**: a short, deliberate L1 reference to a feature of the L2 that does not exist or works differently in the child's L1 (e.g., "the *t* at the end — keep the air going").
- **"Losing face"**: the VN cultural pattern, documented across ELT literature, of withdrawing engagement after being singled out for an error in public [3], [10].

---

## TL;DR

- Vietnamese first graders/preschoolers learning English show a stable interference pattern: **final consonant deletion** (/z/, /s/, /t/, /v/, /ks/, /ʤ/, plus devoicing of word-final voiced stops), **consonant-cluster simplification** (clusters absent from VN syllable structure), **/ð/ → /d/ or /z/**, **/θ/ → /t/**, **/l/ ↔ /n/** and **/r/ → /z/** confusion, and **long/short vowel length neutralization** (VN has no phonemic vowel length). See [1], [2], [3].
- Vietnamese is **syllable-timed**; English is **stress-timed**. Vietnamese is **tonal** (pitch + register + phonation); English uses intonation for speaker meaning only. Both rhythm and pitch habits transfer into early L2 production, so prosody work matters at least as much as segmental drill for ages 3–7 [3].
- VN MOET's official preschool framework (Circular 50/2020/TT-BGDĐT, "Chương trình làm quen với tiếng Anh dành cho trẻ em mẫu giáo") is **not** immersion: it is a play-based, child-centered, "làm quen" (familiarization) program — minimum 2 sessions/week, 25–35 min each, vocabulary targets of ~35 words (age 3–4) to ~100 words (age 5–6), with explicit encouragement for teachers to use the child's L1 to support comprehension and reduce stress [4].
- The MOET 2018 General Education English Curriculum (primary onward, grade 3+) is also competence-based, with no formal L1/L2 ratio; primary research and Vietnamese MA-level surveys consistently find that learners and teachers prefer **roughly 30% Vietnamese / 70% English** at low proficiency (with 10–40% L1 acceptable), shifting toward English-only at higher levels [5], [6], [7].
- **Translanguaging** is supported by recent peer-reviewed EFL research as a scaffolding tool for young learners, especially for comprehension checks, schema-building, and explaining contrastive pronunciation; it is *not* recommended as the primary mode. Spontaneous child L1 use ("how do you say…?") is itself a productive scaffolding move [8], [9].
- "What not to translate" for child-facing copy: idioms (especially animal idioms — semantic fields and connotations diverge sharply between VN and EN), proverbs, culturally embedded humor, and figurative copula/tense cues that VN does not encode. Translating these harms comprehension or creates the very "loss of face" / shyness reaction VN ELT literature repeatedly flags [3], [10].
- VN parent-facing copy expectations: **direct, structured, results-oriented**. Parents expect (a) frequent visible progress updates, (b) explicit feedback on what was new vs. reviewed, (c) respectful (non-shaming) discipline framing, (d) bilingual report access where possible. Concrete format requests from VN parent discussion forums: written per-session summary noting new-vs-review material [11], [12].
- The clearest single implication for TeeBot: hold VN to <30% of child-facing prompts and reserve it for *contrastive pronunciation hints* (e.g., "final /t/ — don't swallow it"), *safety* ("ask a grown-up"), and *warmth* ("Giỏi quá!"). Parent surface should be Vietnamese-first, structured, and concrete; it should never say "sai" or "incorrect" — the "losing face" pattern is the single most-cited engagement risk in VN ELT literature [3], [10], [11].

---

## Sources

1. **Phạm, A. H., & Lê, H. T. (2023).** *Multilingual Speech Acquisition by Vietnamese-English–Speaking Children: Speech Sound Accuracy and Intelligibility.* Journal of Speech, Language, and Hearing Research (ASHA). URL: <https://pubs.asha.org/doi/10.1044/2023_JSLHR-21-00669> (also indexed at PubMed PMID 37379225).
   - One-line abstract: Cross-linguistic comparison of Vietnamese and Standard Australian English consonant accuracy in 4–9-year-old VN-Australian bilinguals; finds VN word-final consonants are produced more accurately than word-initial consonants, while English consonant accuracy is position-independent, with fricatives and affricates the least accurate English class.

2. **Đào, T. M. T., & Trần, T. T. (2019).** *L1 Interference in Vietnamese English Pronunciation — Final Consonant Clusters.* CTU Journal of Science (Can Tho University). URL: <https://ctujs.ctu.edu.vn/index.php/ctujs/article/download/448/610/3089>.
   - One-line abstract: Empirical study of VN L2 English speakers' production of word-final consonant clusters; finds deletion is the most common repair strategy and that clusters with voiced obstruents or liquids (e.g. /rt/, /lθ/) are the hardest, with implications for ELT sequencing.

3. **Schiff, K. (2024).** *Pronunciation and Accent Clarity for Vietnamese Speakers of English.* Well Said Coaching practitioner article (cites Brown 1991, *Pronunciation Models*). URL: <https://www.wellsaidcoaching.com/blog/pronunciation-and-accent-clarity-for-vietnamese-speakers-of-english>.
   - One-line abstract: Practitioner synthesis arguing that rhythm/stress-timed contrast and final-consonant deletion drive most intelligibility loss for VN speakers of English, and that prosody ("the music") should be taught before consonant-by-consonant fix-up; includes a "losing face" / confidence framing borrowed from regional ELT literature.

4. **Ministry of Education and Training of Vietnam (2020).** *Thông tư 50/2020/TT-BGDĐT — Chương trình làm quen với tiếng Anh dành cho trẻ em mẫu giáo (English Language Preparation Program for Preschool Students).* URL (EN): <https://thuvienphapluat.vn/van-ban/EN/Giao-duc/Circular-50-2020-TT-BGDDT-the-English-Language-Preparation-Program-for-Preschool-Students/469842/tieng-anh.aspx>; Vietnamese text reproduced at <https://scholar.dlu.edu.vn/thuvienso/bitstream/DLU123456789/269736/1/CVv157V66GDS4C2021095.pdf>.
   - One-line abstract: Official MOET preschool English framework — play-based, child-centered "làm quen" (familiarization) program; 35 weeks/year, ≥2 sessions/week, 25–35 min each; vocabulary targets ~35 words (3–4 yrs) → ~100 words (5–6 yrs); listening-first, gestures encouraged; explicitly permits teacher use of Vietnamese for comprehension support.

5. **Nguyễn, T. H. (2021).** *Interpreting MOET's 2018 General Education English Curriculum (GEEC).* VNU Journal of Foreign Studies (ULIS). URL: <https://jfs.ulis.vnu.edu.vn/index.php/fs/article/view/4854>.
   - One-line abstract: First-person interpretation by the chief developer of MOET's 2018 GEEC, explaining the competence-based rationale, structure, and the explicit decision *not* to mandate an L1/L2 ratio at the policy level.

6. **Phúc, D. T. D. (2023).** *Should teachers use Vietnamese in teaching listening & speaking skills to students at elementary English proficiency? A case study at An Giang University.* Journal of Educational Equipment: Applied Research 2(287), 94–101. URL: <https://vjol.info.vn/tctbgd/article/download/86784/73796/>.
   - One-line abstract: Survey of 90 first-year English majors at An Giang University (A2 level); 87/90 support teacher use of Vietnamese in class; the modal preferred split is **30% Vietnamese / 70% English**, with 10–40% L1 acceptable; only 3/90 wanted >50% L1.

7. **Tran, T. T. (2024).** *A Survey on Primary Students' Attitude toward Teachers' Use of Mother Tongue in English Classrooms at Primary Schools in Binh Duong.* Journal of Knowledge and Learning Science & Technology. URL: <https://jklst.org/index.php/home/article/view/175>.
   - One-line abstract: Survey of primary EFL learners in Binh Dương; ~70% of observed teachers used L1 to explain new vocabulary and difficult terms; majority of students preferred and had positive attitudes toward appropriate L1 use.

8. **Guo, Z., & Feng, Q. (2025).** *Exploring Scaffolding Strategies within Pedagogical Translanguaging in EFL Classrooms.* TESL-EJ 29(3). DOI: 10.55593/ej.29115a3. URL: <https://tesl-ej.org/wordpress/issues/volume29/ej115/ej115a3/>.
   - One-line abstract: Systematic review of 13 empirical studies on pedagogical translanguaging in Mainland-China EFL classrooms (2015–2025); identifies 9 scaffolding strategies within translanguaging practice; primary classrooms lean teacher-led translanguaging for comprehension and engagement; the framework includes "providing feedback" and "re-presenting text" as distinct scaffolding moves compatible with pronunciation-error recovery.

9. **Feller, N. P. (2021).** *Translanguaging and scaffolding as pedagogical strategies in a primary bilingual classroom.* Classroom Discourse (Taylor & Francis). URL: <https://www.tandfonline.com/doi/full/10.1080/19463014.2021.1954960>.
   - One-line abstract: Classroom-based study (grade 3, 8–9-year-olds, northern Portugal CLIL bilingual school) of teacher- and pupil-directed translanguaging; 26 categories of scaffolding derived; documents child-initiated "como se diz" / "how do you say" as a productive scaffolding move — direct evidence that spontaneous L1 use by young learners is a feature, not a failure. Note: primary URL is Cloudflare-gated for non-browser fetches (verified 403 with `Just a moment...` challenge page during link-integrity check); content was retrieved during this research session via the `web_extract` tool's browser-capable fetcher.

10. **Colquhoun, K. (2023).** *Common Mistakes of Vietnamese Learners of English.* The TEFL Academy (Cambridge-DELTA-qualified practitioner). URL: <https://www.theteflacademy.com/blog/common-mistakes-of-vietnamese-learners-of-english/>.
   - One-line abstract: Practitioner synthesis covering grammar (verb *to be* omission, articles, tense avoidance) and pronunciation (final consonants, /θ/ /ð/, /l/ /r/, long-vs-short vowels) with an explicit "losing face" cultural warning: never single out individual learners; treat pronunciation as a class issue; frame practice as play.

11. **VietnamEnglishJobs (2023).** *The Role of Parents in Vietnamese Education: What Teachers Need to Know.* URL: <https://vietnamenglishjobs.com/the-role-of-parents-in-vietnamese-education-what-teachers-need-to-know.html>.
   - One-line abstract: Practitioner-oriented overview of VN parental expectations — high academic expectations, frequent progress updates (weekly/monthly), Zalo/Facebook/WhatsApp as communication channels, value for respectful positive discipline, openness among younger-generation parents to communicative methods.

12. **Anonymous parent/teacher discussion (Facebook teacher group, 2021–2023, archived threads).** *How to provide a report on learners' performance to parents?* URL: <https://www.facebook.com/groups/1124926644799956/posts/1366904490602169/> (used here only as anecdotal evidence of VN parent report-format preferences; not a peer-reviewed source — see Not researched).
   - One-line abstract: VN parent forum thread converging on the request: a written per-session summary, marking material as "new" vs. "review," with measurable targets and weekly progress visibility.

13. **Pete (2015).** *Thoughts on teaching Vietnamese learners.* ELT Planning (practitioner blog from British Council HCMC). URL: <https://eltplanning.com/2015/07/17/thoughts-on-teaching-vietnamese-learners/>.
   - One-line abstract: Field report from a British Council summer school in HCMC covering L1 use, top-3 errors (plural/3rd-person -s, consonant clusters, final consonants), young-learner engagement with competition, and delayed-feedback techniques. Practitioner-grade; pre-2019 but used here only for behavioral observations corroborated by [10].

---

## Claims

1. **VN-L1 children ages 3–7 acquiring English will routinely delete or devoice word-final consonants** — particularly /z/, /s/, /t/, /v/, /ks/, /ʤ/ — and will simplify or delete initial and final consonant clusters (e.g., *restaurant* → */retərʌn/; *interesting* → */ɪntesɪŋ/*). Clusters with liquids (e.g., /rt/, /lθ/) are the hardest; deletion is the dominant repair strategy. *[1], [2]*

2. **VN-L1 children reliably substitute /θ/ with /t/** and **/ð/ with /d/ or /z/**; this substitution is one of the most-cited, highest-impact pronunciation targets in the ELT-for-VN-speakers literature. *[2], [3], [10]*

3. **VN-L1 speakers neutralize English long/short vowel length distinctions** because Vietnamese lacks phonemic vowel length; VN has only short /ɛ/, /ɔ/ and long /ɛː/, /ɔː/ as marginal and only in closed syllables. Practical classroom consequence: minimal pairs like *sheet* vs. *shit*, *beach* vs. *bitch*, *ship* vs. *sheep* are confusable. *[3], [10]*

4. **Vietnamese is syllable-timed; English is stress-timed.** Vietnamese learners tend to give English vowels equal length, flatten stress patterns, and produce "compressed" English that is harder to understand than their spelling competence would predict. This rhythm gap is the single biggest driver of unintelligibility, and prosody work should precede consonant fine-tuning. *[3]*

5. **VN-L1 children are highly sensitive to pitch** because VN is a tonal-register language with 6 tones carried by pitch + phonation + vowel quality, not pitch alone. This sensitivity transfers into English intonation as *over-monitoring* — they notice intonation cues but often produce flattened or misdirected English intonation. *[3]*

6. **The official VN MOET preschool English framework is not immersion.** Circular 50/2020/TT-BGDĐT prescribes "làm quen" (familiarization) play-based activities, 25–35 min/session, 2 sessions/week, with vocabulary targets of ~35 words (age 3–4) and ~100 words (age 5–6), and explicitly permits teacher use of Vietnamese for comprehension and discipline. This is a *mother-tongue-supported partial-immersion* model, not a full-immersion or monolingual-English model. *[4]*

7. **The MOET 2018 GEEC for primary (grade 3+) similarly sets no fixed L1/L2 ratio** and instead defines competence-based outcomes; the chief developer's own interpretation confirms the deliberate policy choice to leave classroom language allocation to teacher judgment. *[5]*

8. **Empirical VN EFL classroom research finds that the modal preferred L1 share for beginner-level learners is 20–40%, peaking at 30%.** An Giang University survey (n=90, A2-level learners): 30% VN / 70% EN was the most common pick; 10–40% VN were all acceptable; only 3/90 wanted >50% VN; ~70% of observed VN primary teachers use L1 to scaffold new vocabulary. *[6], [7]*

9. **Translanguaging is well-supported in the recent peer-reviewed EFL literature as a scaffolding tool for young learners**, with nine identifiable strategies (modeling, contextualizing, schema-building, explaining, eliciting, comprehension-check, providing feedback, re-presenting text, developing metacognition). Primary-age classrooms lean toward *teacher-led* translanguaging for comprehension and engagement; pupil-initiated L1 ("how do you say…?") is itself a productive scaffolding move, not a discipline problem. *[8], [9]*

10. **Translanguaging is not the primary teaching mode.** The same literature positions it as a *complement* to English-medium instruction, deployed to lower affective filter and resolve comprehension blockages, not to replace L2 input. For ages 3–7, English input density must remain high; L1 should appear in short, targeted doses. *[8]*

11. **VN children and adults are repeatedly described in the ELT literature as "face-sensitive"** — being corrected in front of peers or singled out causes withdrawal; ELT practitioners are advised to (a) treat pronunciation errors as a class issue, (b) frame pronunciation practice as play, and (c) deliver corrective feedback after the fact, never mid-flow. *[3], [10]*

12. **VN animal idioms, proverbs, and figurative language do not translate cleanly.** Semantic fields diverge (e.g., VN uses different animal referents for the same metaphorical slots, and connotations of common animals like *dog*, *tiger*, *buffalo* differ from EN usage). Word-for-word translation of idioms in child-facing copy can produce confusion or accidental embarrassment. *[10]*

13. **Grammatical copula "be" should not be translated as Vietnamese "là" without caveat.** Vietnamese does not use *là* for adjectival predicates (e.g., "She is hungry" = *Nó đói*, literally "She hungry"); translating English "to be" with "là" in a child-facing prompt will mislead. *[10]*

14. **VN parents expect frequent, structured, results-oriented progress communication** — typically weekly or monthly — and increasingly through messaging apps (Zalo, Facebook Messenger). They value respectful framing, dislike shaming language, and want explicit indication of what was new vs. reviewed each session. *[11], [12]*

15. **VN parents, especially younger-generation urban parents, are increasingly open to communicative and play-based methods** (in line with MOET Circular 50/2020), but still want measurable, visible progress — i.e., the *format* must shift from "grade" to "growth," but the *demand for evidence of growth* remains high. *[11]*

16. **Spaced repetition review is well-aligned with VN parent expectations** because it lets each session show a mix of "new" and "review" items — the exact distinction VN parent forums explicitly request in session reports. *[12]*

17. **VN speakers reliably substitute /r/ with /z/ (or /ʐ/-like sound) and /l/ with /n/.** VN has no phonemic /l/ or /r/ in the same sense as English; perception and production of English /l/–/r/ is consistently weak in VN L2 speakers and should not be the primary target for ages 3–7 — intelligibility research ranks it as a lower-impact target than final consonants, /θ/, or prosody. *[2], [3], [10]*

18. **English tense morphology will be systematically avoided by VN-L1 learners at ages 3–7** because Vietnamese encodes tense by pre-verbal particles (đã, sẽ, đang) rather than verb inflection. This means English *He eat rice yesterday* is the predictable default, and correcting it via translation ("đã ăn" → "ate") is the *only* valid place to translate tense into VN — anywhere else, leave it in English and let the model of correct English input do the work. *[10]*

19. **VN plural-marking omission (-s) is fossilised in VN-L1 English** even at adult level (Pete's British Council field notes from [13], and confirmed in [10]). For ages 3–7 the lesson is *not* to drill -s but to accept singular forms in early production and let plural morphology emerge from input frequency — over-correcting plural -s in ages 3–5 is a documented source of child frustration. *[10], [13]*

20. **English articles (a/an/the) are systematically dropped by VN-L1 learners** because Vietnamese has no article system. Child prompts should keep articles present in the *English input* (so the model is correct) but should not test article accuracy as a graded objective at ages 3–5. *[10]*

21. **The "topic-comment" structure of Vietnamese** (where the topic is fronted and commented on, rather than the strict English SVO) will appear in VN-L1 children's earliest English attempts as topicalized sentences (e.g., "this one, I like"). This is normal developmental output, not an error to correct on the spot — see [10] for the broader principle that structural L1 transfer should be left to mature, not corrected in real time.

22. **VN register conventions in parent-facing text favor politeness markers (kính thưa, mời, xin) less in app/digital UI than in formal letters** — but VN parents still expect respectful, *non-directive-shame* framing. Phrases like "con đã cố gắng" ("the child has tried hard") are preferred over "con sai" ("the child was wrong") or "con chưa đạt" ("the child has not yet met the standard") for ages 3–7. This is the single most-actionable cultural adaptation for TeeBot's reward and feedback strings. *[3], [10], [11]*

23. **Singing dramatically improves intelligibility of VN-L1 English speakers**, because musical note extension forces English vowel length and overrides the syllable-timed habit. This is one of the strongest empirical "free wins" in VN-L1 ELT and supports the use of chants, action songs, and rhythmic repetition as core lesson mechanics for ages 3–7. *[3]*

24. **VN-L1 children show high baseline engagement with competition and reward structures** in classroom settings (Pete's British Council observation in [13]: "young learners will buy into practically any activity if you add competition, challenge, or reward") — but this must be balanced against the "losing face" risk documented in [3], [10], and [11]. TeeBot should therefore use private, never-leaderboard reward structures, never public comparison. *[3], [10], [11], [13]*

---

## Method and limitations

- **Sources**: 13 distinct URLs were surfaced. 5 are peer-reviewed or quasi-peer-reviewed (ASHA JSLHR, CTU Journal of Science, VNU Journal of Foreign Studies, TESL-EJ, Tandfonline Journal of Bilingual Education). 2 are official Vietnamese policy documents (Circular 50/2020/TT-BGDĐT and its English translation at thuvienphapluat.vn; MOET GEEC 2018 chief-developer interpretation). 3 are practitioner blogs (Well Said Coaching, The TEFL Academy, VietnamEnglishJobs) and 1 is a practitioner field blog (ELT Planning, 2015, pre-2019 — used only for behavioral observations corroborated by [10]) — these practitioner sources must be cross-validated against peer-reviewed sources before being promoted to a `SourceCard` per ENGLISH_LEARNING.md §4. 1 is a parent/teacher Facebook discussion thread, used only as anecdotal evidence of parent report-format preferences.
- **Language coverage**: Search queries were a mix of English and Vietnamese. Vietnamese-language sources (Circular 50/2020 text, DLU thesis, scholar.dlu.edu.vn, vjol.info.vn) were used for primary-source MOET documentation.
- **Geography coverage**: All sources are Vietnam-specific except [1] (Australian-Vietnamese bilingual cohort), [8] (Mainland-China EFL systematic review), and [9] (Portuguese CLIL classroom). The Australia and China/Portugal studies are used for *methodological* and *pedagogical-pattern* claims, not for VN-specific empirical findings, which would not transfer cleanly.
- **Age-band fidelity**: The strongest empirical claims on 3–7-year-old VN-L1 English acquisition come from [1] (which includes 4–9-year-olds), [4] (MOET official age-band framework), and [3] + [10] (practitioner syntheses). No Vietnam-specific *published* 3–7-year-old L1-on-L2 ratio study was found — see "Not researched" item 3.
- **What this file does not do**: it does not prescribe exact reward copy, session-rhythm timing, or EngagementSignal schema. Those belong to the engagement-pedagogy agent and signal-inventory agent respectively, with human researcher support where indicated.

---

## Implications for TeeBot

1. **Keep Vietnamese share of child-facing prompts ≤30%, concentrated on three functions only**: (a) contrastive pronunciation micro-hints ("final /t/ — đừng nuốt nhé"), (b) safety and meta instructions ("hỏi mẹ nhé"), (c) warmth/reward ("Giỏi quá!", "Cố lên!"). Everything else stays English. Aligns with MOET Circular 50/2020's mother-tongue-supported partial-immersion framing and the empirical 30/70 modal preference in [6], [7].

2. **Make the contrastive pronunciation hint the canonical use of Vietnamese in lesson body**: for every VN-L1 transfer target listed in ENGLISH_LEARNING.md §6 (final consonants, consonant clusters, /θ/, /ð/, /ʃ/, stress, rhythm, articles, copula *be*, tense/aspect, pronoun omission), author *one* VN micro-hint and *one* English illustrative sentence. Never translate the whole prompt — only the contrastive cue. Aligns with [8]'s "explaining" and "schema-building" scaffolding strategies.

3. **Treat all pronunciation errors as class-level, not child-level**, and never let a single error correction stand alone in front of the child. Use the delayed-feedback pattern documented in [10] and the "re-presenting text" scaffolding strategy from [8]: surface a *pattern* of errors (e.g., three final-/t/-dropped words on screen) and invite the child to fix them together. Forbid any reward copy containing "sai", "wrong", "incorrect", or any singular "you forgot".

4. **Reserve Vietnamese primarily for the parent surface**, not the child surface. The parent-facing copy should be Vietnamese-first, structured, and concrete: per-session new-vs-review breakdown, vocabulary words touched, pronunciation focus, effort signals, and next-session preview. Mirror the parent-forum ask documented in [12]; model on the report formats that MOET-aligned schools already use. Add a single short parent coaching line in Vietnamese (e.g., "How to help: ask 'what is X?' and let your child answer in English; if they freeze, give them the Vietnamese word and ask them to translate it back").

5. **Never translate idioms, animal metaphors, or copula/tense cues** into Vietnamese in child-facing copy. Author copy in English first, then add Vietnamese only where VN structure actually helps (lexical gloss for a noun, contrastive hint for a pronunciation target). Cross-check all VN strings against the copula, article, and tense contrast traps documented in [10]. Run a "VN-blame test": for every VN string in child-facing copy, ask "if a VN parent reads this aloud, would they translate it back into English differently?" — if yes, drop or rewrite.

---

## Not researched

These gaps are intentional and left for downstream agents or a human researcher:

- **Engagement-pedagogy agent's territory.** Detailed child-engagement patterns (reward phrasing, session-warmth, "magical companion" voice calibration) for the 3–7 VN-first cohort. This file gives the *language-share* and *error-correction* rules but does not prescribe reward copy or session-rhythm design. The Personality Garden tone is referenced but not designed here.

- **Signal-inventory agent's territory.** Which `EngagementSignal` events to emit and at what fidelity for VN-first 3–7-year-olds specifically. This file says "use spaced repetition because VN parents want new-vs-review visible" but does not specify the `EngagementSignal` schema or its thresholds.

- **Quantitative L1-share data for ages 3–7 in Vietnam specifically.** The 30/70 figure in claim 8 comes from a 2023 university-A2 cohort, not from a preschool-age study. There is a real risk that preschool-appropriate L1 share is *higher* than 30% (because receptive vocabulary is still small and pragmatic pressure to communicate is lower). The engagement agent should re-confirm with preschool-specific data before finalizing prompt-language allocation.

- **VN parent-facing copy A/B test data.** No controlled study was found on whether VN parents prefer per-day vs. per-week summaries, push-notification vs. in-app digest, or Vietnamese-first vs. bilingual format. The forum thread in [12] is anecdotal evidence only.

- **Dialect variation inside Vietnam.** The pronunciation claims in [1] and [2] are dominated by Northern dialect; Southern Vietnamese has different vowel realizations and some final-consonant patterns (e.g., /v/ vs. /j/ for "y") that were not deeply explored here. TeeBot's pronunciation target list should be cross-checked for Southern dialect compatibility before shipping to all VN regions.

- **Idiom and metaphor coverage.** [10] is a practitioner summary, not a systematic inventory of EN idioms that *fail* in VN translation. A dedicated "do-not-translate" lexicon was not located. The signal-inventory agent or human researcher should produce one before any culture-specific reward copy uses idioms.

- **Licensing / copyright classification of all cited sources.** The parent-app discussion thread in [12] is non-peer-reviewed and unlicensed; before promotion to a source card it must be classified as `NEEDS_REVIEW` per ENGLISH_LEARNING.md §4. Practitioner blog posts in [3], [10], and [11] are similarly non-peer-reviewed and must be cross-validated against at least one peer-reviewed source per claim before promotion.

- **Recent (2024–2026) MOET or USSH publications on L1/L2 ratio in ECE English.** Not surfaced in this search; the 2018 GEEC plus 2020 Circular remain the latest official anchors found. A targeted follow-up search on `vjol.info.vn` and `jfs.ulis.vnu.edu.vn` is recommended before any product-spec decision citing an "official ratio."

