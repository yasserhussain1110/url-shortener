# Disable AI / Full-Line Code Completion in IntelliJ IDEA

This guide covers how to turn off the grey "ghost text" inline AI / full-line
completion suggestions in IntelliJ IDEA — both through the **IDE settings UI**
and through a **config file** you can drop into any machine.

Tested with **IntelliJ IDEA 2024.3**.

---

## Option 1 — Through the IDE (UI)

1. Open **Settings/Preferences**:
   - Windows/Linux: `Ctrl+Alt+S`
   - macOS: `Cmd+,`
2. Navigate to **Editor → General → Inline Completion**
   - (On older versions this lives under **Editor → General → Code Completion**.)
3. Uncheck **Enable local full line completion** (and any other AI-based
   suggestion options you want off).
4. Click **Apply / OK**.

The grey full-line ghost text will stop appearing.

---

## Option 2 — Through a config file (portable / reusable)

The UI toggle above simply writes to a single settings file called
`full.line.xml`. You can drop this file into any IntelliJ install to apply the
setting without clicking through menus.

### File contents

```xml
<application>
  <component name="MLServerCompletionSettings">
    <option name="enable" value="false" />
  </component>
</application>
```

The important part is `MLServerCompletionSettings` → `enable="false"`.

### Where to put it

1. **Fully quit IntelliJ first** — it rewrites these files on exit, so it must
   not be running when you copy the file in.
2. Copy `full.line.xml` into your IntelliJ **`options`** config folder:

   | OS      | Path                                                                 |
   |---------|----------------------------------------------------------------------|
   | Linux   | `~/.config/JetBrains/IntelliJIdea<version>/options/`                  |
   | macOS   | `~/Library/Application Support/JetBrains/IntelliJIdea<version>/options/` |
   | Windows | `%APPDATA%\JetBrains\IntelliJIdea<version>\options\`                  |

   Replace `<version>` with the folder that exists on your machine
   (for example `IntelliJIdea2024.3`).
3. Start IntelliJ — the setting is now applied.

> If a `full.line.xml` already exists, just make sure it contains the
> `MLServerCompletionSettings` block with `enable="false"`. Overwriting it with
> the snippet above is fine.

---

## Bonus — Disable Copilot / other inline AI providers

Inline suggestions from third-party providers (e.g. GitHub Copilot) are stored
separately in `ml.completion.xml`:

```xml
<application>
  <component name="Inline Third Parties">
    <thirdParties>
      <entry id="com.github.copilot" is-enabled="false" />
    </thirdParties>
  </component>
</application>
```

Drop this into the same `options/` folder to disable Copilot inline completion.

---

## Bonus — Never set it up again (Settings Sync)

To have this follow you across every machine automatically:

**File → Manage IDE Settings → Settings Sync** (backed by your JetBrains
account). Once enabled, this preference syncs everywhere — no file copying
needed.
