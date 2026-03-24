import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';

import { Injectable } from '@nestjs/common';

import type { SharedField, SharedFieldCategory, UiSchema } from '@eridu/api-types/task-management';
import { TASK_TYPE } from '@eridu/api-types/task-management';

import { TaskTemplateService } from './task-template.service';
import {
  type TaskTemplateResetExecutionResult,
  type TaskTemplateResetPlan,
  TaskTemplateResetService,
} from './task-template-reset.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import { PrismaService } from '@/prisma/prisma.service';

const REQUIRED_HEADERS = ['Brand', 'Loop', 'Event', 'Information', 'campaign'] as const;
const UNSPECIFIED_CAMPAIGN = 'UNSPECIFIED';
const DATA_COLLECTION_EVENT = 'data collection';

type SharedFieldType = SharedField['type'];
type TemplateItem = UiSchema['items'][number];

type ModeratorCanonicalFieldConfig = {
  baseKey: string;
  label: string;
  type: SharedFieldType;
  category: SharedFieldCategory;
  validation?: Record<string, number>;
};

type ModeratorCsvRecord = {
  rowNumber: number;
  brand: string;
  campaign: string;
  loopLabel: string;
  loopNumber: number;
  event: string;
  information: string;
};

export type ModeratorTemplatePayload = {
  brand: string;
  campaign: string;
  name: string;
  taskType: (typeof TASK_TYPE)[keyof typeof TASK_TYPE];
  currentSchema: UiSchema;
};

export type ModeratorCsvMigrationArtifacts = {
  sourceFilename: string;
  maxLoop: number;
  sharedFields: SharedField[];
  templates: ModeratorTemplatePayload[];
  customDataCollectionLabels: string[];
};

export type ModeratorCsvMigrationPlan = ModeratorCsvMigrationArtifacts & {
  studioUid: string;
  resetPlan: TaskTemplateResetPlan | null;
  existingTemplateCount: number;
};

export type ModeratorCsvMigrationExecutionResult = ModeratorCsvMigrationPlan & {
  createdSharedFieldCount: number;
  updatedSharedFieldCount: number;
  resetResult: TaskTemplateResetExecutionResult | null;
  createdTemplateCount: number;
};

const CANONICAL_LOOP_DATA_COLLECTION_FIELDS: Record<string, ModeratorCanonicalFieldConfig> = {
  gmv_e_g_1_000_000_thb: {
    baseKey: 'gmv',
    label: 'GMV',
    type: 'number',
    category: 'metric',
    validation: { min: 0 },
  },
  ctr_e_g_100: {
    baseKey: 'ctr',
    label: 'CTR',
    type: 'number',
    category: 'metric',
    validation: { min: 0, max: 100 },
  },
  view_e_g_9_999: {
    baseKey: 'views',
    label: 'Views',
    type: 'number',
    category: 'metric',
    validation: { min: 0 },
  },
  product_clicks_e_g_1_000: {
    baseKey: 'product_clicks',
    label: 'Product Clicks',
    type: 'number',
    category: 'metric',
    validation: { min: 0 },
  },
  cto_e_g_100: {
    baseKey: 'cto',
    label: 'CTO',
    type: 'number',
    category: 'metric',
    validation: { min: 0, max: 100 },
  },
  ads_cost: {
    baseKey: 'ads_cost',
    label: 'Ads Cost',
    type: 'number',
    category: 'metric',
    validation: { min: 0 },
  },
  show_gpm_e_g_9_999: {
    baseKey: 'show_gpm',
    label: 'Show GPM',
    type: 'number',
    category: 'metric',
    validation: { min: 0 },
  },
  observations: {
    baseKey: 'observations',
    label: 'Observations',
    type: 'textarea',
    category: 'evidence',
  },
};

function slugify(value: string): string {
  const lower = value.trim().toLowerCase();
  const withoutDiacritics = lower.normalize('NFKD').replace(/[\u0300-\u036F]/g, '');
  return withoutDiacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    || 'item';
}

function normalizeCampaign(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : UNSPECIFIED_CAMPAIGN;
}

function normalizeCsvValue(raw: string): string {
  return raw.replace(/\r\n/g, '\n').trim();
}

function normalizeCanonicalLookup(value: string): string {
  return slugify(value);
}

function isSetupEvent(event: string): boolean {
  const lower = event.trim().toLowerCase();
  return lower === 'server url' || lower === 'stream key';
}

