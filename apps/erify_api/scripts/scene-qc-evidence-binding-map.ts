/**
 * Reviewed Scene QC evidence cutover mapping (plan sections 5.2 / 5.7 / 13 step 2).
 *
 * NOT a heuristic. An operator runs
 *   pnpm --filter erify_api exec ts-node -r tsconfig-paths/register scripts/backfill-scene-qc-evidence-refs.ts --report
 * reviews the candidate image fields it prints, and records the decision here.
 * Every active template that feeds Scene QC must appear in exactly one of the
 * two lists below; verify-scene-qc-evidence-bindings.ts fails otherwise.
 */

export type SceneQcEvidenceBinding = {
  templateUid: string;
  /** Content keys: v1 -> item.key, v2 -> item.id (fld_...). */
  fieldKeys: readonly string[];
  /** Who reviewed this and why these fields. Required. */
  note: string;
};

export const SCENE_QC_EVIDENCE_BINDINGS: readonly SceneQcEvidenceBinding[] = [
  {
    templateUid: 'ttpl_OtVn1kdHi_V_8TZftv52', // "On air_check"
    fieldKeys: ['fld_cmkmx9knubz'], // v2 field id (content key); label "Livestream_screenshot", key "field_1775188033306"
    note: 'The only `file`-type field in any active template as of 2026-07-30 (73 templates '
      + 'scanned; every other field is checkbox/number/textarea). Did not surface in the '
      + 'initial --report candidate scan because validation.accept was empty. The '
      + '"Livestream_screenshot" label and required:true made the operator-reviewed binding '
      + 'unambiguous; its live Task Template contract was corrected through the existing '
      + 'builder to validation.accept=image/* on 2026-07-31 before cutover.',
  },
];

/**
 * Active templates an operator reviewed and deliberately decided do NOT feed
 * Scene QC. An explicit reason is required.
 */
export const SCENE_QC_INTENTIONALLY_UNBOUND: readonly { templateUid: string; reason: string }[] = [
  // The 11 templates below were the in-scope violations reported by
  // `verify-scene-qc-evidence-bindings.ts --since 2026-07-01` after binding
  // "On air_check" above. Each was inspected directly (current_schema's
  // `items` array) on 2026-07-30: none contains a `file`-type field at all --
  // every field is checkbox/number/textarea (performance-metric checklists:
  // GMV/view/CTR/CTO, violation status, equipment/account/internet checks).
  // They are mechanically guaranteed to have nothing bindable, not merely
  // deprioritized. Confirmed with the operator before recording.
  { templateUid: 'ttpl_3bicsfyhZox5qVXicaft', reason: 'Pre_production_check -- 4 checkbox/text fields (equipment/account/internet checks, note); no file-type field.' },
  { templateUid: 'ttpl_bhirDxJ_9SZ1zFK3J_6W', reason: 'Jacob Outlet -Mid-Month July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_kTFCA18_OFVCZbzmlFmJ', reason: 'Jacob Outlet -BAU July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_bmcU2MZqt6A5P6K5JhDq', reason: 'Jacob Outlet -Double Day July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_n6f7qAZQmPA4He6MOR-y', reason: 'Post_production_check -- 5 fields (violation status select, GMV/view/CTR/CTO numbers); no file-type field.' },
  { templateUid: 'ttpl_T8CP9A4XYX3xKjb6S2eu', reason: 'Jacob Thailand -Double-Day July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_JavDYExVKgl89gqom3IN', reason: 'LazLive_PJ - BAU Moderator Workflow -- 185 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_KezwzmT4pF6pLR5chhi8', reason: 'sensodynethailand - Mid-month Moderator Workflow -- 138 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_p2mlMYWkshkhK0P5ho1H', reason: 'Jacob Thailand -BAU July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_0_NuPiYN-ipylSeAc7Pp', reason: 'Bata Official Store - BAU/Double Day July Moderator Workflow -- 198 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_RZZ-Uw29lMRnQnnszO9u', reason: 'Jacob Thailand -Fashion Week July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_dD8qEqeXGsMqw4cDE0Iu', reason: 'Jacob Outlet Pay-Day July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
  { templateUid: 'ttpl_P7fkSu3Y4jEMJi15P-IW', reason: 'Jacob Thailand -Pay-Day July Moderator Workflow -- 162 checkbox/number fields; no file-type field.' },
];
