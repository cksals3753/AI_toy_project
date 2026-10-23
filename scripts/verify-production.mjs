// Runs the existing real-input playthrough against dist, with no Spring process.
process.env.PRODUCTION_CHECK = '1'
process.env.FIRST_PERSON_CHECK ||= 'episode'
await import('./verify-browser.mjs')
