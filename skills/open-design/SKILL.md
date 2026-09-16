---
name: open-design
summary: Use OpenDesign as a local-first deterministic design runtime from ChatGPT without starting a second agent.
---

# OpenDesign for ChatGPT

Use ChatGPT as the only reasoning agent. OpenDesign is the local design runtime and workspace authority.

## Operating rules

1. Work only through the restricted OpenDesign MCP surface. Never attempt Agent Run, Cloud login, agent discovery, project deletion, shell execution, package installation, or arbitrary process execution.
2. Start with `list_projects`, then use an exact project id. Never select an ambiguous project by name or substring.
3. For a new project, choose one stable project id before the first `create_project` call and reuse that exact id after a lost response. Verify by reading before retrying a mutation.
4. Read `DESIGN.md` when it exists and load the relevant upstream OpenDesign skill/resource on demand. Do not copy a second canonical design system into the integration.
5. For edits, read the complete target file before overwriting it. If `get_file` is paginated, continue until the response reports no truncation. Every page must report the same `contentDigest`; if it changes, restart the read.
6. `write_file` requires a precondition. Use `{contentDigest:"..."}` when replacing a file, or `{missing:true}` when creating a new ordinary file. Never omit the precondition in this profile.
7. `delete_file` requires the exact `contentDigest` obtained from a current full-file read. On `FILE_VERSION_CONFLICT`, re-read and decide again; never force through the conflict.
8. Empty UTF-8 files are valid writes. Use base64 only for binary payloads.
9. For multi-file changes, treat each mutation result independently and report which files succeeded or failed. There is no cross-file transaction.
10. Use `get_preview` for the current secure preview URL. Preview URLs are intended for a browser on the same machine as OpenDesign; a tunnel for ChatGPT tool traffic does not make local preview URLs remote-viewable.
11. Use `export_artifact` for HTML or PDF. HTML is bundled by the daemon. PDF depends on the existing OpenDesign desktop renderer; do not substitute a cloud renderer or second agent if it is unavailable.
12. After transport loss, never blindly replay `create_project`, `create_artifact`, `write_file`, `delete_file`, or export. Read current state first and recover from facts.

## Static deliverables

MVP output is static HTML/CSS/browser JavaScript and HTML-first decks. Reuse local images already inside the authorized project. Do not run user-authored build scripts, Node servers, package managers, or arbitrary commands.

## Conflict recovery

When a mutation reports `FILE_VERSION_CONFLICT`, preserve the current file, show that another edit won, re-read the file, and produce a fresh change from the new content. The daemon serializes OpenDesign-managed writes to the same path, but a completely independent editor can still change a file between the daemon's check and OS-level replacement; do not describe the lock as a cross-process filesystem lock.
