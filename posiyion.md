# ParentMathHelper Retrofit Plan

## Why This Document Exists
This is not a scratch-to-launch PRD.

More than half of the product already exists:
- working Solver route
- working Tutor route
- structured math output
- practice generation flow
- parent-oriented prompts
- usable UI shell

The real job now is to separate:
- what is already built,
- what is partially built but shaky,
- what needs tightening,
- what needs refactoring,
- and what truly needs rebuilding.

## Current Product Snapshot

### What Already Exists
- Solver mode exists and uses `/api/math/solve`
- Tutor mode exists and uses `/api/chat`
- Solver and Tutor prompts are already different
- `solve-payload.ts` already returns structured sections and metadata
- Tutor output already supports:
  - parent explanation
  - teaching framing
  - solution steps
  - common mistake
  - practice section
- Practice generation already exists through `/api/generate-practice`
- Chat UI already supports:
  - markdown
  - math rendering
  - image upload
  - explanation reveal
  - practice generation module
- Image capture paths already exist through:
  - upload from gallery/files
  - drawing canvas
  - image preview before submit

### What Is Partially Built But Not Robust
- Solver/Tutor mode switch exists, but both modes still share one `messages` state in `page.tsx`
- Tutor rendering exists, but it depends on the current selected `mode` instead of the mode that created the message
- Solver route works, but it is still mostly single-turn
- Tutor route supports history, but only because it goes through `/api/chat`
- Metadata exists, but it is not yet rich enough to drive stable UI behavior
- Practice exists, but it is still attached more as a feature block than as a clean workflow action
- Image input exists, but it is still a generic chat attachment, not a first-class homework workflow
- Draft image state is still global UI state, not modeled as a proper mode-owned capture flow
- Image submissions in Solver currently fall back to `/api/chat`, so they do not get the same structured Solver contract as text-only `/api/math/solve`

### What Is Currently Broken
- If a Solver answer exists and the user switches to Tutor, the same answer can be re-rendered as tutor-style UI
- If a Tutor answer exists and the user switches back, it can be flattened into solver-style UI
- The same shared chat thread is being used for two different product modes
- Frontend rendering is driven by global mode instead of message identity
- “image first” exists only as a transport layer, not as a productized solve/teach flow

## Current Codebase Analysis

### Already Good
#### `lib/math/solve-payload.ts`
- already contains separate mode-aware formatting
- already builds structured responses
- already provides metadata like:
  - `mode`
  - `gradeBand`
  - `commonSkill`
  - `hasPractice`
- already has useful fallback behavior

#### `app/api/chat/route.ts`
- already supports history-based Tutor interactions
- already switches system instruction by mode
- already accepts image messages and sends them to the model with the active mode prompt

#### `app/api/generate-practice/route.ts`
- already creates same-skill follow-up practice
- already fits the target audience better than flashcards

#### `components/practice-module.tsx`
- already gives a usable practice loop
- already supports answer checking and hint reveal

#### `components/prompt-input.tsx`
- already supports:
  - image upload
  - drawing canvas
  - mode switch UI
  - image preview before submit

### Needs Tightening
#### `components/chat-message-item.tsx`
- currently decides Tutor rendering by `mode === "tutor"`
- this is the root of the visual mode-switch bug
- needs rendering by `message.mode` or `message.responseType`

#### `components/chat-types.ts`
- message shape is too thin for robust product behavior
- missing fields like:
  - `mode`
  - `responseType`
  - `sourceProblem`
  - action availability

#### `app/page.tsx`
- currently has a single `messages` state for both modes
- currently sends Solver requests as single-turn solves
- currently sends Tutor through a history-aware route
- this mismatch is why the product feels split-brain
- current image draft is UI-level state, not yet a proper workflow object
- current image behavior depends on branching logic instead of one deliberate product path

#### Image handling
- image upload is mode-aware only at submit time
- image upload is not yet mode-owned as a full workflow
- there is no camera-first diagnose flow
- there is no explicit mistake-diagnosis image route

### Needs Refactor
#### Session model
- current state model should be refactored from:
  - one shared message array
- into:
  - one solver session
  - one tutor session
  - one active visible session

#### Output/render contract
- current API contract is present, but frontend rendering still assumes too much from global UI state
- rendering and data contract need to line up cleanly

### Needs Rebuild
#### Mode switch behavior
- this should not be patched cosmetically
- the mode switch behavior itself needs to be rebuilt around separate sessions

#### Post-answer action architecture
- right now there is no clean action system under messages
- actions should become first-class objects tied to a message, not ad hoc buttons

#### Image-first diagnosis workflow
- this should be treated as its own product flow
- not as “just another attachment”
- not as a text box with optional image

## Product Decision
We are not rebuilding the whole app.

