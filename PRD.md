# ParentMathHelper PRD

## Product
- Product: ParentMathHelper
- Version: PRD v3
- Category: Parent-facing math homework assistant
- Core audience: Parents of children in Grades 3–6
- Paid-value focus: Grades 4–6

## Positioning
ParentMathHelper helps parents explain math homework the way schools teach it now, especially when the child is stuck on fractions, long division, decimals, word problems, and multi-step thinking.

## Problem
Parents can usually solve easy arithmetic on their own. They struggle when they need to:
- explain why a method works,
- teach the school-style method,
- decode multi-step word problems,
- teach fractions and long division clearly,
- reduce homework stress and back-and-forth at home.

## Target User
- Buyer: Parent or guardian
- End learner: Child in Grades 3–6
- Best-fit segment: Parents of Grades 4–6 children
- Use moment: Homework help at home

## Core Use Cases
- Fractions and equivalent fractions
- Add/subtract fractions
- Long division and remainder meaning
- Decimals and place value
- Multi-step word problems
- Area vs perimeter
- Measurement conversions
- Beginning algebra and pattern questions

## Product Modes
- Solve It: Clear school-style steps and final answer
- Teach It: Parent script, teaching tips, likely mistake, one practice question

## MVP Features
- Paste or type a homework problem
- Get a structured solution with school-style steps
- Get a parent-friendly explanation of how to teach it
- Get a simple word-problem breakdown when needed
- Get one likely mistake to watch for
- Get one follow-up practice question

## Why It Wins
This is not a calculator and not an advanced symbolic math tool. It is a homework explanation tool for parents who roughly know the topic but do not know how to teach it clearly.

## Non-Goals
- High school or college math
- Symbolic-math positioning
- Backend code execution in the user experience
- Raw answer dumping without teaching help

## Success Criteria
- Parents return weekly during homework time
- Highest usage comes from fractions, word problems, and division
- Explanations feel clearer than generic AI chat
- Outputs are fast, structured, and easy to say out loud
- Tutor mode is strong enough to justify paying

## Product Requirements
- Inputs
  - Text problem
  - Conversational parent prompt
  - Worksheet image if available in product
- Outputs
  - Structured markdown
  - Parent-friendly language
  - No technical backend details
- Modes
  - Solve It
  - Teach It
- Core response sections
  - Problem restatement
  - Final answer
  - Step-by-step solution
  - Why it works or how to explain it
  - Common mistake
  - Practice question

## Content Rules
- Keep the tone calm and practical
- Optimize for Grades 3–6
- Be strongest on Grades 4–6 topics
- Prioritize method explanation over raw computation
- Use plain English before math jargon
- Do not expose code, runtimes, or system details

## Tech Direction
- LLM-first
- Lightweight deterministic validation for arithmetic, fractions, decimals, and simple geometry checks
- Structured response templates for Solve It and Teach It
- Normalized input for better caching
- No heavy symbolic execution layer

## One-Line Positioning
ParentMathHelper helps parents of Grades 3–6 children explain math homework clearly, especially fractions, word problems, decimals, and long division.
