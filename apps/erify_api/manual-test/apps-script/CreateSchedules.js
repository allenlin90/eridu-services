function createSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);

  // extract ranges and data from sheets
  const lastRow = schedulesSheet.getLastRow();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const startRow = configSheet.getRange(CONFIG_CREATE_SCHEDULE_FIRST_ROW_RANGE).getValue();
  if (startRow < 2 || startRow > lastRow) {
    Logger.log(`invalid row to start creating schedules`);
    return;
  }

  // preparing request payload
  const SCHEDULE_PAYLOAD_RANGE = `C${startRow}:K${lastRow}`;
  const rawSchedulesData = schedulesSheet.getRange(SCHEDULE_PAYLOAD_RANGE).getValues();
  const payload = rawSchedulesData.map((row) => {
    const [
      client_name, // column C
      schedule_status, // column D
      start_date, // column E
      end_date, // column F
      version, // column G
      name, // column H
      description, // column I
      note, // column J
      client_id, // column K
    ] = row;

    return {
      name: name || `${client_name} ${MONTHS[start_date.getMonth()]} ${start_date.getFullYear()} schedule`,
      start_date: start_date.toISOString(),
      end_date: end_date.toISOString(),
      status: schedule_status || 'draft',
      version: version || 1,
      metadata: { description, note, },
      client_id,
      studio_id: DEFAULTS.STUDIO_UID,
      plan_document: {
        metadata: {
          lastEditedBy: GOOGLE_SHEET_USER_ID,
          lastEditedAt: new Date().toISOString(),
          totalShows: 0,
          clientName: String(client_name || ''),
          dateRange: {
            start: start_date.toISOString(),
            end: end_date.toISOString(),
          },
        },
      }
    };
  });

  const res = bulkCreateSchedules({ schedules: payload });
  const response = JSON.parse(res);
  Logger.log(JSON.stringify(response, null ,2));

  // extract created schedule IDs and versions 
  const { successful_schedules } = response
  const scheduleIds = successful_schedules.map(({ id }) => [id]);
  const versions = successful_schedules.map(() => [1]);
  const scheduleStatus = successful_schedules.map(() => ['draft']);

  // set schedule IDs
  const scheduleIdRange = `B${startRow}:B${lastRow}`;
  schedulesSheet.getRange(scheduleIdRange).setValues(scheduleIds);
  // set schedule versions
  const versionRange = `G${startRow}:G${lastRow}`;
  schedulesSheet.getRange(versionRange).setValues(versions);
  // set schedule status
  const statusRange = `D${startRow}:D${lastRow}`;
  schedulesSheet.getRange(statusRange).setValues(scheduleStatus);
}
