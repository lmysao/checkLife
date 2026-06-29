---
Task ID: 2
Agent: Main
Task: Sync indicator, stacked group toggle, gratitude fix, full-year export

Work Log:
- Added sync status tracking (syncing/synced/error) to Zustand store with `SyncStatus` type
- Wrapped `api()` helper to automatically track sync state on all API calls
- Added `SyncIndicator` component in RitualApp header showing green check + "Sincronizado" + timestamp
- Added `stacked` boolean field to `ModuleGroup` Prisma model
- Updated module-groups API route to handle `stacked` field in POST/PUT
- Added toggle in GroupManager dialog for both new and existing groups
- Updated ModuleTabs to hide sub-navigation pills when group is stacked
- Updated RitualApp to render all stacked group modules vertically with colored headings
- Fixed GratitudeSection to initialize from store data instead of always empty ["","",""]
- Changed export default date range from last 30 days to Jan 1 of current year
- Verified all changes with agent-browser: stacked mode renders correctly, toggle persists, sync indicator shows

Stage Summary:
- Sync indicator shows in header after every data operation (3s visible, then auto-hides)
- Groups can be toggled between "Abas separadas" (sub-tabs) and "Empilhado" (stacked scroll)
- Stacked groups show all modules vertically with colored headings, no sub-tabs
- Gratitude now loads previously saved data from store on component mount
- All exports (Excel, JSON, mood calendar) now default to full year instead of 30 days
---
Task ID: 1
Agent: Main
Task: Complete rebuild of Ritual Diário app

Work Log:
- Analyzed the original single-file HTML app (2825 lines) using Supabase + localStorage
- Identified root cause of data disappearing bug: fetchAll() overwrites local cache with empty Supabase results
- Designed new Prisma schema with 12 models for SQLite
- Created 12 API route files for all data operations
- Built complete Next.js frontend with Zustand state management
- Implemented module grouping system (create/edit/delete groups, add/remove modules)
- Implemented module editing (name, color for all modules)
- Redesigned Mood system: moment-based entries + daily self-evaluation
- Built history module with 30-day mood chart, streaks, completion bars
- Created export API (Excel, JSON, Mood Calendar HTML)
- Added export panel in History module
- All lint errors fixed (0 errors in app code)

Stage Summary:
- App fully migrated from Supabase+localStorage to Prisma+SQLite (no more data loss)
- Module groups allow combining modules in scrollable views
- Mood redesigned with time-based moments throughout the day
- 4 export formats: Excel (nutrition), Diary JSON, Full JSON, Mood Calendar HTML
