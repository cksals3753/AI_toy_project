// First-room rendering/input checks do not need Java or an AI service.
process.env.FIRST_PERSON_CHECK ||= '1'
await import('./verify-browser.mjs')
