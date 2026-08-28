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

## Boundary

mikuOS お姫様 is an operating-system profile, not a server framework and not
an application distribution. It must remain usable underneath JavaScript,
PHP, another language runtime, or a non-language-specific native service.

The profile inherits canonical mikuOS kernel, process, credential, VFS and THX
semantics. It changes composition rather than maintaining an independent copy
of those semantics.

## Bare root

The first お姫様 build profile derives a new root from canonical
`.thistle.base` instead of modifying that root in place. This keeps upstream
synchronisation straightforward while ensuring the distributed appliance does
not carry the interactive mikuOS userland.

The bare image contains only:

- filesystem skeleton required by the runtime;
- `/etc/passwd`, `/etc/group` and `/etc/os-release`;
- a root identity and an unprivileged `service` identity;
- empty runtime locations such as `/usr/bin` and `/usr/lib`;
- ephemeral locations such as `/run` and `/tmp`.

It deliberately contains no selected application runtime yet. A later layer
will install the chosen runtime without changing the お姫様 base contract.

The base build currently enforces a 64 KiB packed payload ceiling. This budget
covers the bare root payload only, not Teto or a future runtime/application.

Build and check it with:

    npm run build:ohimesama
    npm run ohimesama:check

## Retained OS facilities

The eventual headless host retains only facilities required for appliance
execution, including:

- Teto execution;
- processes;
- UID/GID and credential enforcement;
- VFS permissions;
- required syscalls;
- memory management;
- resource limits;
- entropy;
- clocks;
- IPC;
- deterministic headless startup;
- ephemeral operation.

## Explicitly excluded

The runtime distribution must not require:

- an interactive shell;
- login;
- a terminal frontend;
- an editor;
- interactive userland;
- a development toolchain at runtime;
- a runtime package manager;
- a persistent user home.

Node, npm or Bun may be used to build the distribution without becoming part
of the runtime image.

## Upstream relationship

Canonical mikuOS is configured as the `upstream` Git remote.

mikuOS お姫様 itself is `origin`.

Canonical changes are incorporated through reviewed synchronisation pull
requests rather than silently merged into `main`. CI also requires current
canonical `mikuOS/main` to remain an ancestor of the お姫様 revision being
merged.
