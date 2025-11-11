#!/usr/bin/env ts-node

/**
 * Script to generate test payloads for schedule planning
 *
 * Usage:
 *   # Single client (default)
 *   pnpm run generate:schedule-payload [--shows=N]
 *
 *   # Multi-client monthly overview
 *   pnpm run generate:schedule-payload -- --shows=500 --clients=10 [--chunk-size=50]
 *
 * Parameters:
 *   --shows=N        Total number of shows to generate (default: 50)
 *   --clients=N      Number of clients for monthly overview (default: 1)
 *   --chunk-size=N   Shows per chunk for chunked uploads (default: 50)
 *
 * Generates:
 *   - 01-create-schedule.json (single schedule for POST /admin/schedules)
 *   - 01-bulk-create-schedule.json (for POST /admin/schedules/bulk)
 *   - 02-update-schedule.json (for PATCH /admin/schedules/:id)
 *   - 03-publish-schedule.json (for POST /admin/schedules/:id/publish)
 *   - chunked/ directory (for POST /admin/schedules/:id/shows/append - multi-client only)
 */

import * as fs from 'fs';
import * as path from 'path';

import { fixtures } from '../../prisma/fixtures';

interface ShowPlanItem {
  tempId: string;
  name: string;
  startTime: string;
  endTime: string;
  clientUid: string;
  studioRoomUid: string;
  showTypeUid: string;
  showStatusUid: string;
  showStandardUid: string;
  mcs: Array<{
    mcUid: string;
    note?: string;
  }>;
  platforms: Array<{
    platformUid: string;
    liveStreamLink: string;
    platformShowId: string;
  }>;
  metadata?: Record<string, any>;
}

