'use strict';
// Kept as the documented command. The 90-case suite now checks the actual source-alpha contact,
// not the intentionally removed broad-mask fill.
if(process.env.PHASE2_INK_PREVIEW&&!process.env.PHASE2_SOURCE_PREVIEW)process.env.PHASE2_SOURCE_PREVIEW=process.env.PHASE2_INK_PREVIEW;
require('./check-phase2-source-native-ink-v43.cjs');
