# G0 Capability Map

Pinned upstream baseline: `nexu-io/open-design@eca7c7ab989852fb586384e19bcb6a6f2d7321f4`.

| Capability | Baseline fact | Implementation decision |
|---|---|---|
| MCP runtime | `apps/daemon/src/mcp.ts` is the existing stdio MCP proxy | Reuse it; add one `chatgpt` restricted profile, not a second MCP server |
| Project/file scope | Daemon already has workspace authorization and path containment | Add a connection-level exact project-id allowlist; retain daemon authorization underneath |
| Tool minimization | Default MCP also exposes brief, login, Agent Run, agents, project deletion | Filter `tools/list` and reject the same tools in dispatch for `chatgpt` profile |
| Full-file read | `get_file` already reads the complete HTTP body before slicing lines | Hash the complete raw response bytes and expose the digest with every page |
| Version/serialization | `project-file-versions.ts` already has SHA-256 history and a per-project/file in-process lock | Reuse `withProjectFileVersionLock`; no new revision database or lock service |
| Conditional write | Existing MCP `write_file` sends an unconditional overwrite | Add a digest/non-existence precondition and check it inside the existing file lock |
| Conditional delete | Existing nested-path delete is unconditional after authorization | Add expected digest and check inside the same lock |
| Atomic file commit | Existing overwrite uses direct `writeFile(target, body)` | Use a sibling temp file + rename for conditional replacement; use temp + hard-link for no-overwrite create |
| Mutation retry | MCP target already refuses automatic replay of writes after daemon-unreachable errors | Preserve this; restricted create also removes workspace-error headerless retry |
| Stable create | Default `create_project` invents an id when omitted | Restricted schema requires an explicit stable id and checks that id before create |
| Preview | Daemon has `/api/projects/:id/preview-url` with scoped URLs | Add a thin `get_preview` MCP wrapper; do not create a preview server |
| HTML export | Daemon has `/api/projects/:id/export/html` / generic export | Add a thin `export_artifact` MCP wrapper |
| PDF export | Generic export reuses existing desktop screenshot renderer and returns 501/502 when unavailable | Reuse it; no headless/cloud fallback |
| Skills/design context | Existing MCP resources expose OpenDesign references | Thin integration skill only; no wholesale skill mirror |
| ChatGPT Web transport | ChatGPT does not connect directly to local MCP | Use OpenAI Secure MCP Tunnel when the target ChatGPT plan supports the required MCP actions |

## Security boundary

The restricted profile is fail-closed at two layers: tool discovery/dispatch and exact authorized project ids. Existing daemon workspace/path checks remain authoritative beneath it. Hidden tools cannot be invoked by calling their names directly.

## Known residual race

`withProjectFileVersionLock` serializes OpenDesign-managed operations in the daemon process. It cannot lock arbitrary external editors. A separate process can theoretically modify the same path after the digest check and before the atomic rename/unlink. The patch narrows the window and prevents managed-write lost updates, but it does not claim cross-process filesystem locking.
