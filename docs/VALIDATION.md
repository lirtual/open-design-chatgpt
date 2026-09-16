# Validation status

## Latest automated evidence

Repository-side validation is green for the pinned OpenDesign baseline.

- Integration repository: `lirtual/open-design-chatgpt`
- Validated integration commit: `cb15855d94dd0ee9b6c7e02055136f42906a1e53`
- Pinned upstream commit: `eca7c7ab989852fb586384e19bcb6a6f2d7321f4`
- GitHub Actions run: `35083316049`
- Run date: 2026-09-16
- Result: success

The successful run verified:

- `git apply --check` and patch application against the exact pinned upstream commit;
- `tests/mcp-chatgpt-profile.test.ts`;
- `tests/projects-atomic-write.test.ts`;
- `tests/project-file-preconditions.test.ts`;
- `pnpm --filter @open-design/daemon typecheck`;
- `pnpm --filter @open-design/daemon build`;
- `pnpm guard`;
- root `pnpm typecheck`;
- all four daemon regression shards using `pnpm --filter @open-design/daemon test --shard=N/4 --reporter=verbose` for `N=1..4`.

The daemon regression suite is intentionally sharded to match the upstream CI strategy. The upstream daemon Vitest configuration serializes test files because multiple suites mutate process-wide state or bind real local servers, so combining the entire suite into one CI process is unnecessarily slow.

## Automated validation workflow

`.github/workflows/validate.yml` checks out this integration repository and the exact pinned OpenDesign commit, applies the patch, installs the pinned workspace dependencies, and runs two validation tracks in parallel.

### Integration validation

```bash
git -C upstream apply --check patches/open-design-chatgpt-v0.1.patch
git -C upstream apply patches/open-design-chatgpt-v0.1.patch

cd upstream/apps/daemon
pnpm exec vitest run tests/mcp-chatgpt-profile.test.ts --reporter=verbose
pnpm exec vitest run tests/projects-atomic-write.test.ts --reporter=verbose
pnpm exec vitest run tests/project-file-preconditions.test.ts --reporter=verbose

cd ../..
pnpm --filter @open-design/daemon typecheck
pnpm --filter @open-design/daemon build
pnpm guard
pnpm typecheck
```

### Daemon regression matrix

Four parallel jobs each run one shard:

```bash
pnpm --filter @open-design/daemon test --shard=N/4 --reporter=verbose
```

where `N` is `1`, `2`, `3`, or `4`.

The workflow uses `cancel-in-progress` so superseded validation runs do not consume runners after a newer commit is pushed.

## What the automated evidence establishes

For the pinned upstream baseline, repository CI verifies the implementation-side G0/G2 requirements covered by code and tests: restricted MCP dispatch/discovery behavior, exact authorization scope, stable create identifiers, full-file digests, conditional write/delete semantics, atomic create/replace behavior, empty/binary handling, bounded export responses, patch compatibility, type safety, buildability, repository guard compliance, and daemon regression coverage.

This does **not** replace real ChatGPT Web acceptance.

## Manual ChatGPT Web gate

Real ChatGPT Web installation and write-path acceptance is a separate G1/manual gate. The target ChatGPT account/workspace must expose the required custom MCP write/modify capabilities; mock MCP tests and repository CI cannot substitute for this acceptance step. Local/private MCP connectivity must use a supported ChatGPT transport rather than exposing the OpenDesign daemon publicly.

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