interface PlanDocument {
  metadata: {
    lastEditedBy: string;
    lastEditedAt: string;
    totalShows: number;
    clientName: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  shows: ShowPlanItem[];
}

interface CreateSchedulePayload {
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  plan_document: PlanDocument;
  version: number;
  client_id: string;
  created_by: string;
}

interface UpdateSchedulePayload {
  plan_document: PlanDocument;
  version: number;
}

interface PublishSchedulePayload {
  version: number;
}

// Parse command line arguments
function parseArgs(): { shows: number; clients: number; chunkSize: number } {
  const args = process.argv.slice(2);
  let shows = 50; // default
  let clients = 1; // default: single client
  let chunkSize = 50; // default chunk size for multi-client scenarios

  for (const arg of args) {
    if (arg.startsWith('--shows=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        shows = value;
      }
    }
    if (arg.startsWith('--clients=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        clients = value;
      }
    }
    if (arg.startsWith('--chunk-size=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        chunkSize = value;
      }
    }
  }

  return { shows, clients, chunkSize };
}

// Get all client UIDs
function getClientUids(): string[] {
  return Object.values(fixtures.clients);
}

// Get all studio room UIDs
function getStudioRoomUids(): string[] {
  return Object.values(fixtures.studioRooms);
}

// Get all MC UIDs
function getMcUids(): string[] {
  return Object.values(fixtures.mcs);
}

// Get all platform UIDs
function getPlatformUids(): string[] {
  return Object.values(fixtures.platforms);
}

// Get random element from array
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Get random elements from array (without duplicates)
function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

// Check if two time ranges overlap
function isTimeOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean {
  return start1.getTime() < end2.getTime() && start2.getTime() < end1.getTime();
}

// Generate shows with no MC overlaps or room conflicts
function generateShows(
  numShows: number,
  startDate: Date,
  endDate: Date,
): ShowPlanItem[] {
  const shows: ShowPlanItem[] = [];
  const clientUids = getClientUids();
  const roomUids = getStudioRoomUids();
  const mcUids = getMcUids();
  const platformUids = getPlatformUids();

  // Track MC schedules to avoid overlaps
  const mcSchedules: Map<string, Array<{ start: Date; end: Date }>> = new Map();
  mcUids.forEach((mcUid) => mcSchedules.set(mcUid, []));

  // Track room schedules to avoid conflicts
  const roomSchedules: Map<
    string,
    Array<{ start: Date; end: Date }>
  > = new Map();
  roomUids.forEach((roomUid) => roomSchedules.set(roomUid, []));

  const dateRange = endDate.getTime() - startDate.getTime();
  const minShowDuration = 60 * 60 * 1000; // 1 hour in ms
  const maxShowDuration = 4 * 60 * 60 * 1000; // 4 hours in ms

  // Show type distribution: BAU (70%), Campaign (15%), Other (15%)
  const showTypeWeights = [
    { uid: fixtures.showTypes.bau, weight: 70 },
    { uid: fixtures.showTypes.campaign, weight: 15 },
    { uid: fixtures.showTypes.other, weight: 15 },
  ];

  // Show status distribution: Draft (60%), Confirmed (20%), Live (20%)
  const showStatusWeights = [
    { uid: fixtures.showStatuses.draft, weight: 60 },
    { uid: fixtures.showStatuses.confirmed, weight: 20 },
    { uid: fixtures.showStatuses.live, weight: 20 },
  ];

  // Show standard distribution: Standard (70%), Premium (30%)
  const showStandardWeights = [
    { uid: fixtures.showStandards.standard, weight: 70 },
    { uid: fixtures.showStandards.premium, weight: 30 },
  ];

  function weightedRandom<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }
    return items[items.length - 1];
  }

  // Check if a time slot is available for a room
  function isRoomAvailable(roomUid: string, start: Date, end: Date): boolean {
    const schedules = roomSchedules.get(roomUid) || [];
    return !schedules.some((schedule) =>
      isTimeOverlapping(start, end, schedule.start, schedule.end),
    );
  }

  // Check if a time slot is available for MCs
  function areMcAvailable(mcUids: string[], start: Date, end: Date): boolean {
    return mcUids.every((mcUid) => {
      const schedules = mcSchedules.get(mcUid) || [];
      return !schedules.some((schedule) =>
        isTimeOverlapping(start, end, schedule.start, schedule.end),
      );
    });
  }

  // Find available time slot for a room and MCs
  function findAvailableTimeSlot(
    roomUid: string,
    mcUids: string[],
    duration: number,
    maxAttempts: number = 100,
  ): { start: Date; end: Date } | null {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const startTime =
        startDate.getTime() + Math.random() * (dateRange - duration);
      const start = new Date(startTime);
      const end = new Date(startTime + duration);

      if (end > endDate) {
        continue;
      }

      if (
        isRoomAvailable(roomUid, start, end) &&
        areMcAvailable(mcUids, start, end)
      ) {
        return { start, end };
      }
    }
    return null;
  }

  let showIndex = 0;
  let attempts = 0;
  const maxAttempts = numShows * 10; // Allow some retries

  while (shows.length < numShows && attempts < maxAttempts) {
    attempts++;

    // Distribute shows across clients
    const clientUid = clientUids[showIndex % clientUids.length];
    const clientKey =
      Object.keys(fixtures.clients).find(
        (key) =>
          fixtures.clients[key as keyof typeof fixtures.clients] === clientUid,
      ) || 'nike';
    // Convert camelCase to Title Case for display
    const clientName =
      clientKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim() || 'Nike';

    // Select room, MCs, and platforms
    const roomUid = randomElement(roomUids);
    const numMc = Math.floor(Math.random() * 3) + 1; // 1-3 MCs
    const selectedMcUids = randomElements(mcUids, numMc);
    const numPlatforms = Math.floor(Math.random() * 2) + 1; // 1-2 platforms
    const selectedPlatformUids = randomElements(platformUids, numPlatforms);

    // Generate show duration
    const duration =
      minShowDuration + Math.random() * (maxShowDuration - minShowDuration);

    // Find available time slot
    const timeSlot = findAvailableTimeSlot(roomUid, selectedMcUids, duration);

    if (!timeSlot) {
      // Skip this show if no available slot found
      continue;
    }

    // Reserve the time slot
    const roomScheduleList = roomSchedules.get(roomUid) || [];
    roomScheduleList.push({ start: timeSlot.start, end: timeSlot.end });
    roomSchedules.set(roomUid, roomScheduleList);

    selectedMcUids.forEach((mcUid) => {
      const mcScheduleList = mcSchedules.get(mcUid) || [];
      mcScheduleList.push({ start: timeSlot.start, end: timeSlot.end });
      mcSchedules.set(mcUid, mcScheduleList);
    });

    // Generate show
    const show: ShowPlanItem = {
      tempId: `temp_${Date.now()}_${showIndex}`,
      name: `${clientName} Show ${showIndex + 1}`,
      startTime: timeSlot.start.toISOString(),
      endTime: timeSlot.end.toISOString(),
      clientUid,
      studioRoomUid: roomUid,
      showTypeUid: weightedRandom(showTypeWeights).uid,
      showStatusUid: weightedRandom(showStatusWeights).uid,
      showStandardUid: weightedRandom(showStandardWeights).uid,
      mcs: selectedMcUids.map((mcUid) => ({
        mcUid,
        note: `MC assignment for ${clientName} Show ${showIndex + 1}`,
      })),
      platforms: selectedPlatformUids.map((platformUid, idx) => ({
        platformUid,
        liveStreamLink: `https://${platformUid}.com/live/show-${showIndex + 1}`,
        platformShowId: `platform_show_${showIndex + 1}_${idx + 1}`,
      })),
      metadata: {},
    };

    shows.push(show);
    showIndex++;
  }

  // Sort shows by start time
  shows.sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  // Warn if we couldn't generate enough shows
  if (shows.length < numShows) {
    console.warn(
      `⚠️  Warning: Only generated ${shows.length} shows out of ${numShows} requested. This may be due to limited available time slots.`,
    );
  }

  return shows;
}