We are keeping:
- Solver concept
- Tutor concept
- current API foundation
- practice generation
- prompt strategy
- overall UI shell

We are rebuilding only the unstable layer:
- mode/session architecture
- render ownership
- follow-up action system

## Retrofit Plan

## Phase 1 — Stabilize Mode Sessions
### Goal
Fix the current broken Solver/Tutor experience without throwing away working logic.

### What We Already Have
- mode switch UI in `prompt-input.tsx`
- separate Solver and Tutor prompts
- separate backend routes

### What Needs To Tighten Up
- mode switch should start a fresh visible thread
- input and image state should reset on mode change
- old responses should not leak visually into the new mode

### What Needs Refactor
- replace one shared `messages` state with:
  - `solverMessages`
  - `tutorMessages`
  - active mode selector

### What Needs Rebuild
- message ownership model
- each message must store:
  - `mode`
  - `responseType`
  - optional `sourceProblem`

### Acceptance Criteria
- switching from Solver to Tutor shows an empty Tutor session
- switching from Tutor to Solver shows an empty Solver session unless Solver already has its own separate history
- no old message changes visual style after mode change

## Phase 2 — Separate Solver And Tutor Rendering Properly
### Goal
Make Solver and Tutor feel different because of product logic, not just CSS.

### What We Already Have
#### Solver output contract
- Question
- Final Answer
- Solution Steps
- Why This Works
- Common Mistake

#### Tutor output contract
- What The Child Needs To Understand
- How To Explain It
- Solution Steps
- Common Mistake
- Practice Together

### What Needs To Tighten Up
- validate each response against its expected structure
- ensure Tutor keeps parent-facing framing and optional analogy
- ensure Solver stays compact and direct

### What Needs Refactor
- `chat-message-item.tsx` should render from `message.responseType`
- Tutor card UI should apply only to tutor messages
- Solver layout should apply only to solver messages

### What Needs Rebuild
- response parsing layer so the UI does not guess based on current mode

### Acceptance Criteria
- Tutor messages always look like Tutor messages even after mode switch
- Solver messages always look like Solver messages even after mode switch
- Tutor and Solver no longer feel like the same answer wrapped differently

## Phase 3 — Add Continuity Inside Each Mode Only
### Goal
Support follow-up naturally, but only inside the current mode.

### What We Already Have
- Tutor chat route already supports message history
- Solver route already supports structured single-turn solving

### What Needs To Tighten Up
- Tutor history should stay inside Tutor only
- Solver history should stay inside Solver only

### What Needs Refactor
- unify how history is passed:
  - either extend `/api/math/solve`
  - or route solver follow-ups through a structured chat path

### What Needs Rebuild
- follow-up handling for Solver

### Production Follow-Ups To Support
#### In Solver
- show another method
- verify the final answer
- break down one step more clearly

#### In Tutor
- give another analogy
- shorten the parent explanation
- adjust for slightly younger or older child language
- help with what to say when the child is stuck on one step

### Acceptance Criteria
- follow-ups in Solver remember only prior Solver messages
- follow-ups in Tutor remember only prior Tutor messages
- switching mode never carries context across

## Phase 4 — Turn Existing Practice Into A Better Message Action
### Goal
Do not invent random chips. Productize what is already valuable.

### What We Already Have
- practice generation route
- practice module UI
- answer checking inside the practice module
- hint reveal inside the practice module

### What Needs To Tighten Up
- attach practice generation to the answered message more cleanly
- make the entry point feel like a follow-up action, not a detached extra block

### What Needs Refactor
- treat “Create Similar Practice” as message action metadata
- only show it when the answer is suitable for practice

### What Needs Rebuild
- nothing major here; mostly a UX/productization pass

### Acceptance Criteria
- after a relevant answer, parent can create one similar practice question from that answer
- practice stays attached to that problem context

## Phase 5 — Build Diagnose My Child’s Mistake As An Image-First Flow
### Goal
Add one genuinely useful post-answer workflow that matches real parent behavior on mobile.

### Product Decision
This feature should be image first.

Parents usually will not paste the child’s work as text.
They will:
- take a photo
- upload a worksheet snap
- upload notebook work
- or mark up the work visually

### Primary Entry Point
- message action under a solved answer:
  - Diagnose My Child’s Mistake

### Mobile-First UX
- tap action
- open a bottom sheet, not a desktop-style modal
- show 3 primary choices:
  - Take Photo
  - Upload Image
  - Draw / Annotate
- keep text input only as a fallback, not the default

### What The Feature Should Do
- parent provides the child’s actual work image
- app analyzes the work in context of:
  - the original problem
  - the existing answer
  - the active mode
- app returns:
  - likely mistake
  - where the mistake starts
  - short correction
  - what the parent should say next

