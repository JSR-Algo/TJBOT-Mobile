# Use Cases — `<domain>`

> Template for per-domain `use-cases.md`. Replace each placeholder with real content from the legacy doc, the domain's `.usecase.puml`, and READ-ONLY inspection of `src/features/<domain>/*Page.jsx`. Do **NOT** edit JSX.

Each UC owned by this domain gets one H2 anchor following the schema below. Cross-domain edges live in `reference/cross-domain-edges.json` — reference target IDs only.

---

## UC-LL-NN — <title from legacy use-case-diagram.md>

- **Goal:** <one line — what value the actor gets>
- **Trigger:** <one line — UI event, system event, or external signal>
- **Preconditions:** <one line — what must be true before the flow starts>
- **Main Flow:**
  1. <step>
  2. <step>
  3. <step>
- **Postconditions:** <one line — what is true after success>

(Optional sections — include only if non-empty, no `(none)` stubs.)

- **Alt Flow:**
  1. <step>
- **Error Flow:**
  1. <step>

---

## UC-LL-NN — <next>

(repeat for every UC owned by this domain)
