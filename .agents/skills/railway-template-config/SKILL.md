---
name: railway-template-config
description: Generate startup YAML or JSON config for Railway Docker or template services deployed without Git.
---

# Railway Template Config Pattern

Injecting and generating custom configuration files (like `config.yaml` or `config.json`) dynamically at runtime when deploying pre-built Docker images or templates directly in Railway (where no Git repository is attached to modify or build files).

## Core Strategy

Since there is no repository codebase to commit config files into, configurations must be stored as **Service Variables** (environment variables) in Railway and written to files at container startup, as part of the **Start Command**.

## Start Command, not Pre-Deploy Command

Railway has a separate, literal **Pre-Deploy Command** feature — do not use it for this. Its container is isolated from the app's Start Command container: the filesystem is not persisted and volumes are not mounted, so anything written there (including a generated config file) will not exist when the real application container boots. Writing the config file must happen in the **Start Command** itself, immediately before the app process starts, so both steps run in the same container.

## Implementation Pattern

### Overriding the Start Command

To write the configuration variables to a file before booting the main application process:

1. Go to the service settings in Railway dashboard.
2. Locate the **Start Command** setting (not Pre-Deploy Command).
3. Wrap the boot sequence in a shell execution (`/bin/sh -c`) to enable redirection (`>`) and variable expansion.
4. Chain the file generation and application startup with `&&`.
5. Use `printf '%s\n'`, not `echo`, to write the variable — `echo` on POSIX-ish shells interprets backslash escapes (`\n`, `\t`, etc.) even without `-e`, which silently corrupts any backslash in the config content (paths, regex, escaped strings in embedded JSON). `printf '%s\n'` writes the value literally.
6. Use `exec` to boot the application so OS signals (`SIGTERM`) are handled correctly.

```bash
/bin/sh -c "printf '%s\n' \"$CONFIG_YAML\" > /path/to/config.yaml && exec <original-start-command>"
```

### Formatting Multi-line Variables

When pasting a multi-line YAML or JSON file into the Railway dashboard:
* Navigate to **Variables** -> **New Variable** or **RAW Editor**.
* Paste the raw multi-line config directly. Railway fully supports multiline values for environment variables.
* Reference it safely in the start command.

### Dynamic Secret Interpolation

You can mix Railway secrets or outputs of database services in the YAML by letting Railway interpolate variables before injecting them. Write the reference tight, with no spaces inside the braces — every official Railway example uses this form, and whitespace tolerance is undocumented:

```yaml
database:
  url: '${{Postgres.DATABASE_URL}}'
  pool: 10
```

## Checklist

- [ ] Configuration stored as a Railway Service Variable
- [ ] Written from the **Start Command**, not the Pre-Deploy Command
- [ ] Start Command overridden using `/bin/sh -c` wrapper
- [ ] Uses `printf '%s\n'`, not `echo`, to write the variable literally
- [ ] Uses redirection (`>`) to write the variable to the correct runtime path
- [ ] Application starts only if the write succeeds (`&&`)
- [ ] Application process is launched with `exec` (preserves signal handling)
- [ ] Dynamic database/service variables interpolated using tight Railway syntax `${{Service.VARIABLE}}`