function parseLoopNumber(loopRaw: string, event: string, rowNumber: number): number {
  const match = loopRaw.match(/(\d+)/);
  if (!match) {
    throw HttpError.badRequest(`CSV row ${rowNumber} has an invalid loop label: "${loopRaw}"`);
  }

  const loopNumber = Number.parseInt(match[1] ?? '', 10);
  if (!Number.isFinite(loopNumber) || loopNumber < 0) {
    throw HttpError.badRequest(`CSV row ${rowNumber} has an unsupported loop number: "${loopRaw}"`);
  }

  if (loopNumber === 0) {
    if (isSetupEvent(event)) {
      return 1;
    }

    throw HttpError.badRequest(
      `CSV row ${rowNumber} uses Loop0 for unsupported event "${event}". Only setup events may use Loop0.`,
    );
  }

  return loopNumber;
}

function inferDataCollectionFieldConfig(
  information: string,
): Pick<TemplateItem, 'type' | 'validation'> {
  const lookup = normalizeCanonicalLookup(information);
  const canonicalField = CANONICAL_LOOP_DATA_COLLECTION_FIELDS[lookup];
  if (canonicalField) {
    return {
      type: canonicalField.type,
      ...(canonicalField.validation ? { validation: canonicalField.validation } : {}),
    };
  }

  const lower = information.toLowerCase();
  if (lower.includes('observation') || lower.includes('note')) {
    return { type: 'textarea' };
  }

  if (information.includes('%') || lower.includes('ctr') || lower.includes('cto')) {
    return {
      type: 'number',
      validation: { min: 0, max: 100 },
    };
  }

  if (
    lower.includes('gmv')
    || lower.includes('gpm')
    || lower.includes('thb')
    || lower.includes('cost')
    || /\bview\b/.test(lower)
    || /\bclicks?\b/.test(lower)
    || lower.includes('add-to-cart')
    || lower.includes('add to cart')
  ) {
    return {
      type: 'number',
      validation: { min: 0 },
    };
  }

  return { type: 'text' };
}

function inferEventFieldType(event: string): SharedFieldType {
  const lower = event.trim().toLowerCase();
  if (lower === 'server url') {
    return 'url';
  }
  if (lower === 'stream key') {
    return 'text';
  }
  return 'checkbox';
}

function buildItemId(templateIdentity: string, row: ModeratorCsvRecord): string {
  return createHash('sha1')
    .update(`${templateIdentity}|${row.rowNumber}|${row.loopLabel}|${row.event}|${row.information}`)
    .digest('hex')
    .slice(0, 24);
}

function buildHashedKey(base: string, payload: string, usedKeys: Set<string>): string {
  const digest = createHash('sha1')
    .update(payload)
    .digest('hex')
    .slice(0, 8);

  let candidate = `${base}_${digest}`.slice(0, 50);
  if (!/^[a-z]/.test(candidate)) {
    candidate = `k_${candidate}`.slice(0, 50);
  }

  if (!usedKeys.has(candidate)) {
    usedKeys.add(candidate);
    return candidate;
  }

  let suffix = 2;
  while (true) {
    const tail = `_${suffix}`;
    const probe = `${candidate.slice(0, 50 - tail.length)}${tail}`;
    if (!usedKeys.has(probe)) {
      usedKeys.add(probe);
      return probe;
    }
    suffix += 1;
  }
}

function parseCsvText(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parseModeratorCsv(csvText: string): ModeratorCsvRecord[] {
  const rows = parseCsvText(csvText);
  const [headerRow, ...dataRows] = rows;

  if (!headerRow || headerRow.length === 0) {
    throw HttpError.badRequest('CSV file is empty');
  }

  const normalizedHeaders = headerRow.map((header) => normalizeCsvValue(header));
  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!normalizedHeaders.includes(requiredHeader)) {
      throw HttpError.badRequest(`CSV is missing required column "${requiredHeader}"`);
    }
  }

  const columnIndexByHeader = new Map<string, number>(
    normalizedHeaders.map((header, index) => [header, index]),
  );

  return dataRows
    .map((cells, index) => {
      const brand = normalizeCsvValue(cells[columnIndexByHeader.get('Brand') ?? -1] ?? '');
      const loopLabel = normalizeCsvValue(cells[columnIndexByHeader.get('Loop') ?? -1] ?? '');
      const event = normalizeCsvValue(cells[columnIndexByHeader.get('Event') ?? -1] ?? '');
      const information = normalizeCsvValue(cells[columnIndexByHeader.get('Information') ?? -1] ?? '');
      const campaign = normalizeCampaign(cells[columnIndexByHeader.get('campaign') ?? -1] ?? '');
      const rowNumber = index + 2;

      if (!brand || !loopLabel || !event) {
        return null;
      }

      return {
        rowNumber,
        brand,
        campaign,
        loopLabel,
        loopNumber: parseLoopNumber(loopLabel, event, rowNumber),
        event,
        information,
      } satisfies ModeratorCsvRecord;
    })
    .filter((row): row is ModeratorCsvRecord => row !== null);
}

