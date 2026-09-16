# Implementation report

## Baseline

- Integration repository: `lirtual/open-design-chatgpt`
- Upstream repository: `nexu-io/open-design`
- Pinned upstream commit: `eca7c7ab989852fb586384e19bcb6a6f2d7321f4`
- Patch: `patches/open-design-chatgpt-v0.1.patch`

## Implemented

The patch keeps OpenDesign as the deterministic local runtime and adds only the minimum ChatGPT-facing integration surface:

- restricted `chatgpt` MCP profile with a tool allowlist and dispatch-time rejection;
- exact authorized project-id scope;
- stable explicit project ids for response-loss-safe project creation;
- full-file SHA-256 content fingerprints for reads, including streamed binary hashing;
- conditional write/delete preconditions enforced in the daemon path;
- same-path in-process serialization plus atomic create-if-absent and atomic replacement commit points;
- empty UTF-8 and base64 binary write support;
- reuse of the existing scoped preview URL;
- thin HTML/PDF export wrapper with a bounded streaming payload limit;
- no Agent Run, login flow, shell/process tool, second renderer, second backend, or public preview proxy;
- focused tests for tool restriction, authorization, digests, response-loss behavior, concurrency, create-only races, empty/binary files, deletes, and export-size bounds.

## Deliberate residual boundary

The daemon lock serializes mutations that pass through this daemon process. It does not make arbitrary external editor/process writes participate in the same lock. A filesystem change performed by another process between precondition verification and the daemon's commit remains an external race; the integration must not claim otherwise.

## Validation state

Repository CI has validated the patch against the exact pinned upstream commit. GitHub Actions run `35083316049` completed successfully with:

- clean patch apply;
- all three focused integration test files;
- daemon typecheck;
- daemon build;
- repository guard;
- root repository typecheck;
- daemon regression suite split into the upstream-style four shards, all successful.

This establishes the repository-side G0/G2 implementation and regression evidence for the pinned upstream baseline.

Real ChatGPT Web installation/write-path acceptance remains a separate G1/manual gate because it depends on the capabilities enabled for the target ChatGPT account/workspace and cannot be replaced by a mock or repository test.
