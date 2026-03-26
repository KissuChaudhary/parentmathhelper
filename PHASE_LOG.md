# Phase Log

## Phase 1 - Geometry routing and parser hardening
- Added geometry problem type detection and SymPy geometry templates.
- Added safe parser error markers instead of raw execution trace leaks.
- Added readable step formatting in solver responses.

## Phase 2 - Deterministic reliability contract
- Added `errorCode` and `retryHint` from interpreter normalization.
- Added deterministic fallback messages in math solve and chat routes.
- Added symbolic payload propagation for reliability metadata in UI message types.

## Phase 3 - Multi-domain deterministic expansion
- Added deterministic handlers for arithmetic, probability, and statistics.
- Added optional NumPy/SciPy/statsmodels usage with safe fallbacks in templates.
- Added parser marker handling for all deterministic domain errors.

## Phase 4 - Readiness gate and extraction metadata
- Added deterministic readiness gate before interpreter execution.
- Added extracted parameters, required values, and missing values metadata.
- Added cache-version bumps to avoid stale response behavior.

## Phase 5 - Quality scoring and ambiguity gating
- Added weighted extraction quality score and breakdown metrics.
- Added ambiguity conflict detection and block-on-ambiguity policy.
- Exposed quality metadata through solve/chat payloads and UI error hint display.

## Phase 6 - Extractor modularization and regression scaffolding
- Moved domain extraction logic into `lib/math/deterministic-extractors.ts`.
- Wired `sympy-utils.ts` to use modular extractors plus shared scoring/readiness.
- Added domain-by-domain golden-case test scaffolding in `tests/extractors`.
- Added `test` and `test:extractors` scripts for regression execution.

## Phase 7 - Critical solver reliability fixes for real user prompts
- Fixed probability Bayes-style word problem handling using machine-share and defect-rate extraction.
- Upgraded trigonometry parsing to support conditional values like `cos A = 2/5` and evaluate target expressions.
- Upgraded algebra parsing for implicit multiplication patterns like `(1-a)(1-b)` with conditional simplification.
- Added executable symbolic regression tests for probability, trigonometry, and algebra failure prompts.

## Move Map
- `lib/math/sympy-utils.ts` extraction branches -> `lib/math/deterministic-extractors.ts`.
- Domain parser hardening retained in `lib/math/code-templates.ts`, with targeted regression locks in `tests/extractors/symbolic-regression.test.ts`.

## Removed
- No intentional capability removals in logged phases.
