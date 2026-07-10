import { format } from 'date-fns';

import type { HeldBackPayload } from '@eridu/api-types/shows';
import { Badge } from '@eridu/ui';

import * as m from '@/paraglide/messages';

const DATE_FIELDS = new Set(['start_time', 'end_time']);

function formatFieldValue(field: string, value: string | boolean | null | { uid: string; name: string }): string {
  if (value === null) {
    return m.schedule_conflict_value_unset();
  }
  if (typeof value === 'boolean') {
    return value ? m.schedule_conflict_value_yes() : m.schedule_conflict_value_no();
  }
  if (typeof value === 'object') {
    return value.name;
  }
  if (DATE_FIELDS.has(field)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'MMM d, yyyy h:mm a');
  }
  return value;
}

function fieldLabel(field: string): string {
  return field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function HeldBackDiff({ heldBack }: { heldBack: HeldBackPayload }) {
  return (
    <div className="space-y-4 text-sm">
      {heldBack.show_fields
        ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{m.schedule_conflict_section_show_fields()}</h4>
              <div className="space-y-1.5">
                {heldBack.show_fields.changed_fields.map((field) => (
                  <div key={field} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium min-w-24">{fieldLabel(field)}</span>
                    <span className="text-muted-foreground line-through decoration-destructive">
                      {formatFieldValue(field, heldBack.show_fields!.old[field] ?? null)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">
                      {formatFieldValue(field, heldBack.show_fields!.new[field] ?? null)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )
        : null}

      {heldBack.show_creators.length > 0
        ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{m.schedule_conflict_section_creators()}</h4>
              <div className="space-y-1.5">
                {heldBack.show_creators.map((creator) => (
                  <div key={creator.creator_uid} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{creator.creator_uid}</span>
                    {creator.action === 'remove'
                      ? (
                          <>
                            <span className="text-muted-foreground line-through decoration-destructive">{creator.old_note ?? m.schedule_conflict_no_note()}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{m.schedule_conflict_removed()}</span>
                          </>
                        )
                      : (
                          <>
                            <span className="text-muted-foreground line-through decoration-destructive">{creator.old_note ?? m.schedule_conflict_no_note()}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{creator.new_note ?? m.schedule_conflict_no_note()}</span>
                          </>
                        )}
                  </div>
                ))}
              </div>
            </section>
          )
        : null}

      {heldBack.show_platforms.length > 0
        ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{m.schedule_conflict_section_platforms()}</h4>
              <div className="space-y-1.5">
                {heldBack.show_platforms.map((platform) => (
                  <div key={platform.platform_uid} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{platform.platform_uid}</span>
                    <span className="text-muted-foreground line-through decoration-destructive">
                      {platform.old.live_stream_link ?? platform.old.platform_show_id ?? m.schedule_conflict_platform_unset()}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">
                      {platform.action === 'remove' ? m.schedule_conflict_removed() : (platform.new.live_stream_link ?? platform.new.platform_show_id ?? m.schedule_conflict_platform_unset())}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )
        : null}

      {heldBack.proposed_status_transition
        ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{m.schedule_conflict_section_proposed_status()}</h4>
              <div className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                <Badge variant="outline">{heldBack.proposed_status_transition.from}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">{heldBack.proposed_status_transition.to}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {m.schedule_conflict_status_transition_caveat()}
              </p>
            </section>
          )
        : null}
    </div>
  );
}
