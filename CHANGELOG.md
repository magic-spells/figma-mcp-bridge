# Changelog

All notable changes to `@magic-spells/figma-mcp-bridge` are documented here.

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
