# Validation status

## Automated validation

The integration repository runs `.github/workflows/validate.yml` against the exact pinned OpenDesign commit. The workflow:

```bash
git apply --check patches/open-design-chatgpt-v0.1.patch
git apply patches/open-design-chatgpt-v0.1.patch
pnpm --filter @open-design/daemon test -- mcp-chatgpt-profile projects-atomic-write project-file-preconditions
pnpm --filter @open-design/daemon test
pnpm --filter @open-design/daemon typecheck
pnpm --filter @open-design/daemon build
pnpm guard
pnpm typecheck
```

The upstream repository test-efficiency rules also require focused tests before the containing package is treated as green.

## What is verified locally in this delivery

- Upstream commit pinned: `eca7c7ab989852fb586384e19bcb6a6f2d7321f4`.
- Relevant root/apps test guidance and daemon seams were inspected at that commit.
- `git apply --numstat` accepts the patch as a syntactically valid unified diff.
- The patch is scoped to existing MCP/file/export seams; it does not introduce a cloud backend, second agent, second MCP business contract, generic shell, revision database, custom renderer, or custom tunnel service.
- The distribution skill is intentionally thin and does not vendor upstream OpenDesign skills.

The stronger apply/test/typecheck/build result is owned by repository CI so it runs in a real writable checkout of the pinned upstream source. Do not mark the integration CI-green until that workflow is green.

## Manual ChatGPT Web gate

Real ChatGPT Web installation and write-path acceptance is a separate G1/manual gate. The target ChatGPT account/workspace must expose the required custom MCP write/modify capabilities; mock MCP tests cannot substitute for this acceptance step. Local MCP connectivity must use the supported ChatGPT local/private MCP transport rather than exposing the OpenDesign daemon publicly.

## Renderer conditions

- HTML export is daemon-side standalone bundling.
- PDF export uses OpenDesign's existing desktop renderer path.
- The daemon's desktop renderer IPC timeout is 600,000 ms at the pinned commit.
- Missing desktop rendering support returns the existing explicit 501/502 error; the integration must not fall back to a second renderer.

## MCP inline-export limit

The patch sets an integration safety limit for MCP-returned export bytes rather than claiming a ChatGPT platform limit:

- default: 8 MiB raw export bytes;
- configurable via `OD_MCP_EXPORT_MAX_BYTES`;
- hard cap: 32 MiB raw bytes;
- `Content-Length` is rejected early when present;
- chunked/unknown-length responses are read incrementally and cancelled as soon as the raw-byte limit is exceeded;
- only an in-limit response is assembled and base64-encoded for the MCP result.

This is an implementation safety bound and should be tuned only from measured real workloads.