function buildSharedFields(maxLoop: number): SharedField[] {
  const sharedFields: SharedField[] = [];

  for (let loopNumber = 1; loopNumber <= maxLoop; loopNumber += 1) {
    for (const fieldConfig of Object.values(CANONICAL_LOOP_DATA_COLLECTION_FIELDS)) {
      sharedFields.push({
        key: `${fieldConfig.baseKey}_l${loopNumber}`,
        type: fieldConfig.type,
        category: fieldConfig.category,
        label: `${fieldConfig.label} (Loop ${loopNumber})`,
        description: `Canonical moderation field for loop ${loopNumber}`,
        is_active: true,
      });
    }
  }

  return sharedFields;
}

function buildTemplatePayloads(
  rows: ModeratorCsvRecord[],
  sourceFilename: string,
): ModeratorCsvMigrationArtifacts {
  if (rows.length === 0) {
    throw HttpError.badRequest('CSV does not contain any usable moderator workflow rows');
  }

  const maxLoop = rows.reduce((max, row) => Math.max(max, row.loopNumber), 0);
  const grouped = new Map<string, ModeratorCsvRecord[]>();

  for (const row of rows) {
    const templateIdentity = `${row.brand}__${row.campaign}`;
    const group = grouped.get(templateIdentity) ?? [];
    group.push(row);
    grouped.set(templateIdentity, group);
  }

  const customDataCollectionLabels = new Set<string>();
  const templates = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([templateIdentity, templateRows]) => {
      const [{ brand, campaign }] = templateRows;
      const usedKeys = new Set<string>();
      const uniqueLoops = [...new Set(templateRows.map((row) => row.loopNumber))].sort((a, b) => a - b);
      const items: TemplateItem[] = templateRows.map((row) => {
        const loopId = `l${row.loopNumber}`;
        const itemId = buildItemId(templateIdentity, row);
        const eventLower = row.event.toLowerCase();

        if (eventLower === DATA_COLLECTION_EVENT) {
          const canonicalConfig = CANONICAL_LOOP_DATA_COLLECTION_FIELDS[normalizeCanonicalLookup(row.information)];
          if (canonicalConfig) {
            const sharedKey = `${canonicalConfig.baseKey}_l${row.loopNumber}`;
            if (!usedKeys.has(sharedKey)) {
              usedKeys.add(sharedKey);
              return {
                id: itemId,
                key: sharedKey,
                type: canonicalConfig.type,
                standard: true,
                label: `${canonicalConfig.label} (Loop ${row.loopNumber})`,
                description: row.information || `Data collection (${campaign})`,
                required: true,
                group: loopId,
                ...(canonicalConfig.validation ? { validation: canonicalConfig.validation } : {}),
              };
            }
          }

          customDataCollectionLabels.add(row.information);
          const inferred = inferDataCollectionFieldConfig(row.information);
          const keyBase = `${loopId}_data_collection_${slugify(row.information).slice(0, 18)}`;
          return {
            id: itemId,
            key: buildHashedKey(keyBase, `${row.rowNumber}|${row.information}`, usedKeys),
            type: inferred.type,
            label: row.information || 'Data collection',
            description: `Data collection (${campaign})`,
            required: true,
            group: loopId,
            ...(inferred.validation ? { validation: inferred.validation } : {}),
          };
        }

        const keyBase = `${loopId}_${slugify(row.event).slice(0, 16)}_${slugify(row.information).slice(0, 16)}`;
        return {
          id: itemId,
          key: buildHashedKey(keyBase, `${row.rowNumber}|${row.event}|${row.information}`, usedKeys),
          type: inferEventFieldType(row.event),
          label: row.event,
          description: row.information || `${row.event} (${campaign})`,
          required: true,
          group: loopId,
        };
      });

      const loops = uniqueLoops.map((loopNumber) => ({
        id: `l${loopNumber}`,
        name: `Loop${loopNumber}`,
        durationMin: 15,
      }));

      const workflowKey = `${slugify(brand)}__${slugify(campaign)}`;
      const name = campaign === UNSPECIFIED_CAMPAIGN
        ? `${brand} Moderator Workflow`
        : `${brand} - ${campaign} Moderator Workflow`;

      return {
        brand,
        campaign,
        name,
        taskType: TASK_TYPE.ACTIVE,
        currentSchema: {
          items,
          metadata: {
            task_type: TASK_TYPE.ACTIVE,
            loops,
            source: {
              brand,
              campaign,
              workflow_key: workflowKey,
              generated_from: sourceFilename,
            },
          },
        },
      } satisfies ModeratorTemplatePayload;
    });

  return {
    sourceFilename,
    maxLoop,
    sharedFields: buildSharedFields(maxLoop),
    templates,
    customDataCollectionLabels: [...customDataCollectionLabels].sort((left, right) => left.localeCompare(right)),
  };
}