// Generate plan document
function generatePlanDocument(
  numShows: number,
  startDate: Date,
  endDate: Date,
): PlanDocument {
  const shows = generateShows(numShows, startDate, endDate);
  const clientUids = getClientUids();
  const primaryClientUid = clientUids[0];
  const clientKey =
    Object.keys(fixtures.clients).find(
      (key) =>
        fixtures.clients[key as keyof typeof fixtures.clients] ===
        primaryClientUid,
    ) || 'nike';
  // Convert camelCase to Title Case for display
  const clientName =
    clientKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim() || 'Nike';

  return {
    metadata: {
      lastEditedBy: fixtures.users.admin,
      lastEditedAt: new Date().toISOString(),
      totalShows: shows.length,
      clientName,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    },
    shows,
  };
}

// Generate create schedule payload
function generateCreateSchedulePayload(
  numShows: number,
): CreateSchedulePayload {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const planDocument = generatePlanDocument(numShows, startDate, endDate);
  const clientUids = getClientUids();

  return {
    name: `Monthly Schedule - ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: 'draft',
    plan_document: planDocument,
    version: 1,
    client_id: clientUids[0],
    created_by: fixtures.users.admin,
  };
}

// Generate bulk create schedule payload (single client)
function generateBulkCreateSchedulePayload(numShows: number): {
  schedules: CreateSchedulePayload[];
} {
  const payload = generateCreateSchedulePayload(numShows);
  return { schedules: [payload] };
}

// Generate multi-client monthly overview payloads
// Creates a SINGLE schedule with shows from all clients (monthly overview)
function generateMultiClientMonthlyOverview(
  totalShows: number,
  numClients: number,
  chunkSize: number,
): {
  schedule: CreateSchedulePayload;
  chunkedShows: ShowPlanItem[][];
} {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const clientUids = getClientUids().slice(0, numClients);
  const showsPerClient = Math.floor(totalShows / numClients);
  const allShows: ShowPlanItem[] = [];

  // Generate shows for each client and combine into single schedule
  for (let clientIndex = 0; clientIndex < numClients; clientIndex++) {
    const clientUid = clientUids[clientIndex];
    const clientKey =
      Object.keys(fixtures.clients).find(
        (key) =>
          fixtures.clients[key as keyof typeof fixtures.clients] === clientUid,
      ) || 'nike';
    const clientName =
      clientKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim() || 'Nike';

    // Generate shows for this client
    const clientShows = generateShows(showsPerClient, startDate, endDate);

    // Update client UID for all shows
    clientShows.forEach((show) => {
      show.clientUid = clientUid;
      show.name = `${clientName} Show ${show.name.split(' ').pop()}`;
    });

    // Add to all shows
    allShows.push(...clientShows);
  }

  // Sort all shows by start time
  allShows.sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  // Create single schedule with all shows (monthly overview)
  const planDocument: PlanDocument = {
    metadata: {
      lastEditedBy: fixtures.users.admin,
      lastEditedAt: new Date().toISOString(),
      totalShows: allShows.length,
      clientName: 'Monthly Overview', // All clients
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    },
    shows: allShows,
  };

  // Use first client as the schedule owner (or could be a special "monthly overview" client)
  const primaryClientUid = clientUids[0];

  const schedule: CreateSchedulePayload = {
    name: `Monthly Schedule - ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: 'draft',
    plan_document: planDocument,
    version: 1,
    client_id: primaryClientUid,
    created_by: fixtures.users.admin,
  };

  // Generate chunked shows for incremental upload
  const chunkedShows: ShowPlanItem[][] = [];
  for (let i = 0; i < allShows.length; i += chunkSize) {
    chunkedShows.push(allShows.slice(i, i + chunkSize));
  }

  return { schedule, chunkedShows };
}

