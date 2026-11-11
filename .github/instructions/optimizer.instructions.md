---
description: 'Use when editing PictoLite compression pipelines, uploader result handling, downloads or result types.'
applyTo: 'app/composables/useImageOptimizer.ts,app/components/ImageUploader.vue,app/types/result.ts'
---

# Optimizer And Result Instructions

Read [Image optimizer](../../.agents/docs/IMAGE_OPTIMIZER.md) for current branches, constants, limitations and review criteria.
Use [testing](../../.agents/skills/testing/SKILL.md) when changing their tests.

- Preserve the no-larger-output guarantee and original-file fallback.
  `success: true` does not establish a smaller file or a changed MIME type.
- Keep PNG without conversion separate from PNG-to-WebP and JPEG/WebP processing.
  Only the non-conversion PNG path has the 1,000,000-byte passthrough.
- The PNG loop currently includes indices 0 through 3 before a possible forced encode.
  Check loop bounds in source rather than relying on a variable's name or an old comment.
- Treat quality bounds as configured encoder inputs.
  They do not guarantee PNG quality control or a universal browser quality ceiling.
- Preserve decode/encode failure handling and bitmap cleanup.
  The guide records the PNG-to-WebP verification limitation; do not describe it as safely rejecting every invalid candidate.
- Preserve stable string result IDs, original blobs and batch invalidation.
  Do not infer a download extension from the conversion option alone when changing naming behavior.
- Keep the native picker feature guard and browser download fallback.
  A picker `AbortError` means cancellation and must not start a fallback download.

Keep browser API use in client execution paths and explicitly type optimizer inputs and results.
Changes to thresholds, scale factors or quality bounds need a concrete rationale and relevant boundary/error tests.
Use the guide's browser validation for real MIME, decode, transparency and readability behavior.
