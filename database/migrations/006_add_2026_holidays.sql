-- Migration: Add 2026 India Public Holidays
-- Version: 1.0.4
-- Date: 2026-01-24
-- Description: Updates studio_settings.holidays to include 2026 holidays
-- NOTE: This is a data migration - run ONLY if you need to add 2026 holidays to existing settings

-- The holidays are stored as JSON in studio_settings.holidays column
-- This script provides the JSON array to merge with existing holidays

-- 2026 India Public Holidays (16 holidays):
--
-- | Date       | Holiday            |
-- |------------|--------------------|
-- | 2026-01-26 | Republic Day       |
-- | 2026-02-27 | Maha Shivaratri    |
-- | 2026-03-04 | Holi               |
-- | 2026-03-21 | Eid ul-Fitr        |
-- | 2026-04-03 | Good Friday        |
-- | 2026-05-01 | May Day            |
-- | 2026-08-15 | Independence Day   |
-- | 2026-08-16 | Janmashtami        |
-- | 2026-10-02 | Gandhi Jayanti     |
-- | 2026-10-17 | Karwa Chauth       |
-- | 2026-10-19 | Dussehra           |
-- | 2026-10-29 | Dhanteras          |
-- | 2026-11-01 | Diwali             |
-- | 2026-11-04 | Bhai Dooj          |
-- | 2026-11-24 | Guru Nanak Jayanti |
-- | 2026-12-25 | Christmas          |

-- JSON format for programmatic insertion:
/*
[
  {"date":"2026-01-26","name":"Republic Day","isRecurringYearly":true},
  {"date":"2026-02-27","name":"Maha Shivaratri","isRecurringYearly":false},
  {"date":"2026-03-04","name":"Holi","isRecurringYearly":false},
  {"date":"2026-03-21","name":"Eid ul-Fitr","isRecurringYearly":false},
  {"date":"2026-04-03","name":"Good Friday","isRecurringYearly":false},
  {"date":"2026-05-01","name":"May Day","isRecurringYearly":true},
  {"date":"2026-08-15","name":"Independence Day","isRecurringYearly":true},
  {"date":"2026-08-16","name":"Janmashtami","isRecurringYearly":false},
  {"date":"2026-10-02","name":"Gandhi Jayanti","isRecurringYearly":true},
  {"date":"2026-10-17","name":"Karwa Chauth","isRecurringYearly":false},
  {"date":"2026-10-19","name":"Dussehra","isRecurringYearly":false},
  {"date":"2026-10-29","name":"Dhanteras","isRecurringYearly":false},
  {"date":"2026-11-01","name":"Diwali","isRecurringYearly":false},
  {"date":"2026-11-04","name":"Bhai Dooj","isRecurringYearly":false},
  {"date":"2026-11-24","name":"Guru Nanak Jayanti","isRecurringYearly":false},
  {"date":"2026-12-25","name":"Christmas","isRecurringYearly":true}
]
*/

-- Note: The easiest way to update holidays for an existing database is through
-- the Settings > Holidays tab in the admin UI. This migration file is provided
-- as documentation of the official 2026 holidays list.