@Injectable()
export class TaskTemplateModeratorCsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studioService: StudioService,
    private readonly taskTemplateService: TaskTemplateService,
    private readonly taskTemplateResetService: TaskTemplateResetService,
  ) {}

  async planMigration(input: { studioUid: string; csvPath: string }): Promise<ModeratorCsvMigrationPlan> {
    const csvPath = input.csvPath.trim();
    if (csvPath.length === 0) {
      throw HttpError.badRequest('csvPath is required');
    }

    const csvText = await fs.readFile(csvPath, 'utf-8');
    const artifacts = buildTemplatePayloads(parseModeratorCsv(csvText), basename(csvPath));
    const existingTemplateCount = await this.prisma.taskTemplate.count({
      where: {
        studio: {
          uid: input.studioUid,
        },
      },
    });

    const resetPlan = existingTemplateCount > 0
      ? await this.taskTemplateResetService.planReset({
        studioUid: input.studioUid,
        allTemplates: true,
      })
      : null;

    return {
      studioUid: input.studioUid,
      resetPlan,
      existingTemplateCount,
      ...artifacts,
    };
  }

  async executeMigration(input: { studioUid: string; csvPath: string }): Promise<ModeratorCsvMigrationExecutionResult> {
    const plan = await this.planMigration(input);
    const { createdCount, updatedCount } = await this.ensureSharedFields(plan.studioUid, plan.sharedFields);

    const resetResult = plan.resetPlan
      ? await this.taskTemplateResetService.executeReset({
        studioUid: plan.studioUid,
        allTemplates: true,
      })
      : null;

    for (const template of plan.templates) {
      await this.taskTemplateService.createTemplateWithSnapshot({
        name: template.name,
        description: 'Auto-generated from moderator worksheet CSV.',
        taskType: template.taskType,
        currentSchema: template.currentSchema,
        studioId: plan.studioUid,
      });
    }

    return {
      ...plan,
      createdSharedFieldCount: createdCount,
      updatedSharedFieldCount: updatedCount,
      resetResult,
      createdTemplateCount: plan.templates.length,
    };
  }

  private async ensureSharedFields(
    studioUid: string,
    requiredFields: SharedField[],
  ): Promise<{ createdCount: number; updatedCount: number }> {
    const existingFields = await this.studioService.getSharedFields(studioUid);
    const existingByKey = new Map(existingFields.map((field) => [field.key, field]));
    let createdCount = 0;
    let updatedCount = 0;

    for (const requiredField of requiredFields) {
      const existingField = existingByKey.get(requiredField.key);
      if (!existingField) {
        await this.studioService.createSharedField(studioUid, requiredField);
        createdCount += 1;
        continue;
      }

      if (existingField.type !== requiredField.type || existingField.category !== requiredField.category) {
        throw HttpError.conflict(
          `Shared field "${requiredField.key}" already exists with incompatible type/category`,
        );
      }

      if (
        existingField.label !== requiredField.label
        || (existingField.description ?? null) !== (requiredField.description ?? null)
        || existingField.is_active !== requiredField.is_active
      ) {
        await this.studioService.updateSharedField(studioUid, requiredField.key, {
          label: requiredField.label,
          description: requiredField.description ?? null,
          is_active: requiredField.is_active,
        });
        updatedCount += 1;
      }
    }

    return {
      createdCount,
      updatedCount,
    };
  }
}

export function buildModeratorCsvMigrationArtifacts(
  csvText: string,
  sourceFilename: string,
): ModeratorCsvMigrationArtifacts {
  return buildTemplatePayloads(parseModeratorCsv(csvText), sourceFilename);
}

export {
  parseModeratorCsv,
};
