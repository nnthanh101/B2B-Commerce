<!-- LEAN/5S/3T pull-request contract. Keep PRs small and single-purpose. -->

## What & why

## LEAN — minimal change

- [ ] One concern only; no unrelated churn (no _muda_)
- [ ] Vendored `apps/**` not reformatted wholesale

## 5S

- [ ] **Sort** — no dead code, files, or commented-out blocks added
- [ ] **Shine** — `pnpm lint`, Prettier, and markdownlint pass locally
- [ ] **Standardize** — Conventional Commit title; files in their fixed location
- [ ] **Sustain** — tests / CI updated where behavior changed

## 3T — Traceability · Transparency · Trust

- Linked story / issue:
- ADR (if architectural decision):
- Evidence / FinOps tags (if infra changes):

## Verification

- [ ] CI green
- [ ] Docs updated (`README` / `CHANGELOG` / `features.md` / `TODO.md`)
