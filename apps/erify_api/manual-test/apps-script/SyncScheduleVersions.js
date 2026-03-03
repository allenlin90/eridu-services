function syncScheduleVersionsFromServer() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);
  const selectedRows = getSelectedScheduleRows(schedulesSheet);

  const stats = { total: 0, success: 0, failed: 0, skipped: 0 };

  if (selectedRows.length === 0) {
    Logger.log('No schedules selected in Column L (active_schedule=true). Version sync skipped.');
    return;
  }

  Logger.log('--- Starting Version Sync Process ---');

  selectedRows.forEach(({ row, sheetRow, scheduleId }) => {
    const sheetVersionRaw = row[SCHEDULE_COLS.VERSION - 1];
    const sheetVersionParsed = parseInt(sheetVersionRaw, 10);
    const sheetVersion = Number.isNaN(sheetVersionParsed) ? 'empty' : sheetVersionParsed;

    if (!scheduleId) return;

    stats.total++;

    try {
      const serverSchedule = getSchedule(scheduleId);
      if (!serverSchedule || typeof serverSchedule.version === 'undefined') {
        throw new Error(`Could not fetch version for ${scheduleId}`);
      }

      const serverVersion = serverSchedule.version;
      const versionCell = schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.VERSION);
      const noteCell = schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE);

      if (sheetVersionRaw !== '' && !Number.isNaN(sheetVersionParsed) && sheetVersionParsed === serverVersion) {
        noteCell.setValue(`Version already synced (v${serverVersion})`);
        stats.skipped++;
        return;
      }

      versionCell.setValue(serverVersion);
      noteCell.setValue(`Version synced from server (${sheetVersion} -> ${serverVersion})`);
      Logger.log(`Synced ${scheduleId}: ${sheetVersion} -> ${serverVersion}`);
      stats.success++;
    } catch (e) {
      Logger.log(`Version sync error for ${scheduleId}: ${e.message}`);
      schedulesSheet.getRange(sheetRow, SCHEDULE_COLS.NOTE).setValue(`Version sync error: ${e.message}`);
      stats.failed++;
    }
  });

  Logger.log('--- Version Sync Summary ---');
  Logger.log(`Total Processed: ${stats.total}`);
  Logger.log(`Synced: ${stats.success}`);
  Logger.log(`Failed: ${stats.failed}`);
  Logger.log(`Skipped (Already Synced): ${stats.skipped}`);
  Logger.log('----------------------------');
}
