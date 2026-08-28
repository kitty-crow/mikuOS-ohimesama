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

The お姫様 build profile derives a new root from canonical `.thistle.base`
instead of modifying that root in place. This keeps upstream synchronisation
straightforward while ensuring the distributed appliance does not carry the
interactive mikuOS userland.

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

## Headless host

お姫様 has its own browser/Worker entry point rather than reusing the normal
mikuOS browser session. The shipped dependency graph is audited during the
build and rejects imports from the shell, TTY, normal boot/session, xterm,
persistent browser root and built-in application layers.

Bare boot creates the canonical kernel and exactly one process: PID 1. PID 1
has a minimal non-interactive environment and remains available for the layer
above お姫様 to use as its supervisor. No login or shell process is created.

The immutable browser root loader supports the packaged root format without
OPFS or another persistence backend. Baseline Teto is loaded directly from an
explicit asset URL, which keeps the Worker host independent of `document`.

A very small live device substrate is created at boot for generic runtime
compatibility:

- `/dev/null`;
- `/dev/zero`;
- `/dev/random`;
- `/dev/urandom`;
- `/dev/full`.

There is intentionally no `/dev/console`, `/dev/tty` or PTY surface in the
headless profile. Native `getrandom` support remains available through the
canonical RV64 syscall layer as well.

## Build

Build and validate the standalone distribution with:

    npm run test:ohimesama

The output is under `dist/ohimesama/`:

    ohimesama.js       minified headless host
    teto.wasm          baseline Teto only
    root/              immutable stripped root package
    profile.json       machine-readable profile/build measurements
    host-inputs.json   audited host dependency graph

The お姫様 build path compiles shared mikuOS sources and Teto directly. It does
not build the normal interactive mikuOS web distribution first.

## Retained OS facilities

The headless host retains only facilities required for appliance execution,
including:

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

## CI invariants

CI verifies both the static image and an actual bare boot. Among other things,
it requires:

- the root to contain only the explicit base allowlist;
- no selected runtime payload before a runtime layer is introduced;
- no interactive shell in account records;
- no interactive host modules in the bundled dependency graph;
- only PID 1 after bare boot;
- zero built-in applications;
- validated baseline Teto execution;
- no interactive environment variables or devices;
- the minimal runtime device substrate to be present;
- the bare root to remain within its packed-size budget.

## Upstream relationship

Canonical mikuOS is configured as the `upstream` Git remote.

mikuOS お姫様 itself is `origin`.

Canonical changes are incorporated through reviewed synchronisation pull
requests rather than silently merged into `main`. CI also requires current
canonical `mikuOS/main` to remain an ancestor of the お姫様 revision being
merged.
