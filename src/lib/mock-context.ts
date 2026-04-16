// Single source of truth for hotel/user identity until real auth is added.
// To add auth: replace these constants with session cookie reads.

export const MOCK_HOTEL_ID = process.env.MOCK_HOTEL_ID ?? ''
export const MOCK_USER_ID = process.env.MOCK_USER_ID ?? ''
export const MOCK_USER_NAME = 'Marcus Vane'
export const MOCK_USER_ROLE = 'Operations Manager'
