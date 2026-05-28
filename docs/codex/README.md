# Codex Migration Notes

This directory contains legacy project knowledge converted into Codex-friendly references.

- `../../AGENTS.md` and nested `AGENTS.md` files are the primary instructions Codex reads automatically by scope.
- `commands/` contains reusable workflow playbooks migrated from legacy commands.
- `memory/` contains durable project memory copied from the legacy project memory store.

When updating long-lived project rules, prefer editing the relevant `AGENTS.md` file. When capturing historical context or lessons learned, add or update a note under `docs/codex/memory/`.
