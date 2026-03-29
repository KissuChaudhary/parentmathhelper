# ParentMathHelper PRD

## Product
- Product: ParentMathHelper
- Version: PRD v4
- Category: Parent-facing homework assistant
- Core audience: Parents of children in Grades 3–6
- Paid-value focus: Parents of Grades 4–6 children

## Positioning
ParentMathHelper is a homework co-pilot for parents. It helps them decode the school method, guide their child without giving away the answer, review written work, and generate targeted practice during real homework time.

## Core Problem
Parents usually do not struggle with the final numeric answer. They struggle with:
- the teacher’s method being different from the parent’s method
- explaining the concept without making the child more confused
- homework becoming stressful and emotional
- not knowing whether the child actually understood
- checking written work without becoming the “bad cop”
- decode multi-step word problems,
- teach fractions and long division clearly,
- reduce homework stress and back-and-forth at home

## Target User
- Buyer: Parent or guardian
- End learner: Child in Grades 3–6
- Best-fit segment: Grades 4–6 homework support
- Primary moment: Evening homework help

## Product Promise
Make the parent feel like a capable, calm homework coach in under 2 minutes.

## Core Product Pillars
- Decode It: Explain the school method being used
- Teach It: Give the parent a script and coaching prompts
- Check It: Review the child’s written work and spot the first issue
- Practice It: Generate similar practice so the concept sticks

## Hero Features

### 1. School Method Decoder
- Parent uploads or pastes a problem
- Product identifies the likely classroom method
- Product explains:
  - what method is being used
  - why the school teaches it this way
  - how the parent should teach it in 60 seconds
- Example methods:
  - number bonds
  - area model
  - partial quotients
  - number line subtraction
  - common denominator strategy

### 2. Socratic Parent Script
- Product gives the parent 3–5 exact questions to ask the child
- Goal is to guide, not just tell
- Output must sound like spoken language, not a textbook
- Example:
  - “What is the problem asking us to find?”
  - “Which pieces already match?”
  - “What happens if we make both fractions into twelfths first?”

### 3. Child Work Checker
- Parent uploads the child’s notebook page, worksheet, or annotated work
- Product reviews the work in context of the original problem
- Output should:
  - start with what looks correct
  - point to the first step to double-check
  - give the next thing the parent should say
- Tone must feel reassuring, not punitive

### 4. Similar Practice Generator
- Parent taps one button to generate 1–3 problems on the same skill
- Problems should stay close to the original worksheet style and difficulty
- Goal is targeted reinforcement, not broad worksheet generation

## Product Modes

### Solve It
- Clear school-style worked solution
- Best when the parent wants the answer path fast
- Output includes:
  - Question
  - Final Answer
  - Solution Steps
  - Why This Works
  - Common Mistake

### Teach It
- Parent coaching mode
- Best when the parent wants to explain the concept properly
- Output includes:
  - What The Child Needs To Understand
  - How To Explain It
  - Analogy or teaching framing when useful
  - Solution Steps
  - Common Mistake
  - Practice Together

### Diagnose
- Mode-aware review of the child’s written work
- In Solve It context:
  - focus on the first math step to double-check
  - show the corrected move
  - suggest what the parent should say next
- In Teach It context:
  - focus on the likely misunderstanding
  - provide a calm parent explanation
  - give one small follow-up check

## MVP Scope
- Paste, type, upload, or annotate a homework problem
- Return structured Solve It output
- Return structured Teach It output
- Support image-first diagnosis of the child’s written work
- Support one-click similar practice generation
- Keep Solve It and Teach It as separate sessions

## Why It Wins
- This is not a generic student math bot
- This is not a calculator
- This is not a symbolic-math engine
- It is built for the parent’s actual homework job:
  - decode the method
  - guide the child
  - review the work
  - confirm the learning

## Non-Goals
- High school or college math
- Symbolic-math positioning
- Backend code execution in the user experience
- Raw answer dumping without teaching help
- Flashcards in MVP
- Weekly dashboards in MVP
- Large all-in-one study platform behavior

## Success Criteria
- Parents return weekly during homework time
- Highest usage comes from fractions, word problems, division, and diagnosis flows
- Parents say the app helps them teach the school method
- Diagnose becomes a repeat-use feature, not just a novelty
- Similar practice is used after the first answer to confirm understanding

## Product Requirements

### Inputs
- Typed math problem
- Conversational parent prompt
- Worksheet image
- Child work image
- Annotated or drawn work

### Outputs
- Structured markdown
- Parent-friendly language
- No technical backend details
- Calm, non-punitive tone

### Core Workflows
- Solve from problem
- Teach from problem
- Diagnose from child work
- Generate similar practice

## Solve It Contract
- Question
- Final Answer
- Solution Steps
- Why This Works
- Common Mistake

## Teach It Contract
- What The Child Needs To Understand
- How To Explain It
- Teaching framing or analogy when useful
- Solution Steps
- Common Mistake
- Practice Together

## Diagnose Contract

### In Solve It Context
- What Looks Right
- What To Double-Check
- A Better Next Step
- What To Say Next

### In Teach It Context
- What Looks Right
- What To Check Next
- What To Say Next
- Quick Check

## Content Rules
- Keep the tone calm and practical
- Optimize for Grades 3–6
- Be strongest on Grades 4–6 topics
- Prioritize method explanation over raw computation
- Use plain English before math jargon
- Do not expose code, runtimes, or system details
- If reviewing child work, start with what looks correct
- Do not force an error if the child’s work appears correct
- Keep parent scripts short enough to say aloud naturally

## Tech Direction
- LLM-first
- Lightweight deterministic validation for arithmetic, fractions, decimals, and simple geometry checks
- Structured response templates for Solve It and Teach It
- Structured diagnosis template for child-work review
- Normalized input for better caching
- No heavy symbolic execution layer
- Image-first workflows for diagnosis and worksheet help

## Monetizable Product Promise
- Decode the teacher’s method
- Tell the parent what to say next
- Check the child’s work without making the parent the “bad cop”
- Generate immediate targeted practice

## Later Features
- Weekly parent insight report
- Trend tracking across recurring homework sessions
- Skill summaries for parent-teacher discussions

## Not Now
- Flashcards
- Broad study dashboard
- Credit-per-click monetization
- General student platform features

## One-Line Positioning
ParentMathHelper helps parents of Grades 3–6 children decode school math methods, coach their child during homework, review written work, and generate targeted practice.













