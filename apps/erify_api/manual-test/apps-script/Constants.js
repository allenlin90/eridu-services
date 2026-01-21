// sheets
const SCHEDULE_SHEET = 'schedules';
const CONFIG_SHEET = 'config';
const CONFIG_CREATE_SCHEDULE_FIRST_ROW_RANGE = 'J2';
const CONFIG_ACTIVE_SCHEDULE_RANGE = 'J4';
const SHEET_NAME = 'show_planning_integration';
const TARGET_SHEET_NAME = 'show_planning'; // User facing sheet

// Column Configurations
const COLS = {
  VERSION: 18, // Column R
  STATUS: 19, // Column S
  ERROR_MSG: 20 // Column T
}

// utility constants
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// api config
const GOOGLE_SHEET_KEY = 'ae63f8e9ddff01029ef2bb13a0dc105ce7d08e4aec56dd9d'; 
const HOST = 'https://erify-api.eridu.co.th/google-sheets';
const GOOGLE_SHEET_USER_ID = 'user_x2ooAy1O3NKiyaKqhCKX';

const ROUTES = { 
  BULK_CREATE_SCHEDULE: '/schedules/bulk',
  UPDATE_SCHEDULE: (scheduleId) => `/schedules/${scheduleId}`, 
  VALIDATE_SCHEDULE: (scheduleId) => `/schedules/${scheduleId}/validate`,
  PUBLISH_SCHEDULE: (scheduleId) => `/schedules/${scheduleId}/publish`,
}

const PLATFORMS = {
  'plt_Z9Flkouqz0V1idiKQiEh': 'tiktok',
  'plt_P9Y_gVTYE68KgGkR3hpO': 'shopee',
  'plt_E4UWCFvqQ4UZAZyy_Kf2': 'lazada',
}

// Fallback Defaults
const DEFAULTS = {
  SHOW_TYPE_UID: 'sht_X7czbuD84flXOcf_hj0K', // show_type bau
  SHOW_STATUS_UID: 'shst_F6LbjLg5DdDD6ubUdk5a', // show_status draft
  SHOW_STANDARD_UID: 'shsd_0Okt_vla8ABX9zDVBWrd', // show_standard standard
}

const SHOW_STANDARDS = {
  'shsd_0Okt_vla8ABX9zDVBWrd': 'standard',
  'shsd_NT4VFhiHCrQYm_J0YRfw': 'premium',
}

const SHOW_TYPES = {
  'sht_X7czbuD84flXOcf_hj0K': 'bau',
  'sht_-9k6GQlsdT10p3w9txPd': 'campaign',
}

const SHOW_STATUSES = {
  'shst_F6LbjLg5DdDD6ubUdk5a': 'draft',
  'shst_KXMwdinXl41GorISaiHX': 'confirmed',
  'shst_ziwl5OtufUQW4-YyY8HE': 'live',
  'shst_1xmtxFX7WAD0KnV_DiGn': 'completed',
  'shst_wlqCPUtuqZgDcD-E25BF': 'cancelled',
}

const STUDIO_ROOMS = {
  'srm_tEPjklpdiHlckggQlMru': 201,
  'srm_5IbAURhENZpHOsW0dNSQ': 203,
  'srm_-kIH2Me9AzcS9mD-AGPx': 301,
  'srm_M5amP_T4KMHoIYa25Mok': 302,
  'srm_JGQxSoIYC9KRRadKIk0t': 303,
  'srm_UPb9vptH3JsUg40JAmkL': 304,
  'srm_muSXUJ_ziIbyyFT1Frcq': 305,
  'srm_Tc21b6y2AobXiY78T44d': 306,
  'srm_QtUcEqU-f_dCAlTapv9Q': 307,
  'srm_yOui73p5iscS-pdq3DZO': 401,
  'srm_1bKRy7MeoWSZGXNBfJhJ': 402,
  'srm_RuUXNUDq84ZjYiuMdGAR': 403,
  'srm_IP9mZKfRZ6SZ1I6A5F4D': 404,
  'srm__tE2eGQu1XTTJgVTkPky': 405,
  'srm_9I6yDrQ8-AJ53Djxhlpv': 406,
  'srm_-E8xvYD9cb4R7ZzjfA1z': 407,
  'srm_3r-OMCLkMhud4kpcDjfT': 999,
}
