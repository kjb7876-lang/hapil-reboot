# Reconstructed retained asset records

The two missing files `docs/reused-assets.json` and `tests/fixtures/media-dimensions-v6.json` are reconstructed records, not copies of the missing historical files. Their scope is restricted to the five retained media files used by `tools/build-story-ledger.cjs`: `gunner.webp`, `shot.webp`, `forest.jpg`, `cave.webp`, and `ruins.webp`.

Expected SHA-256, byte lengths, and dimensions were recovered from the existing `docs/story/runtime-assets.json` in fixed parent commit `132b2c48099c1095c532e7076c21858e2620798e`. Original binary files were separately retrieved through the GitHub connector from fixed descendant commit `7f90128958545672aa0dcedf54b73897fbe1d566`; their Git blob hashes and SHA-256/byte counts were checked against the repository and the recorded manifest. Pillow independently decoded dimensions for all five and matched the recorded values. A matching hash or dimension establishes byte identity and size only, not canonical visual correctness or browser/GPU gameplay verification.

The reconstructed file is not a complete inventory of all legacy assets. The builder must fail on any file for which it lacks a verified expected SHA-256. Existing five-boss sheets remain covered separately by `docs/reused-boss-motion-v8.json`; candidate and effect assets retain their own checked-in reports.
