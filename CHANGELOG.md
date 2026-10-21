# Changelog

All notable changes to `@magic-spells/figma-mcp-bridge` are documented here.

## 0.6.0

Team-library components and styles. The bridge could only instance components
already in the file, could not say what an instance was an instance of, and
could not set variants, so swapping hand-made controls onto a published
component set meant the official Figma MCP and its daily limits.

Tool count: 98 (73 Figma design + 21 FigJam + 4 Prototype).

### New tools

- **`figma_import_library_component`** imports a published component or
  component set by key and returns its id plus `componentPropertyDefinitions`
  (type, default and variant options of each property). A set also lists every
  variant's id, key and `variantProperties`. A key that is not published fails
  with `LIBRARY_IMPORT_FAILED`.
- **`figma_import_library_style`** imports text, paint, effect or grid styles
  by key (`key`, or up to 50 `keys` in parallel) and returns each local style
  id for `figma_apply_style`. Keys that fail are listed in `errors`.
- **`figma_set_instance_properties`** sets variant, text, boolean and
  instance-swap properties on an instance. Base names work (`Label` for
  `Label#12:0`); an unknown name or variant option fails with
  `INVALID_PROPERTIES` and lists the valid choices; every value is read back
  (`PROPERTIES_NOT_APPLIED` otherwise).
- **`figma_replace_with_instance`** swaps a node, such as a hand-made button,
  for an instance in the same parent and layer index, keeping its position and
  constraints (or FILL sizing in auto-layout) and copying its text into a TEXT
  property. The original is deleted only once the instance is fully set up.

### Changes

- **`figma_create_instance`** takes `componentKey` (a library component or
  set, imported on the fly) as well as `componentId`, plus `properties` and
  `index`. A component set now instantiates its `defaultVariant` rather than
  its first child. A missing `parentId` now fails with `NODE_NOT_FOUND`
  instead of silently adding to the current page, and a failed call removes
  the instance.
- **Node reads show components and text styles.** `figma_get_nodes` (compact
  and full), `figma_get_children` and `figma_search_nodes` give instances
  `mainComponent` (`id`, `name`, `key`, `remote`, and `parentSet` for a
  variant) and `componentProperties` as `{ name: value }`, and text nodes
  `textStyleId` and `textStyleName`. The main component is read with
  `getMainComponentAsync` and never walked. `minimal` depth is unchanged.
- **`figma_search_components`** compact results include each component's `key`.
- No new plugin permission is needed: library imports do not use the
  `teamlibrary` permission.

## 0.5.0

SVG import. Agents could only build icons from lines, ellipses and rectangles,
and the results looked rough. They can now import the real SVG.

Tool count: 94 (69 Figma design + 21 FigJam + 4 Prototype).

### New tools

- **`figma_create_svg`** imports SVG markup with Figma's own SVG import
  (`figma.createNodeFromSvg`). The result is a frame at the SVG's own size,
  so imported icons keep their padding and share one box.
  - **`currentColor` is substituted.** Figma can't resolve it, and icon sets such
    as Lucide and Heroicons draw with it. A stroke takes `strokeColor` and a
    fill takes `fillColor`; each falls back to the other, then to `#000000`.
    The response reports what was replaced, and colors passed for an SVG
    without `currentColor` come back as a warning.
  - **Sizing matches a browser.** `width` or `height` alone rescales
    proportionally, stroke widths included; both fit the content inside the
    box, centered. A large illustration can be shrunk to icon size, past the
    0.01 limit of Figma's Scale tool.
  - **`flatten: true`** merges the shapes into one vector inside the frame, for
    one-color icons drawn all in strokes or all in fills. Flattening shapes
    painted differently comes back with a warning.
  - **Failures leave nothing behind.** Markup Figma can't parse returns
    `INVALID_SVG`, a missing parent fails before the import, and any later
    failure removes the imported frame.

### Other changes

- **The plugin handshake reports the real server version.** It said `0.1.0`
  in every release. The version is now read from `package.json` in one place
  (`src/version.js`) and shared by the MCP server info, `figma_server_info` and
  the handshake.
