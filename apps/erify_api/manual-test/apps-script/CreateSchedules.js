function createSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedulesSheet = ss.getSheetByName(SCHEDULE_SHEET);

  // extract ranges and data from sheets
  const sheetLastRow = schedulesSheet.getLastRow();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const startRow = configSheet.getRange(CONFIG_CREATE_SCHEDULE_FIRST_ROW_RANGE).getValue();
  if (startRow < 2 || startRow > sheetLastRow) {
    Logger.log(`invalid row to start creating schedules`);
    return;
  }
  const configuredEndRow = Number(configSheet.getRange(CONFIG_SELECTED_END_ROW_RANGE).getValue());
  const hasValidConfiguredEndRow = Number.isFinite(configuredEndRow)
    && configuredEndRow >= startRow
    && configuredEndRow <= sheetLastRow;
  const endRow = hasValidConfiguredEndRow ? configuredEndRow : sheetLastRow;

  // preparing request payload
  const SCHEDULE_PAYLOAD_RANGE = `C${startRow}:K${endRow}`;
  const rawSchedulesData = schedulesSheet.getRange(SCHEDULE_PAYLOAD_RANGE).getValues();
  const rowsForCreate = rawSchedulesData
    .map((row, index) => ({ row, sheetRow: startRow + index }))
    .filter(({ row }) => row.some((cell) => cell !== '' && cell != null));

  if (rowsForCreate.length === 0) {
    Logger.log(`No rows with data found in ${SCHEDULE_PAYLOAD_RANGE}.`);
    return;
  }

  const payload = rowsForCreate.map(({ row, sheetRow }) => {
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

    const startDate = normalizeDateValue(start_date);
    const endDate = normalizeDateValue(end_date);
    if (!startDate || !endDate) {
      throw new Error(
        `Invalid start/end date at row ${sheetRow} (E=${String(start_date)}, F=${String(end_date)})`
      );
    }

    return {
      name: name || `${client_name} ${MONTHS[startDate.getMonth()]} ${startDate.getFullYear()} schedule`,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
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
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      }
    };
  });

  const res = bulkCreateSchedules({ schedules: payload });
  const response = JSON.parse(res);
  Logger.log(JSON.stringify(response, null ,2));

  // write back only successful items by response index -> sheet row mapping
  const { results = [] } = response;
  const successResults = results.filter((r) => r && r.success && Number.isInteger(r.index));
  successResults.forEach((result) => {
    const source = rowsForCreate[result.index];
    if (!source || !result.schedule_id) return;
    schedulesSheet.getRange(source.sheetRow, SCHEDULE_COLS.SCHEDULE_ID).setValue(result.schedule_id);
    schedulesSheet.getRange(source.sheetRow, SCHEDULE_COLS.VERSION).setValue(1);
    schedulesSheet.getRange(source.sheetRow, SCHEDULE_COLS.STATUS).setValue('draft');
  });
}

function normalizeDateValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (value == null || value === '') return null;

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}
