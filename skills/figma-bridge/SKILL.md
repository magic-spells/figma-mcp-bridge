# Figma MCP Bridge — Operation Skill

How to work through the figma-mcp-bridge effectively and honestly. Read this
before any write-heavy design session. Applies to bridge **v0.4.0+**.

## Verification discipline — the core of this skill

**1. Verify bindings by readback, not by assumption.**
`figma_get_nodes` (full depth) returns `boundVariables` (node-level variable
bindings), `explicitVariableModes` (pinned modes), `layoutWrap`,
`counterAxisSpacing`, and `clipsContent`. After binding, pinning, or layout
work, read the node back and confirm the field says what you intended. Mutating
tools echo readbacks in their responses (`verified: true`, resulting
`explicitVariableModes`, per-side stroke weights, etc.) — check them.

**2. Export the render and look at it before reporting done.**
`figma_export_node` writes the image to disk and returns the path — Read the
file and actually look at it. Property readback cannot see composition: real
sessions passed every numeric check while renders showed a portrait video well
where a 16:9 one belonged, a heading breaking mid-word, and a button hugging at
140px instead of spanning its form. Looking catches what measuring cannot.

**3. Report honestly.**
- If a tool errors, report the failure — never record the work as done.
- If a readback disagrees with a success response, report that too.
- Never paper over a missing capability by hardcoding a value.
- The bridge errors instead of silently no-oping (see error codes below);
  treat those errors as information about Figma's real constraints, not as
  obstacles to retry around.

## Errors that mean "Figma forbids this" (don't retry — change approach)

- `INSTANCE_SUBLAYER_RESTRICTED` — size binds, resizes, and reorders inside an
  instance are not allowed. Make the change on the component master; it flows
  to every instance.
- `MODE_NOT_FOUND` / `COLLECTION_NOT_FOUND` — the modeId/collectionId is wrong;
  the error lists valid modes.
- `WRONG_EDITOR` / `FIGMA_DESIGN_ONLY` — the tool is gated to FigJam or Figma
  Design; the error names the current editor type (there are five: figma,
  figjam, dev, slides, buzz).
- `BIND_NOT_APPLIED` / `STYLE_NOT_APPLIED` / `RESIZE_NO_OP` /
  `REORDER_FAILED` / `LIMIT_NOT_APPLIED` — the write did not land and the
  bridge is telling you instead of pretending. Report it.

## Tool guidance

- **Sizing a child to its parent:** use `figma_set_layout_align: STRETCH`, not
  `figma_resize_nodes`. STRETCH preserves width/height variable binds; resize
  may destroy them (the bridge re-applies and warns, but STRETCH avoids the
  problem entirely).
- **Pinning variable modes:** `figma_set_variable_mode` sets or clears
  (`clear: true`) an explicit mode per collection on nodes *and pages*. Pins
  belong on preview/page frames. Never pin a component master — every instance
  inherits it, per-collection, and the partial correctness hides the fault.
- **Text styles:** create with `figma_create_text_style`, bind `fontSize` (and
  other text fields) to variables via `figma_set_variable` with `styleId`,
  apply with `figma_apply_style`, delete with `figma_delete_style`.
- **Borders on one side:** `figma_set_strokes` per-side weights
  (`strokeTopWeight` etc.); `strokes` may be omitted to change weights only.
  A mixed weight reads back as the string `'MIXED'` plus the four per-side
  values.
- **Min/max sizes:** `figma_set_size_limits`; pass explicit `null` to clear.
  `figma_unbind_variable` on a min/max field also clears the residual literal.
- **Reordering:** `figma_reorder_node` `position` is the final index among
  siblings (0 = back, `childCount-1` = front), verified by readback.
- **Hiding:** `figma_set_visible` — don't fake it with opacity 0.
- **Exports:** the returned `path` is the deliverable; Read it. No need to
  inflate `scale` to force anything.
- **Constraints:** set `figma_set_constraints` BEFORE converting the parent to
  auto-layout; inside auto-layout parents it's rejected, and it can't be
  overridden on instance sublayers at all.

## Auto-layout facts that bite

- `SPACE_BETWEEN` is inert when any child has `layoutGrow: 1` (no free space
  to distribute) — `itemSpacing` is ignored then too.
- `figma_set_layout_align: CENTER` is a no-op on a stretched child — use
  `INHERIT` plus the parent's `counterAxisAlignItems: CENTER`.
- Reading wrap: `layoutWrap` and `counterAxisSpacing` come back in full node
  reads; compact children include x/y for geometry checks.
- `figma_set_text` does not decode HTML entities — send literal characters
  (`&`, not `&amp;`).

## Concurrency (multi-agent sessions)

- One WebSocket to one open document. More than ~2 write-heavy agents produces
  transient `Unable to establish connection` errors — retry them; if an agent
  stalls completely, kill and restart it.
- **Never call `figma_set_current_page` or `figma_set_selection` from a
  sub-agent** — it yanks the shared view out from under every other client.
- The plugin must be connected to THIS server's port: check
  `figma_server_info` / `figma_get_context` first and surface the port to the
  user if disconnected.