- **`npm test`** runs a `node:test` suite. It covers both halves of SVG
  import: the server side directly, and the plugin side by running
  `plugin/code.js` against a fake `figma` API. It also fails when the plugin's
  handshake version drifts from `package.json`.

## 0.4.1

Connection fixes. The plugin could show "Connected" while the bridge reported
`NOT_CONNECTED`, so every tool call failed.

- **Plugin: a port change no longer drops the handshake.** The old socket's
  `onclose` ran after the new socket was created and set `socket = null`, so the
  handshake had nothing to send on. Each socket's handlers now ignore events
  once it is no longer the current socket, and a socket that is still
  connecting is closed before a new one opens.
- **Bridge: a replaced connection can't wipe its replacement.** When a second
  plugin connection replaced the first, the first socket's late `close` event
  reset the bridge to disconnected. Close and message events now count only
  from the current socket, and a replaced socket's state (and pending requests)
  is torn down when it is replaced.
- **Plugin: one Cmd+Z undoes one command, not the whole session.** The plugin
  never called `figma.commitUndo()`, so Figma folded every bridge edit since
  the user's last own edit into a single undo step, and one Cmd+Z in the file
  reverted hours of agent work across pages. Each command now commits its own
  undo step.

## 0.4.0

The verification release. Every gap in this list came from real sessions where an
agent either could not check its own work, or was told the work succeeded when it
had not. The theme: **read the value back, and report honestly when it did not stick.**

Tool count: 93 (68 Figma design + 21 FigJam + 4 Prototype).

### Built-in skills

The server now ships its operating knowledge with the package: every
`skills/<name>/SKILL.md` is served as an MCP resource
(`skill://<name>/SKILL.md`), and the server instructions direct agents to read
`skill://figma-bridge/SKILL.md` before write-heavy work — verification
discipline, error-code meanings, bind-preserving sizing, mode pinning,
concurrency rules, and auto-layout traps. No local skill install needed.

### Serializer additions

`figma_get_nodes` (full depth) now returns properties that existed in the Plugin
API but were never surfaced:

- **`boundVariables`** — the node-level map of which properties are bound to which
  variables. Previously bindings were only visible inside paint objects, so a
  numeric bind could only be "proved" by authoring a desktop literal and watching
  it flip — impossible for tokens whose value is the same in every mode.
- **`layoutWrap`** — whether an auto-layout frame wraps.
- **`counterAxisSpacing`** — cross-axis (row) gap on a wrapped frame.
- **`explicitVariableModes`** — the variable modes pinned on the node. An
  inherited pin was previously invisible and undiagnosable.
- **`clipsContent`** — clipping state on frame-likes.
- **Per-side stroke weights** — `strokeWeight` reads back as `"MIXED"` (not a
  dropped Symbol) when sides differ, with all four per-side values alongside it.
- **`x` / `y` in compact output** — `figma_get_children` with `compact: true` and
  `figma_get_nodes` with `depth: "compact"` now carry position, so layout can be
  measured without falling back to the full serialization.

### New tools

- **`figma_set_variable_mode`** — pin or clear an explicit variable mode on nodes
  and pages. Ends the workaround of cloning a frame purely to inherit its mode,
  and makes a bad inherited pin a one-call fix instead of a component rebuild.
- **`figma_set_visible`** — set `node.visible` directly, instead of creating a
  BOOLEAN variable or setting opacity to 0 just to hide something.
- **`figma_set_clips_content`** — toggle clipping on `FRAME`, `COMPONENT`,
  `COMPONENT_SET`, `INSTANCE`, `SLOT`, `SLIDE`.
- **`figma_delete_style`** — remove a local paint/text/effect/grid style. Library
  styles return `REMOTE_STYLE`.
- **`figma_set_size_limits`** — set or clear `minWidth` / `maxWidth` /
  `minHeight` / `maxHeight`. `null` clears, so `maxWidth` is no longer a one-way door.

### Fixed

