function updateSchedule(scheduleId, payload) {
  const options = {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  const response = apiClient({
    path: ROUTES.UPDATE_SCHEDULE(scheduleId),
    options: options
  });
  
  return response;
}

function getSchedule(scheduleId) {
  const responseRaw = apiClient({
    path: ROUTES.UPDATE_SCHEDULE(scheduleId), // Re-using route which is /schedules/:id
    options: { method: 'get' }
  });
  return JSON.parse(responseRaw);
}

function validateSchedule(scheduleId) {
  const responseRaw = apiClient({
    path: ROUTES.VALIDATE_SCHEDULE(scheduleId),
    options: { method: 'post' }
  });
  return JSON.parse(responseRaw);
}

function publishSchedule(scheduleId, version) {
  const responseRaw = apiClient({
    path: ROUTES.PUBLISH_SCHEDULE(scheduleId),
    options: { 
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ version: version })
    }
  });
  return JSON.parse(responseRaw);
}

function apiClient({ path = '/', options = {} } = {}) {
  const url = `${HOST}${path}`;
  Logger.log(`Calling API: ${url}`);
  
  try {
    const res = UrlFetchApp.fetch(url, {
      ...options,
      muteHttpExceptions: true,
      headers: {
        ...options.headers,
        'X-API-KEY': GOOGLE_SHEET_KEY
      },
    });
    
    const responseCode = res.getResponseCode();
    const responseBody = res.getContentText();
    
    if (responseCode >= 400) {
      Logger.log(`Error ${responseCode}: ${responseBody}`);
    }
    
    return responseBody;
  } catch (e) {
    Logger.log(`Exception: ${e.toString()}`);
    throw e;
  }
}

function bulkCreateSchedules({ schedules = [] }) {
  const refinedSchedule = schedules.map(schedule => ({ ...schedule, created_by: GOOGLE_SHEET_USER_ID }));

  const serializedPayload = JSON.stringify({ schedules: refinedSchedule });

  const res = apiClient({ 
    path: ROUTES.BULK_CREATE_SCHEDULE, 
    options: { 
      method: 'POST',
      contentType: 'application/json',
      payload: serializedPayload
    }
  });

  return res;
}
