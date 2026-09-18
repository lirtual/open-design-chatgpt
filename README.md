# OpenDesign for ChatGPT — validated implementation bundle

This bundle implements the accepted `open-design-chatgpt-spec.md` as a small upstream patch plus a thin ChatGPT integration skill. It is deliberately **not** a second OpenDesign backend, agent runtime, revision service, renderer, or tunnel implementation.

## Baseline

- Upstream: `nexu-io/open-design`
- Pinned commit: `eca7c7ab989852fb586384e19bcb6a6f2d7321f4`
- Integration patch: `patches/open-design-chatgpt-v0.1.patch`
- Implementation/CI status: validated against the pinned upstream commit. GitHub Actions run `35083316049` passed the focused integration tests, daemon typecheck/build, repository guard, root typecheck, and all four daemon test shards.
- Real stdio MCP acceptance: passed in GitHub Actions run `35337185229`, including restricted discovery, authorization rejection, create/read/write/conflict/preview/HTML-export/delete through a real MCP SDK client and real patched daemon.
- Remaining product gate: real ChatGPT Web installation/write acceptance. On the current target ChatGPT Plus account, the required custom MCP write/modify workspace entry was not available during the 2026-09-18 manual check; this is recorded as a product/account capability block rather than an implementation failure.

## Apply

```bash
git checkout eca7c7ab989852fb586384e19bcb6a6f2d7321f4
git switch -c open-design-chatgpt-v0.1
git apply --index /path/to/patches/open-design-chatgpt-v0.1.patch
```

Then run the commands in `docs/VALIDATION.md`.

## Restricted MCP profile

Launch the existing MCP implementation with the ChatGPT profile and an explicit allowlist of existing project ids:

```bash
OD_MCP_PROFILE=chatgpt \
OD_MCP_CHATGPT_PROJECTS=project-id-1,project-id-2 \
od mcp
```

The profile keeps the normal MCP behavior unchanged for other clients. In ChatGPT mode it exposes only deterministic project/file/preview/export/skill-discovery tools, requires exact project ids, requires optimistic-concurrency preconditions for overwrite/delete, and rejects hidden Agent Run/login/project-delete calls in dispatch as well as discovery.

A project created through restricted `create_project` must include a stable explicit id. That id is admitted to the running session allowlist so a response-loss recovery can verify the exact project before deciding whether to retry.

## ChatGPT Web connection

ChatGPT does not directly connect to a localhost MCP server. Use the supported ChatGPT local/private MCP transport for the target workspace rather than exposing the daemon publicly or adding a custom Cloudflare proxy. Preview URLs remain local/same-machine URLs.

The spec requires write actions, so G1 must be performed on a ChatGPT account/workspace where the required custom MCP write/modify capabilities are available.

## Files

- `docs/open-design-chatgpt-spec.md` — accepted specification.
- `docs/G0-capability-map.md` — pinned source facts and minimum-change mapping.
- `docs/VALIDATION.md` — automated evidence, manual gate, renderer and limit notes.
- `docs/IMPLEMENTATION-REPORT.md` — implemented surface, residual boundary, and validation status.
- `skills/open-design/SKILL.md` — thin ChatGPT integration/router skill.
- `patches/open-design-chatgpt-v0.1.patch` — upstream code/test patch.
- `compatibility.json` — pinned compatibility/capability declaration.
- `.github/workflows/validate.yml` — checks the patch against the exact upstream commit and runs focused validation plus the upstream-style four-shard daemon regression suite.
- `.github/workflows/mcp-acceptance.yml` and `scripts/mcp-acceptance.mjs` — manually or sentinel-triggered real stdio MCP acceptance against a temporary project.

## Non-goals retained

No OpenDesign Cloud backend, no new account/database/artifact service, no nested agent, no shell/process tool, no custom patch protocol, no cross-file transaction, no public preview proxy, no Apps SDK editor, no PPTX/video MVP, and no second renderer.
