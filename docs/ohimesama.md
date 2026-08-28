# mikuOS お姫様

**mikuOS お姫様** is the minimal headless distribution of mikuOS.

It is intended for non-interactive, client-hosted appliance workloads.

Canonical semantic upstream:

    kitty-crow/mikuOS

## Layering

    Teto
      ↓
    mikuOS お姫様
      ↓
    一番
      ↓
    miku.js
      ↓
    application

This repository contains the mikuOS お姫様 layer.

一番, miku.js and individual applications remain independent reusable
layers above it.

## Design

mikuOS お姫様 inherits the execution and security semantics of canonical
mikuOS while removing facilities unnecessary for headless appliances.

It retains facilities such as:

- Teto execution
- processes
- UID/GID and credential enforcement
- VFS permissions
- required syscalls
- memory management
- resource limits
- entropy
- clocks
- IPC
- headless startup
- ephemeral operation

It does not require:

- an interactive shell
- login
- a terminal frontend
- an editor
- interactive userland
- a development toolchain at runtime
- a runtime package manager
- a persistent user home

Node, npm or Bun may be used to build the distribution without becoming
part of the runtime image.

## Upstream relationship

Canonical mikuOS is configured as the `upstream` Git remote.

mikuOS お姫様 itself is `origin`.

Canonical changes are incorporated through reviewed synchronisation pull
requests rather than silently merged into `main`.
