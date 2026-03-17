# Portable Shield Starter Kit

This folder contains a minimal model-agnostic starting point for wrapping coding agents in a zero-trust workflow.

## Files

- `policy.yaml`: baseline allow and deny rules for shell, paths, network, and secret handling.
- `agent-shield.skill.md`: a reusable operating contract that can be adapted into agent instructions, system prompts, or skill files.
- `harness-scenarios.json`: baseline test cases for a self-hardening wrapper loop.

## Intended workflow

1. The user asks an agent to perform work.
2. The agent proposes a tool call with a plain-language intent statement.
3. A gateway validates the tool call against `policy.yaml`.
4. Allowed actions run inside a sandboxed executor.
5. Denied actions are logged and converted into new harness tests.
6. Wrapper improvements are only deployed after the scenario suite passes.

## Workshop framing

For non-technical audiences, keep the explanation short:

- The lab box keeps the AI away from your real machine.
- The shield decides what tools and paths are allowed.
- The harness turns blocked mistakes into better tests.

## Next step

If you want this to become a production control, add:

- a real sandbox runtime,
- a command parser that understands arguments structurally,
- audit logging,
- per-team policy profiles,
- a wrapper catalog for common approved actions.
