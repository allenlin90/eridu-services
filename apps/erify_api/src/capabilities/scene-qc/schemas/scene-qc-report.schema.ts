import type { SceneQcReport, SceneQcReportShow, SceneQcReportStatus } from '@eridu/api-types/scene-qc';

import type { ConfirmationReportRow } from './scene-qc-confirmation.schema';

/**
 * Report read-model -> DTO mapper. Reads ONLY the confirmation item snapshot
 * columns -- never a live Show/Client/Platform relation. See "Persisted
 * Model" in apps/erify_api/docs/SCENE_QC.md.
 */

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toReportShow(item: ConfirmationReportRow['items'][number]): SceneQcReportShow {
  return {
    scheduled_start_time: item.scheduledStartTime.toISOString(),
    show_id: item.showUid,
    show_name: item.showName,
    client: { id: item.clientUid, name: item.clientName },
    platforms: item.platforms.map((platform) => ({ id: platform.platformUid, name: platform.platformName })),
    result: item.review.result,
    reviewed_by: { id: item.review.reviewedBy.uid, name: item.review.reviewedBy.name },
    reviewed_at: item.review.reviewedAt.toISOString(),
    feedback: item.review.feedback,
    evidence_count: item.review.evidenceCount,
    scene_type: item.review.expectedSceneType,
    // Always false in Stage 1 -- the field exists now so Stage 2 amendment
    // support is additive (OQ-31).
    amended: false,
  };
}

export function toSceneQcReportDto(
  row: ConfirmationReportRow,
  status: SceneQcReportStatus,
  generatedAt: Date,
): SceneQcReport {
  const items = row.items;
  const totalShows = items.length;

  let passCount = 0;
  let minorCount = 0;
  let failCount = 0;
  const clientTotals = new Map<string, { name: string; pass: number; minor: number; fail: number }>();
  const platformTotals = new Map<string, { name: string; pass: number; minor: number; fail: number }>();

  for (const item of items) {
    const result = item.review.result;
    if (result === 'PASS')
      passCount += 1;
    else if (result === 'MINOR')
      minorCount += 1;
    else if (result === 'FAIL')
      failCount += 1;

    const clientBucket = clientTotals.get(item.clientUid) ?? { name: item.clientName, pass: 0, minor: 0, fail: 0 };
    if (result === 'PASS')
      clientBucket.pass += 1;
    else if (result === 'MINOR')
      clientBucket.minor += 1;
    else if (result === 'FAIL')
      clientBucket.fail += 1;
    clientTotals.set(item.clientUid, clientBucket);

    // A multi-platform Show contributes one row per linked platform, so
    // platform breakdown totals are NOT expected to sum to total_shows.
    for (const platform of item.platforms) {
      const platformBucket = platformTotals.get(platform.platformUid) ?? {
        name: platform.platformName,
        pass: 0,
        minor: 0,
        fail: 0,
      };
      if (result === 'PASS')
        platformBucket.pass += 1;
      else if (result === 'MINOR')
        platformBucket.minor += 1;
      else if (result === 'FAIL')
        platformBucket.fail += 1;
      platformTotals.set(platform.platformUid, platformBucket);
    }
  }

  // Deterministic order: primary by scheduled time, secondary by Show UID so
  // same-time ties don't depend on whatever order Postgres happened to
  // return rows in -- two downloads of the same immutable revision must be
  // byte-for-byte identical.
  const shows = [...items]
    .sort((a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime() || a.showUid.localeCompare(b.showUid))
    .map(toReportShow);
  const exceptions = shows.filter((show) => show.result === 'MINOR' || show.result === 'FAIL');

  return {
    confirmation_id: row.uid,
    confirmation_revision: row.revision,
    status,
    studio: { id: row.studio.uid, name: row.studio.name },
    operational_date: row.operationalDate.toISOString().slice(0, 10),
    window_start: row.windowStart.toISOString(),
    window_end: row.windowEnd.toISOString(),
    timezone: row.timezone,
    confirmed_by: { id: row.confirmedBy.uid, name: row.confirmedBy.name },
    confirmed_at: row.confirmedAt.toISOString(),
    generated_at: generatedAt.toISOString(),
    scope: {
      total_shows: totalShows,
      pass_count: passCount,
      minor_count: minorCount,
      fail_count: failCount,
      pass_percentage: totalShows === 0 ? 0 : round1((passCount / totalShows) * 100),
      minor_percentage: totalShows === 0 ? 0 : round1((minorCount / totalShows) * 100),
      fail_percentage: totalShows === 0 ? 0 : round1((failCount / totalShows) * 100),
    },
    // Map iteration order follows first-seen item order, which isn't itself
    // deterministic without a DB-level orderBy -- sort by name for the same
    // byte-for-byte-reproducible reason as `shows` above.
    client_breakdown: [...clientTotals.entries()]
      .map(([clientUid, bucket]) => ({
        client_id: clientUid,
        client_name: bucket.name,
        pass_count: bucket.pass,
        minor_count: bucket.minor,
        fail_count: bucket.fail,
        total_count: bucket.pass + bucket.minor + bucket.fail,
      }))
      .sort((a, b) => a.client_name.localeCompare(b.client_name)),
    platform_breakdown: [...platformTotals.entries()]
      .map(([platformUid, bucket]) => ({
        platform_id: platformUid,
        platform_name: bucket.name,
        pass_count: bucket.pass,
        minor_count: bucket.minor,
        fail_count: bucket.fail,
        total_count: bucket.pass + bucket.minor + bucket.fail,
      }))
      .sort((a, b) => a.platform_name.localeCompare(b.platform_name)),
    shows,
    exceptions,
  };
}
