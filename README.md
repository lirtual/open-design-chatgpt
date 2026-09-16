# OpenDesign for ChatGPT — validation-first implementation bundle

This bundle implements the accepted `open-design-chatgpt-spec.md` as a small upstream patch plus a thin ChatGPT integration skill. It is deliberately **not** a second OpenDesign backend, agent runtime, revision service, renderer, or tunnel implementation.

## Baseline

- Upstream: `nexu-io/open-design`
- Pinned commit: `eca7c7ab989852fb586384e19bcb6a6f2d7321f4`
- Integration patch: `patches/open-design-chatgpt-v0.1.patch`
- Integration status: validation-first; upstream test run and real ChatGPT Web write-path acceptance are still required.

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

ChatGPT does not directly connect to a localhost MCP server. Use OpenAI's Secure MCP Tunnel for a supported ChatGPT workspace rather than exposing the daemon publicly or adding a custom Cloudflare proxy. The tunnel transports MCP traffic only; preview URLs remain local/same-machine URLs.

Current OpenAI plan availability must be checked at install time. The spec requires write actions, so a plan that only permits read/fetch custom MCP cannot complete the MVP acceptance matrix.

## Files

- `docs/open-design-chatgpt-spec.md` — accepted specification.
- `docs/G0-capability-map.md` — pinned source facts and minimum-change mapping.
- `docs/VALIDATION.md` — commands, blockers, renderer and limit notes.
- `docs/IMPLEMENTATION-REPORT.md` — implemented surface, residual boundary, and validation status.
- `skills/open-design/SKILL.md` — thin ChatGPT integration/router skill.
- `patches/open-design-chatgpt-v0.1.patch` — upstream code/test patch.
- `compatibility.json` — pinned compatibility/capability declaration.
- `.github/workflows/validate.yml` — checks the patch against the exact upstream commit and runs the validation suite.

## Non-goals retained

No OpenDesign Cloud backend, no new account/database/artifact service, no nested agent, no shell/process tool, no custom patch protocol, no cross-file transaction, no public preview proxy, no Apps SDK editor, no PPTX/video MVP, and no second renderer.
