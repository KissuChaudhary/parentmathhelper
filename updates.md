
# ParentMathHelper Retrofit Status

## Why This Document Exists
This is the working retrofit tracker for the current app.

The product was not rebuilt from scratch.
The right job is to track:
- what is already working well,
- what was recently completed,
- what is still partial,
- and what remains before the product feels fully production-ready.

## Current Product Snapshot

### Built And Working
- Solver and Tutor now run as separate mode-owned sessions in `app/page.tsx`
- Messages carry `mode` and `responseType`, and rendering is driven by message-owned data
- Solver and Tutor both return structured output contracts
- Solver and Tutor image submissions now go through the structured solve pipeline instead of falling back to generic mode-mixed behavior
- Diagnose mode exists as a top-level prompt input toggle, not a message pill
- Diagnose responses now have a dedicated result presentation instead of plain markdown-only output
- Practice generation exists and can be launched as a message action
- The UI already supports:
  - markdown
  - math rendering
  - image upload
  - drawing canvas
  - image preview
  - revealable teaching notes
  - follow-up actions under answers

### Recently Completed In This Retrofit
- fixed the Solver/Tutor shared-session rendering bug
- split sessions into `solverMessages` and `tutorMessages`
- stored `mode`, `responseType`, `sourceProblem`, and `actions` on messages
- disabled Solve It / Teach It switching while diagnosis mode is active
- softened diagnosis tone so the app starts with what looks right
- added Solver follow-ups:
  - show another method
  - verify the final answer
  - break down one step more clearly
- added Tutor follow-ups:
  - give another analogy
  - shorten the explanation
  - use simpler language
  - help with a stuck step
- unified image-based Solve It and Teach It onto `/api/math/solve`
- extended `solve-payload.ts` to support:
  - history
  - prior answer context
  - follow-up intent
  - attached image context

### Partial Or Still Needing Tightening
- diagnosis is image-first, but it still uses the shared prompt input surface rather than a dedicated capture flow
- image intent is now much better, but draft image state is still held at page-level UI state
- practice is now a message action, but the overall action row still needs premium UX polish
- diagnosis results are much clearer, but the response contract is still markdown-shaped instead of a typed structured object
- copy and refresh icons are present in message UI, but they are still non-functional
- Tutor step presentation is improved, but overall chat-card spacing and mobile interaction polish can still be tightened

### What Is No Longer A Blocking Problem
- Solver and Tutor no longer share one message array
- mode switching no longer causes old messages to visually change identity
- Solver image uploads no longer depend on accidental `/api/chat` fallback behavior
- follow-up continuity is no longer missing in Solver
- diagnosis is no longer hidden behind a post-answer pill

## Current Codebase Analysis

### Already Good
#### `app/page.tsx`
- owns separate Solver and Tutor sessions
- routes structured Solve It and Teach It requests through the same deliberate payload path
- handles follow-up actions inside the correct mode session
- keeps diagnosis in the active mode without leaking cross-mode context

#### `lib/math/solve-payload.ts`
- enforces mode-aware structured output
- supports image-aware solving and teaching
- supports follow-up intent and same-mode history
- keeps arithmetic validation and useful offline fallback behavior

#### `components/chat-message-item.tsx`
- renders from `message.responseType`
- supports dedicated diagnosis cards
- supports action rows under eligible answers
- keeps Solver and Tutor visually distinct

#### `components/chat-types.ts`
- now has the message fields needed for stable product behavior
- now supports first-class message actions for Solver and Tutor

#### `app/api/math/diagnose/route.ts`
- supports mode-aware diagnosis
- uses calmer wording
- returns useful fallback output when the API key is unavailable

### Needs Tightening
#### `components/prompt-input.tsx`
- clarify image intent language even more for mobile-first usage
- make diagnose capture feel more deliberate when an image is attached

#### `components/chat-message-item.tsx`
- make action-row hierarchy feel more premium
- decide whether copy / retry should be fully implemented or removed

#### `app/api/math/diagnose/route.ts`
- move from markdown-only result generation toward a more structured response contract later

#### `app/page.tsx`
- loading state is still global rather than per-session or per-message action
- image draft state is still simple UI state, not a richer intent object

### Remaining Rebuilds
#### Diagnosis capture flow
- current entry is good enough to use, but not yet a true mobile-native capture workflow
- still missing:
  - dedicated camera-first entry
  - more deliberate diagnose capture affordances
  - stronger separation between general solve image draft and diagnose image draft

#### Action polish
- the action architecture exists now
- what remains is refinement, not invention:
  - better prioritization of which actions appear first
  - stronger visual hierarchy on mobile
  - possible throttling or deduping of repeated action runs

## Phase Status

### Phase 1 — Stabilize Mode Sessions
Status: done

Delivered:
- separate mode sessions
- fresh visible thread on mode switch
- no cross-mode visual leakage

### Phase 2 — Separate Solver And Tutor Rendering Properly
Status: done

Delivered:
- message-owned rendering
- distinct Solver and Tutor card behavior
- no global-mode-based style swapping

### Phase 3 — Add Continuity Inside Each Mode Only
Status: mostly done

Delivered:
- same-mode follow-ups for Solver
- same-mode follow-ups for Tutor
- no cross-mode context sharing

Still to tighten:
- improve loading and interaction behavior for repeated follow-up taps

### Phase 4 — Turn Existing Practice Into A Better Message Action
Status: done, with minor polish remaining

Delivered:
- practice attached through message actions
- practice stays connected to the solved context

Still to tighten:
- improve action-row visual polish

### Phase 5 — Build Diagnose My Child’s Mistake As An Image-First Flow
Status: partially done

Delivered:
- diagnose mode in the prompt UI
- image-based diagnosis route
- calmer diagnosis language
- dedicated diagnosis result presentation

Still missing:
- dedicated capture UX beyond the shared composer
- more explicit camera-first mobile flow

### Phase 6 — Make Image Input A First-Class Product Path
Status: mostly done

Delivered:
- Solver image uploads return Solver-shaped output
- Tutor image uploads return Tutor-shaped output
- diagnosis image uploads return diagnosis-shaped output

Still to tighten:
- richer image intent state
- clearer capture semantics between solve, teach, and diagnose before submit

## Remaining Highest-Value Work
1. Build a more explicit mobile-first diagnosis capture experience
2. Polish the action row and remove or finish placeholder controls like copy / refresh
3. Improve per-action loading behavior so repeated follow-up use feels cleaner
4. Consider moving diagnosis output from markdown sections to a typed response schema
5. Refine mode-aware image draft handling so solve / teach / diagnose intent is clearer before submit

## What We Should Not Build Yet
- dashboard
- flashcards
- pricing logic
- cross-session child memory
- broad feature expansion

Reason:
- the current bottleneck is no longer missing core features
- the bottleneck is polish, clarity, and production UX around the flows we already chose

## Final Principle
The core product is now coherent.

Do not restart it.
Do not expand sideways too early.
Finish the last 15% by tightening diagnosis capture, action polish, and mobile flow quality.
