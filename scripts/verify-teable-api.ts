// scripts/verify-teable-api.ts
// Throwaway spike — confirms exact API shapes before Task 2 depends on them.
// Run: node --env-file=.env --experimental-strip-types scripts/verify-teable-api.ts
// Delete this file once Task 2 is done and confirmed working.

const BASE = process.env.TEABLE_BASE_URL ?? 'https://teable.hirschfeld.at';
const KEY = process.env.TEABLE_API_KEY as string;
const HEADERS = { Authorization: `Bearer ${KEY}`, 'User-Agent': 'curl/8' };

// Use the existing, known-safe scratch table: create a throwaway record in
// felix_base's `gewicht` table (single numeric field, zero risk to real data),
// then delete it, to observe the exact DELETE response.
const SCRATCH_TABLE = 'tblliWgKCRvZoyBmIte'; // gewicht

async function main() {
  const createRes = await fetch(`${BASE}/api/table/${SCRATCH_TABLE}/record`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      records: [{ fields: { kg: 0.001 } }],
      fieldKeyType: 'name'
    })
  });
  const created = await createRes.json();
  console.log('CREATE status:', createRes.status);
  console.log('CREATE body:', JSON.stringify(created, null, 2));
  const recordId = created.records[0].id;

  const delRes = await fetch(`${BASE}/api/table/${SCRATCH_TABLE}/record/${recordId}`, {
    method: 'DELETE',
    headers: HEADERS
  });
  const delBody = await delRes.text();
  console.log('DELETE status:', delRes.status);
  console.log('DELETE body:', delBody);

  // Attachment upload spike: uses a real attachment-capable field once Kontakte_Real
  // exists (Task 1 must be done first for this half). Skip if TEST_ATTACH_TABLE/FIELD/RECORD
  // env vars aren't set yet — run this half again after Task 1.
  const attTable = process.env.TEST_ATTACH_TABLE;
  const attField = process.env.TEST_ATTACH_FIELD;
  const attRecord = process.env.TEST_ATTACH_RECORD;
  if (attTable && attField && attRecord) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'text/plain' }), 'spike.txt');
    const upRes = await fetch(
      `${BASE}/api/table/${attTable}/record/${attRecord}/${attField}/uploadAttachment`,
      { method: 'POST', headers: HEADERS, body: form }
    );
    console.log('UPLOAD status:', upRes.status);
    console.log('UPLOAD body:', await upRes.text());
  } else {
    console.log('Skipping attachment spike — set TEST_ATTACH_TABLE/FIELD/RECORD env vars and rerun after Task 1.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// --- Observed results (2026-07-14, run against live teable.hirschfeld.at) ---
//
// CREATE status: 201
// CREATE body:
// {
//   "records": [{
//     "fields": { "kg": 0.001 },
//     "name": "",
//     "id": "rec2M04xpHt9oRWbVdg",
//     "autoNumber": 4,
//     "createdTime": "2026-07-14T11:05:13.659Z",
//     "createdBy": "usrKyw7MKTRq7VPuBYo"
//   }]
// }
//
// DELETE status: 200
// DELETE body (NOT "{"success":true}" as the plan assumed — it is the full
// deleted record, echoed back):
// {
//   "fields": { "fld7AYyBQwcE2BR6kho": 0.001 },
//   "name": "",
//   "id": "rec2M04xpHt9oRWbVdg",
//   "autoNumber": 4,
//   "createdTime": "2026-07-14T11:05:13.659Z",
//   "createdBy": "usrKyw7MKTRq7VPuBYo"
// }
// NOTE: the DELETE response's "fields" key uses the field ID ("fld7AYy...")
// as the key, not the field name ("kg") — unlike the CREATE response, which
// respected fieldKeyType: 'name' and returned "kg". Task 2's deleteRecord()
// should treat the DELETE body as informational only (or ignore its "fields"
// shape) and rely on the 200 status for success.
// Verified independently: GET on the deleted record afterwards returned 404
// ("Can not get record" / code "not_found") — confirms the delete was real,
// not just a 200 with no effect.
//
// UPLOAD: skipped — no attachment-capable field/table exists yet (created in
// Task 1). Re-run this script with TEST_ATTACH_TABLE/FIELD/RECORD set after
// Task 1 is done, and fill in the UPLOAD status/body here before Task 2's
// uploadAttachment() is written.
