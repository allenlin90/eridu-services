function publishSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);

  // Get active range from config (e.g., J4 -> A2:T20)
  const rangeString = configSheet.getRange(CONFIG_ACTIVE_SCHEDULE_RANGE).getValue();
  if (!rangeString) {
    Logger.log('No active schedule range defined in Config sheet.');
    return;
  }

  const match = rangeString.match(/[A-Z]+(\d+):/);
  const startRowOffset = match ? parseInt(match[1], 10) : 2; 

  const rows = schedulesSheet.getRange(rangeString).getValues();

  let stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  Logger.log('--- Starting Publish Process ---');

  rows.forEach((row, index) => {
    const scheduleId = row[1]; // Col B
    const status = row[3];     // Col D (Status)
    const rawVersion = row[6]; // Col G (Version)

    if (!scheduleId) return;

    // Filter: Only publish schedules in 'review' status
    if (!status || status.toLowerCase() !== 'review') {
      Logger.log(`Skipping ${scheduleId} (Status: ${status || 'empty'}). Must be 'review' to publish.`);
      stats.skipped++;
      return;
    }

    // Version Check
    let version = 1; 
    // If sheet has a version, use it. But publish usually requires confirming the CURRENT version.
    // However, the `publish` endpoint typically verifies that the version matches the DB version (optimistic locking).
    // So we should pass the VERSION we believe it is (from the sheet).
    if (rawVersion !== '' && rawVersion != null) {
      const parsed = parseInt(rawVersion, 10);
      if (!isNaN(parsed)) version = parsed;
    }

    stats.total++;
    try {
      Logger.log(`Publishing Schedule ${scheduleId} (v${version})...`);
      const result = publishSchedule(scheduleId, version);
      
      // CRITICAL: Check for API error response
      if (result.statusCode && result.statusCode >= 400) {
        throw new Error(result.message || `API Error ${result.statusCode}`);
      }
      if (result.error) {
         throw new Error(result.message || result.error);
      }
      
      const sheetRow = startRowOffset + index;
      const statusCell = schedulesSheet.getRange(sheetRow, 4);  // Col D
      const noteCell = schedulesSheet.getRange(sheetRow, 10);   // Col J

      // Result typically implies success if no error thrown, but check structure if needed (e.g. published: true)
      // Assuming result is success payload or simplified response.
      
      Logger.log(`Schedule ${scheduleId} PUBLISHED.`);
      statusCell.setValue('published');
      noteCell.setValue(`Published at ${new Date().toLocaleTimeString()}`);
      stats.success++;

    } catch (e) {
      Logger.log(`Error publishing ${scheduleId}: ${e.message}`);
      const sheetRow = startRowOffset + index;
      schedulesSheet.getRange(sheetRow, 10).setValue(`Publish Error: ${e.message}`);
      stats.failed++;
    }
  });

  Logger.log('--- Publish Summary ---');
  Logger.log(`Total Processed: ${stats.total}`);
  Logger.log(`Success: ${stats.success}`);
  Logger.log(`Failed: ${stats.failed}`);
  Logger.log(`Skipped: ${stats.skipped}`);
  Logger.log('-----------------------');
}
