# UI Contribution V1

UI Contribution V1 lets an enabled trusted-local module add small, owned
controls or facts to stable game surfaces without receiving DOM access. The
contract is declarative, permissioned, responsive, and removed atomically when
its owner unloads.

Modules declare `ui:contribute`, then call:

```js
MODS.registerUiContribution(slot, contributionId, definition);
```

The returned handle contains `version`, `slot`, `id`, and the owner-qualified
`key`. Registration is valid on `file://`, localhost, HTTP, and HTTPS; the UI
contract itself performs no network access.

## Stable Slots

| Slot | Descriptor | Placement |
| --- | --- | --- |
| `composer.place.after` | command | after core place commands |
| `roster.party.badges` | read-only badge | party/allies roster entries |
| `roster.here.badges` | read-only badge | local/enemy roster entries |
| `roster.details.sections` | definition-list rows | below a roster entry |
| `system.utilities` | command | application menu |

There are deliberately no dock, traversal-grid, Scene Feed,
combat-confirmation, turn-advance, or arbitrary-HTML slots. Core retains
placement, order, focus, accessible semantics, escaping, responsive behavior,
and content-policy lifecycle.

## Common Descriptor Fields

```js
{
  label: "Attunement",
  labelKey: "my_module.ui.attunement",
  description: "Review this unit's elemental attunement.",
  descriptionKey: "my_module.ui.attunementDescription",
  icon: "◇",
  tone: "info",
  priority: 0,
  when(context) {
    return context.mode === "adventure";
  }
}
```

- `label` is required and limited to 48 characters.
- `description` is limited to 160 characters.
- `icon` is text, not markup, and limited to 8 characters.
- `tone` is `neutral`, `info`, `success`, `warning`, or `danger`.
- `priority` is an integer from -10 through 10. Core then orders by owner and
  contribution ID for deterministic collision-free presentation.
- localization keys are optional, but must begin with `<module-id>.`.
- `when`, `read`, and `onInvoke` receive a fresh deeply frozen serializable
  public context. Mutating it cannot mutate game state.

A module may register at most four contributions in one slot. A slot accepts
at most 24 total contributions. Owner-qualified IDs prevent one module from
replacing another module's contribution.

## Badges

Badge slots accept the common fields and an optional `read` callback:

```js
MODS.registerUiContribution("roster.party.badges", "attunement", {
  label: "Attunement",
  read(context) {
    return {
      label: context.unit?.species === "emberkin" ? "Fire" : "Dormant",
      tone: context.unit?.species === "emberkin" ? "warning" : "neutral"
    };
  }
});
```

`read` may return a string/number or `{ label, labelKey, tone }`. Dynamic
badge labels are limited to 64 characters. A dynamic `labelKey` follows the
same owner namespace rule and resolves through the current locale. Returned
values are escaped and cannot contain HTML.

## Roster Detail Rows

`roster.details.sections` requires either static `rows` or a `read` callback
that returns rows:

```js
MODS.registerUiContribution("roster.details.sections", "elemental-facts", {
  label: "Elemental facts",
  read(context) {
    return {
      rows: [
        { label: "Affinity", value: context.unit?.species || "Unknown" }
      ]
    };
  }
});
```

A section is limited to six rows. Row labels are limited to 48 characters and
values to 160 characters. Rows may also provide owner-namespaced `labelKey`
and `valueKey` fields; the literal text remains the required fallback.

## Commands And Dialog Results

Command slots require `onInvoke`:

```js
MODS.registerUiContribution("system.utilities", "about", {
  label: "Elemental guide",
  description: "Review the installed elemental species pack.",
  icon: "🜂",
  onInvoke(context) {
    return {
      title: "Elemental guide",
      description: `Current mode: ${context.mode}`,
      rows: [{ label: "Owner", value: "my_module" }]
    };
  }
});
```

A callback may return `false`/nothing, a text string, or a bounded dialog
descriptor containing `title`, `description`, and up to six rows. Core owns the
modal, focus trap, background isolation, Close action, escaping, and opener
restoration. Dialogs may use owner-namespaced `titleKey` and `descriptionKey`;
literal title/description text remains the fallback. A thrown callback is
sanitized into the Activity Log and does not break the game shell.

Callbacks do not receive state-write authority. A contribution can describe
module-owned state or invoke other documented module APIs for which its
manifest has permission; it cannot mutate `App`, DOM, save records, or another
owner's contribution.

## Context And Lifecycle

The public context includes the same bounded game snapshot as
`MODS.getContext()`, plus:

- `surface.slot`, `surface.contributionId`, and `surface.owner`;
- selected actor and target IDs;
- a bounded `unit` summary and `unitType` for roster slots;
- the current roster `expanded` state.

Only enabled modules whose manifest satisfies the active content policy can
register contributions. Disable, policy-driven unload, failed enablement, and
deletion remove all owned UI contributions. UI contributions are presentation
state and are not written into save files.

A complete neutral installable fixture is available at
[`docs/examples/ui-contribution-v1.yawmod.json`](examples/ui-contribution-v1.yawmod.json).