- **`figma_apply_style` failed for text.** All five `*StyleId` properties are
  read-only under `documentAccess: dynamic-page`; the plugin now dispatches
  through `setFillStyleIdAsync` / `setStrokeStyleIdAsync` / `setTextStyleIdAsync` /
  `setEffectStyleIdAsync` / `setGridStyleIdAsync` and verifies by readback
  (`STYLE_NOT_APPLIED`).
- **`figma_set_rotation` pivoted on the top-left** while the description promised
  the center. It now defaults to `pivot: "center"` and writes `relativeTransform`.
  Auto-layout children — where the compensating translation is discarded by the
  parent — get a plain rotation plus an explicit warning, never a silent wrong result.
- **`figma_reorder_node` treated `position` as an insertion index, not a final
  index**, so asking for index 2 could land at 1. `position` is now the final index
  among siblings (0 = bottom of the layer stack), out-of-range values are clamped
  and reported, and the resulting index is verified by readback
  (`REORDER_FAILED`).
- **`figma_get_nodes` was inconsistent on instance-sublayer IDs.** Composite
  `I<instanceId>;<childId>` IDs now fall back to resolving the instance root and
  searching its subtree. IDs that genuinely do not exist come back in `notFound`
  with an explanation in `notFoundDetails`.
- **FigJam-only and Design-only tools failed opaquely.** `WRONG_EDITOR` /
  `FIGMA_DESIGN_ONLY` messages now name the tool, say which editor it needs, and
  report the current editor. Both guards use explicit equality — `editorType` has
  five values, so `!== "figjam"` was wrong.
- **Variable binds on paints silently no-opped** when the copy returned by
  `setBoundVariableForPaint` was not reassigned.

### Behavior changes

- **Exports are file-first.** `figma_export_node` writes the image to disk and
  returns `{ path, format, bytes }` with no inline base64. Omit `outputPath` and
  the file lands in `<tmpdir>/figma-mcp-bridge/<node-id>-<timestamp>.<ext>`; pass
  an absolute `outputPath` to choose the destination. `returnBase64: true` is the
  escape hatch for callers that want the data inline. This removes the standing
  workaround of inflating `scale` until the result was large enough to spill to a
  readable file. Unwritable paths fail with `EXPORT_WRITE_FAILED` and say why.
- **Honest errors on instance sublayers.** `figma_resize_nodes` and a `width` /
  `height` bind via `figma_set_variable` used to return `success: true` and change
  nothing on a node inside an INSTANCE. They now throw
  `INSTANCE_SUBLAYER_RESTRICTED` and suggest the remedy (act on the master, or use
  `figma_set_layout_align: STRETCH`, which works inside instances *and* preserves
  binds). Reordering a child of an instance is blocked the same way. Detection is a
  `node.parent` walk — the `I…;…` id convention is community lore and is not used
  as a permission check.
- **Resize preserves variable bindings.** Whether `resize()` / `layoutMode` /
  `primaryAxisSizingMode` clears a size bind is undocumented in both directions, so
  the bridge captures the six size binds before the write, re-applies anything that
  went missing, verifies, and reports what it recovered (`rebound`) or could not
  (`warnings`). Wired into `figma_resize_nodes` and `figma_set_auto_layout`.
- **No handler reports success without a readback.** New stable error codes:
  `BIND_NOT_APPLIED`, `UNBIND_FAILED`, `STYLE_NOT_APPLIED`,
  `STYLE_SETTER_UNAVAILABLE`, `RESIZE_NO_OP`, `LIMIT_NOT_APPLIED`,
  `LIMIT_NOT_CLEARED`, `FIELD_NOT_SUPPORTED`, `INSTANCE_SUBLAYER_RESTRICTED`,
  `REORDER_FAILED`, `EXPORT_WRITE_FAILED`.
- **`figma_unbind_variable` on a min/max size field** now also clears the residual
  literal, and reports `previousLiteral` / `clearedLiteral`. Without this,
  unbinding `maxWidth` froze the last resolved number as a permanent clamp.

## 0.3.0

Prototype tools (reactions, flow starting points), FigJam tool set (sticky notes,
shapes with text, connectors, sections, tables, code blocks, link previews), and
the token-optimized search tools.
