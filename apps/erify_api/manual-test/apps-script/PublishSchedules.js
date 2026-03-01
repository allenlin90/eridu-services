function publishSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);
  const selectedRows = getSelectedScheduleRows(schedulesSheet);

  let stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  if (selectedRows.length === 0) {
    Logger.log('No schedules selected in Column L (active_schedule=true). Publish skipped.');
    return;
  }

  Logger.log('--- Starting Publish Process ---');

  selectedRows.forEach(({ row, sheetRow }) => {
    const scheduleId = row[SCHEDULE_COLS.SCHEDULE_ID - 1]; // Col B
    const rawVersion = row[SCHEDULE_COLS.VERSION - 1]; // Col G (Version)
    const status = row[SCHEDULE_COLS.STATUS - 1];

    if (!scheduleId) return;

    // determine version
    let version = 1; 
    if (rawVersion !== '' && rawVersion != null) {
      const parsed = parseInt(rawVersion, 10);
      if (!isNaN(parsed)) version = parsed;
    }

    stats.total++;
    try {
      if (!status || status.toLowerCase() !== 'review') {
        schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE).setValue(
          `Publish skipped: status '${status || 'empty'}' (expected 'review')`,
        );
        stats.skipped++;
        return;
      }

      const serverSchedule = getSchedule(scheduleId);
      if (!serverSchedule || typeof serverSchedule.version === 'undefined') {
        throw new Error(`Could not fetch version for ${scheduleId}`);
      }
      if (serverSchedule.version != version) {
        schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE).setValue(
          `Publish skipped: version mismatch (Sheet: ${version}, Server: ${serverSchedule.version})`,
        );
        stats.skipped++;
        return;
      }

      Logger.log(`Publishing Schedule ${scheduleId} (v${version})...`);
      const result = publishSchedule(scheduleId, version);
      
      // CRITICAL: Check for API error response
      if (result.statusCode && result.statusCode >= 400) {
        throw new Error(result.message || `API Error ${result.statusCode}`);
      }
      if (result.error) {
         throw new Error(result.message || result.error);
      }
      
      const statusCell = schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.STATUS); // Col D
      const noteCell = schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE); // Col J
      
      Logger.log(`Schedule ${scheduleId} PUBLISHED.`);
      statusCell.setValue('published');
      noteCell.setValue(`Published at ${new Date().toLocaleTimeString()}`);
      stats.success++;

    } catch (e) {
      Logger.log(`Error publishing ${scheduleId}: ${e.message}`);
      schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE).setValue(`Publish Error: ${e.message}`);
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
