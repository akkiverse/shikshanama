# CR-0002: Resolve Vercel Python 3.14 Wheel Compatibility for psycopg-binary & Pillow

- **Status:** In review
- **Card:** https://github.com/akkiverse/product-think-tank/issues/7 · **Branch:** `cr/0002-vercel-python-wheel-fix` · **PR:** #2
- **Date:** 2026-11-02 · **Author:** engineer

## Why
Vercel's Python builder uses CPython 3.14 (`cp314`). In `CR-0001`, `psycopg[binary]==3.2.3` was strictly pinned to `3.2.3`, which only published pre-built wheels up to `cp313`, causing `uv pip install` to fail during Vercel build.

## What changes
- Update `pyproject.toml` and `requirements.txt` to allow `psycopg[binary]>=3.1.18` and `pillow>=11.0.0` (matching `wealth-manager`) and regenerate `uv.lock` so `psycopg-binary` resolves to `3.3.6` (which includes `cp314` wheels).

## Acceptance criteria
| ID | Criterion | New / Changed / Removed | Test |
|---|---|---|---|
| AC-19.2 | Preview deployment builds cleanly on Vercel Python runtime and passes full test suite | Changed | `test_ac_19_1_to_19_5_and_22_and_23_seo_jsonld_bundle_and_hinglish` |

## Out of scope
- Any functional or schema changes.

## Data and compatibility
100% backwards-compatible; no database schema changes.

## Risks and rollback
Low risk; rollback via Vercel Instant Rollback and revert PR.

## Links
- Test report: `docs/test-reports/CR-0002.md`