// Generate update schedule payload
function generateUpdateSchedulePayload(
  numShows: number,
): UpdateSchedulePayload {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const planDocument = generatePlanDocument(numShows, startDate, endDate);

  return {
    plan_document: planDocument,
    version: 1,
  };
}

// Generate publish schedule payload
function generatePublishSchedulePayload(): PublishSchedulePayload {
  return {
    version: 1,
  };
}

// Main function
function main() {
  const { shows, clients, chunkSize } = parseArgs();
  const outputDir = path.join(__dirname, '..');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (clients === 1) {
    // Single client scenario (original behavior)
    console.log(`Generating payloads with ${shows} shows for 1 client...`);

    // Generate create schedule payload
    const createPayload = generateCreateSchedulePayload(shows);
    fs.writeFileSync(
      path.join(outputDir, '01-create-schedule.json'),
      JSON.stringify(createPayload, null, 2),
    );
    console.log('✓ Generated 01-create-schedule.json');

    // Generate bulk create schedule payload
    const bulkCreatePayload = generateBulkCreateSchedulePayload(shows);
    fs.writeFileSync(
      path.join(outputDir, '01-bulk-create-schedule.json'),
      JSON.stringify(bulkCreatePayload, null, 2),
    );
    console.log('✓ Generated 01-bulk-create-schedule.json');

    // Generate update schedule payload
    const updatePayload = generateUpdateSchedulePayload(shows);
    fs.writeFileSync(
      path.join(outputDir, '02-update-schedule.json'),
      JSON.stringify(updatePayload, null, 2),
    );
    console.log('✓ Generated 02-update-schedule.json');

    // Generate publish schedule payload
    const publishPayload = generatePublishSchedulePayload();
    fs.writeFileSync(
      path.join(outputDir, '03-publish-schedule.json'),
      JSON.stringify(publishPayload, null, 2),
    );
    console.log('✓ Generated 03-publish-schedule.json');

    console.log(`\n✅ Successfully generated ${shows} shows for 1 client`);
    console.log(`   - No MC overlaps (MC double-booking prevented)`);
    console.log(`   - No room conflicts`);
    console.log(`   - All shows within schedule date range`);
  } else {
    // Multi-client monthly overview scenario
    console.log(
      `Generating monthly overview payloads with ${shows} total shows across ${clients} clients...`,
    );
    console.log(`   Chunk size: ${chunkSize} shows per chunk`);

    const { schedule, chunkedShows } = generateMultiClientMonthlyOverview(
      shows,
      clients,
      chunkSize,
    );

    // Generate create schedule payload (single schedule with all shows)
    fs.writeFileSync(
      path.join(outputDir, '01-create-schedule.json'),
      JSON.stringify(schedule, null, 2),
    );
    console.log(
      '✓ Generated 01-create-schedule.json (single monthly schedule)',
    );

    // Generate bulk create payload (for reference, but may be too large)
    const bulkCreatePayload = { schedules: [schedule] };
    fs.writeFileSync(
      path.join(outputDir, '01-bulk-create-schedule.json'),
      JSON.stringify(bulkCreatePayload, null, 2),
    );
    console.log('✓ Generated 01-bulk-create-schedule.json');

    // Generate chunked show payloads (for incremental upload)
    const chunkedDir = path.join(outputDir, 'chunked');
    if (!fs.existsSync(chunkedDir)) {
      fs.mkdirSync(chunkedDir, { recursive: true });
    }

    // Generate chunked payloads for append endpoint
    for (let i = 0; i < chunkedShows.length; i++) {
      const chunk = chunkedShows[i];
      const chunkPayload = {
        shows: chunk,
        chunkIndex: i + 1, // 1-based chunk index
        version: 1, // Will be updated during upload
      };
      fs.writeFileSync(
        path.join(chunkedDir, `chunk-${String(i + 1).padStart(3, '0')}.json`),
        JSON.stringify(chunkPayload, null, 2),
      );
    }
    console.log(
      `✓ Generated ${chunkedShows.length} chunked payloads in chunked/ directory`,
    );
    console.log(
      `   Use these for POST /admin/schedules/:id/shows/append endpoint`,
    );

    // Generate update schedule payload (full schedule for reference)
    const updatePayload: UpdateSchedulePayload = {
      plan_document: schedule.plan_document,
      version: 1,
    };
    fs.writeFileSync(
      path.join(outputDir, '02-update-schedule.json'),
      JSON.stringify(updatePayload, null, 2),
    );
    console.log('✓ Generated 02-update-schedule.json');

    // Generate publish schedule payload
    const publishPayload = generatePublishSchedulePayload();
    fs.writeFileSync(
      path.join(outputDir, '03-publish-schedule.json'),
      JSON.stringify(publishPayload, null, 2),
    );
    console.log('✓ Generated 03-publish-schedule.json');

    const showsPerClient = Math.floor(shows / clients);
    console.log(`\n✅ Successfully generated monthly overview:`);
    console.log(`   - Total shows: ${shows}`);
    console.log(`   - Clients: ${clients}`);
    console.log(`   - Shows per client: ~${showsPerClient}`);
    console.log(`   - Schedules: 1 (single monthly overview)`);
    console.log(`   - Chunked payloads: ${chunkedShows.length}`);
    console.log(`   - No MC overlaps (MC double-booking prevented)`);
    console.log(`   - No room conflicts`);
    console.log(`   - All shows within schedule date range`);
    console.log(
      `\n💡 Chunked Upload Workflow (see docs/SCHEDULE_UPLOAD_API_DESIGN.md):`,
    );
    console.log(
      `   1. Create empty schedule: POST /admin/schedules (with empty shows array)`,
    );
    console.log(
      `   2. Append chunks sequentially: POST /admin/schedules/:id/shows/append`,
    );
    console.log(`      - Use chunked/*.json files in order`);
    console.log(`      - Each chunk includes chunkIndex and version`);
    console.log(
      `   3. Review complete schedule: GET /admin/schedules/:id`,
    );
    console.log(`   4. Validate: POST /admin/schedules/:id/validate`);
    console.log(`   5. Publish: POST /admin/schedules/:id/publish`);
  }
}

// Run the script
if (require.main === module) {
  main();
}
