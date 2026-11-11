---
description: 'Add or update PictoLite messages in French and English without changing other files.'
---

# Add Translations

Read and follow [i18n](../../.agents/skills/i18n/SKILL.md) for the requested messages.
Resolve the namespace, `snake_case` keys, meaning and wording from the request and existing consumers.
Draft natural translations when the intent is clear; ask only for unresolved information that changes the result.

Keep the task limited to [fr-FR.json](../../i18n/locales/fr-FR.json) and [en-US.json](../../i18n/locales/en-US.json) unless the user requests consumer changes.
Edit both files together, preserving nesting, placeholders and unrelated ordering.
Verify JSON validity, affected key parity and message compilation as appropriate.