### Mode-Specific Behavior
#### In Solver
- focus on:
  - where the child’s math went wrong
  - corrected step
  - final corrected answer

#### In Tutor
- focus on:
  - what concept the child misunderstood
  - parent-friendly explanation
  - what to say next
  - one tiny follow-up check question

### What Needs To Tighten Up First
- message action system
- stable mode sessions

### What Needs Rebuild
- mistake-diagnosis image flow
- mobile bottom-sheet UI
- image-first action entry
- result contract for Solver vs Tutor diagnosis

### Acceptance Criteria
- parent can trigger diagnosis from an answered message
- image capture/upload works naturally on mobile
- diagnosis stays inside the current mode session
- Solver diagnosis result is solver-shaped
- Tutor diagnosis result is tutor-shaped

## Phase 6 — Make Image Input A First-Class Product Path
### Goal
Ensure images behave intentionally across Solver, Tutor, and diagnosis instead of living in generic chat state.

### What We Already Have
- image upload in `page.tsx`
- image preview in `prompt-input.tsx`
- drawing canvas in `drawing-canvas.tsx`
- image transport through `/api/chat`

### What Needs To Tighten Up
- pending image should clearly belong to the current mode
- image submission should always produce a mode-correct response
- the user should know whether they are solving, teaching, or diagnosing from the image

### What Needs Refactor
- current branching:
  - text-only solver goes to `/api/math/solve`
  - image solver goes to `/api/chat`
- this should be unified or wrapped so image submissions still get structured Solver behavior when in Solver

### What Needs Rebuild
- image-aware structured solve pipeline for Solver
- image-aware diagnosis pipeline
- explicit capture intent model:
  - solve from image
  - teach from image
  - diagnose from image

### Acceptance Criteria
- image uploaded in Solver returns Solver-shaped output
- image uploaded in Tutor returns Tutor-shaped output
- image uploaded for diagnosis returns diagnosis-shaped output
- image behavior is not an accidental side effect of route branching

## What We Should Not Build Yet
- flashcards
- dashboard
- credit-per-click pricing logic
- large feature suite
- cross-session child memory

Reason:
- the current product bottleneck is not missing feature count
- the bottleneck is unstable session behavior and weak follow-up workflow structure

## Engineering Map Based On Current Code

### `app/page.tsx`
#### Keep
- submit flow
- image flow
- route split between Solver and Tutor

#### Tighten
- mode switch behavior
- loading and visible-thread handling
- mode-owned image draft behavior

#### Refactor
- move from one `messages` state to separate mode sessions
- unify text/image submission behavior more intentionally

#### Rebuild
- active session controller
- diagnose capture entry flow

### `components/chat-types.ts`
#### Keep
- base message shape
- teaching metadata shape

#### Tighten
- type safety for model messages

#### Rebuild
- add:
  - `mode`
  - `responseType`
  - `sourceProblem`
  - optional `actions`
  - diagnosis action/result types later

### `components/chat-message-item.tsx`
#### Keep
- markdown rendering
- grade/skill badges
- explanation toggle

#### Tighten
- split details logic more safely

#### Refactor
- render based on message-owned data, not global mode

#### Rebuild
- action row under eligible messages
- diagnosis action launcher
- diagnosis result card

### `components/prompt-input.tsx`
#### Keep
- upload
- drawing canvas
- preview

#### Tighten
- mobile-first capture language
- clearer mode-aware image intent

#### Refactor
- separate generic chat image draft from diagnose-image draft

### `lib/math/solve-payload.ts`
#### Keep
- structured response generation
- metadata generation
- validation helpers
- fallback logic

#### Tighten
- stronger Solver contract validation
- clearer Tutor contract enforcement

#### Refactor
- add follow-up intent support for Solver
- add image-aware structured solving support later

### `app/api/chat/route.ts`
#### Keep
- history-based Tutor handling
- streaming
- image transport

#### Tighten
- constrain Tutor follow-ups more intentionally

#### Refactor
- support structured message actions inside Tutor mode

### New route to add
#### mistake-diagnosis route
- accepts:
  - original problem
  - prior answer
  - active mode
  - child-work image
- returns structured diagnosis result

### New UI surface to add
#### mobile bottom sheet for diagnosis
- image first
- camera/upload/draw actions
- fallback text field only if needed

## Priority Order
1. Fix shared-mode session bug
2. Refactor message ownership and rendering
3. Separate Solver and Tutor sessions cleanly
4. Add in-mode continuity
5. Productize existing practice as a message action
6. Build image-first mistake diagnosis
7. Refactor image input into a first-class mode-aware workflow

## Final Principle
The app is already half built.

Do not restart it.
Do not add random features.
Finish the core by making the existing Solver, Tutor, and Practice systems work together like one clean product.
