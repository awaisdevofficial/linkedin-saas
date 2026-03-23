const DEFAULT_PERMANENT_TRIAL_USER_IDS = [
  '312d22c4-3544-4c16-b125-06804e6919ab',
  '0286f0ed-19d6-4aa5-a6df-91549fb29238',
  'ac11e4b8-245d-417a-a31b-88b31d16a464',
  '9a9c5441-53fa-45c8-97b0-f5c42d5946be',
];

const envIds = String(process.env.PERMANENT_TRIAL_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const PERMANENT_TRIAL_USER_IDS = new Set(
  envIds.length > 0 ? envIds : DEFAULT_PERMANENT_TRIAL_USER_IDS
);

export function isPermanentTrialUser(userId) {
  if (!userId) return false;
  return PERMANENT_TRIAL_USER_IDS.has(String(userId));
}

export function getPermanentTrialUserIds() {
  return Array.from(PERMANENT_TRIAL_USER_IDS);
}

