// scripts/migrate-to-teable.ts
// One-time migration. Run once against production Postgres, verify counts,
// then Postgres is decommissioned in Task 10. Idempotency NOT handled —
// do not run twice without truncating the Teable tables first.
import { sql } from '../src/lib/db.ts';
import { createRecord, link } from '../src/lib/server/teable.ts';
import {
  TABLES,
  FIRMEN_FIELDS,
  KONTAKTE_FIELDS,
  INTERAKTIONEN_FIELDS,
  AUFGABEN_FIELDS,
  PROSPECT_FIELDS
} from '../src/lib/server/teable-schema.ts';
import { writeFileSync } from 'node:fs';

async function main() {
  const companyIdMap = new Map<string, string>(); // pg uuid -> teable rec id
  const contactIdMap = new Map<string, string>();

  console.log('Migrating companies -> Firmen...');
  const companies = await sql`SELECT * FROM companies`;
  for (const c of companies) {
    const rec = await createRecord(TABLES.firmen, {
      [FIRMEN_FIELDS.name]: c.name,
      [FIRMEN_FIELDS.website]: c.website,
      [FIRMEN_FIELDS.strasse]: c.strasse,
      [FIRMEN_FIELDS.plz]: c.plz,
      [FIRMEN_FIELDS.ort]: c.ort,
      [FIRMEN_FIELDS.land]: c.land,
      [FIRMEN_FIELDS.notizen]: c.notizen
    });
    companyIdMap.set(c.id, rec.id);
  }
  console.log(`  ${companies.length} Firmen migrated.`);

  console.log('Migrating contacts (non-prospect-tagged) -> Kontakte_Real...');
  const contacts = await sql`SELECT * FROM contacts WHERE NOT ('prospect' = ANY(COALESCE(tags, '{}'::text[])))`;
  for (const c of contacts) {
    const rec = await createRecord(TABLES.kontakteReal, {
      [KONTAKTE_FIELDS.firma]: link(c.company_id ? companyIdMap.get(c.company_id) : null),
      [KONTAKTE_FIELDS.name]: c.name,
      [KONTAKTE_FIELDS.vorname]: c.vorname,
      [KONTAKTE_FIELDS.nachname]: c.nachname,
      [KONTAKTE_FIELDS.titel]: c.titel,
      [KONTAKTE_FIELDS.anrede]: c.anrede,
      [KONTAKTE_FIELDS.strasse]: c.strasse,
      [KONTAKTE_FIELDS.plz]: c.plz,
      [KONTAKTE_FIELDS.ort]: c.ort,
      [KONTAKTE_FIELDS.geburtstag]: c.geburtstag,
      [KONTAKTE_FIELDS.email]: c.email,
      [KONTAKTE_FIELDS.telefon]: c.telefon,
      [KONTAKTE_FIELDS.telefon2]: c.telefon2,
      [KONTAKTE_FIELDS.whatsapp]: c.whatsapp,
      [KONTAKTE_FIELDS.wechatId]: c.wechat_id,
      [KONTAKTE_FIELDS.linkedinUrl]: c.linkedin_url,
      [KONTAKTE_FIELDS.rolle]: c.rolle,
      [KONTAKTE_FIELDS.notizen]: c.notizen,
      [KONTAKTE_FIELDS.tags]: c.tags ?? [],
      [KONTAKTE_FIELDS.iban]: c.iban
      // Foto/Dateien intentionally NOT migrated here — base64 blobs need the
      // uploadAttachment endpoint (multipart), not a plain field write. Handle
      // separately in Step 2 below, only for contacts that actually have a photo/file.
    });
    contactIdMap.set(c.id, rec.id);
  }
  console.log(`  ${contacts.length} Kontakte_Real migrated.`);

  console.log('Migrating photos + files for migrated contacts...');
  const { uploadAttachment } = await import('../src/lib/server/teable.ts');
  const withPhoto = await sql`SELECT id, photo FROM contacts WHERE photo IS NOT NULL AND NOT ('prospect' = ANY(COALESCE(tags, '{}'::text[])))`;
  for (const row of withPhoto) {
    const teableId = contactIdMap.get(row.id);
    if (!teableId) continue;
    const [, mime, b64] = row.photo.match(/^data:(.+);base64,(.+)$/) ?? [];
    if (!b64) continue;
    const buf = Buffer.from(b64, 'base64');
    const file = new File([buf], 'foto.jpg', { type: mime || 'image/jpeg' });
    await uploadAttachment(TABLES.kontakteReal, teableId, KONTAKTE_FIELDS.foto, file);
  }
  const files = await sql`SELECT contact_id, filename, mimetype, data FROM contact_files`;
  for (const f of files) {
    const teableId = contactIdMap.get(f.contact_id);
    if (!teableId) continue;
    const [, , b64] = f.data.match(/^data:(.+);base64,(.+)$/) ?? [];
    if (!b64) continue;
    const buf = Buffer.from(b64, 'base64');
    const file = new File([buf], f.filename, { type: f.mimetype });
    await uploadAttachment(TABLES.kontakteReal, teableId, KONTAKTE_FIELDS.dateien, file);
  }
  console.log(`  ${withPhoto.length} Fotos, ${files.length} Dateien migrated.`);

  console.log('Migrating interactions + emails -> Interaktionen_Real...');
  const interactions = await sql`SELECT * FROM interactions`;
  let interactionsCreated = 0;
  let interactionsSkippedProspect = 0;
  for (const i of interactions) {
    const teableId = contactIdMap.get(i.contact_id);
    if (!teableId) {
      interactionsSkippedProspect++;
      continue;
    }
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: link(teableId),
      [INTERAKTIONEN_FIELDS.typ]: i.typ,
      [INTERAKTIONEN_FIELDS.datum]: i.datum,
      [INTERAKTIONEN_FIELDS.titel]: i.zusammenfassung,
      [INTERAKTIONEN_FIELDS.text]: i.text
    });
    interactionsCreated++;
  }
  const emails = await sql`SELECT * FROM emails WHERE contact_id IS NOT NULL`;
  let emailsCreated = 0;
  let emailsSkippedProspect = 0;
  for (const e of emails) {
    const teableId = contactIdMap.get(e.contact_id);
    if (!teableId) {
      emailsSkippedProspect++;
      continue;
    }
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: link(teableId),
      [INTERAKTIONEN_FIELDS.typ]: e.richtung === 'rein' ? 'email_rein' : 'email_raus',
      [INTERAKTIONEN_FIELDS.datum]: e.datum,
      [INTERAKTIONEN_FIELDS.titel]: e.betreff,
      [INTERAKTIONEN_FIELDS.text]: e.body_text,
      [INTERAKTIONEN_FIELDS.von]: e.von,
      [INTERAKTIONEN_FIELDS.an]: e.an
    });
    emailsCreated++;
  }
  console.log(
    `  ${interactionsCreated}/${interactions.length} Interaktionen migrated ` +
      `(${interactionsSkippedProspect} skipped: contact is prospect-tagged, no Kontakte_Real record to link).`
  );
  console.log(
    `  ${emailsCreated}/${emails.length} Emails migrated ` +
      `(${emailsSkippedProspect} skipped: contact is prospect-tagged, no Kontakte_Real record to link).`
  );

  console.log('Migrating actions -> Aufgaben_Real...');
  const actions = await sql`SELECT * FROM actions`;
  let actionsDroppedProspectLink = 0;
  for (const a of actions) {
    const resolvedContactId = a.contact_id ? contactIdMap.get(a.contact_id) : null;
    if (a.contact_id && !resolvedContactId) {
      actionsDroppedProspectLink++;
    }
    await createRecord(TABLES.aufgabenReal, {
      [AUFGABEN_FIELDS.kontakt]: link(resolvedContactId),
      [AUFGABEN_FIELDS.titel]: a.titel,
      [AUFGABEN_FIELDS.status]: a.status,
      [AUFGABEN_FIELDS.faelligAm]: a.faellig_am,
      [AUFGABEN_FIELDS.notizen]: a.notizen
    });
  }
  console.log(
    `  ${actions.length} Aufgaben migrated ` +
      `(${actionsDroppedProspectLink} created with no contact link: original contact is prospect-tagged, no Kontakte_Real record to link).`
  );

  console.log('Migrating prospects (table) + prospect-tagged contacts -> Prospects...');
  const oldProspects = await sql`SELECT * FROM prospects`;
  for (const p of oldProspects) {
    await createRecord(TABLES.prospects, {
      [PROSPECT_FIELDS.name]: p.name,
      [PROSPECT_FIELDS.vorname]: p.vorname,
      [PROSPECT_FIELDS.nachname]: p.nachname,
      [PROSPECT_FIELDS.titel]: p.titel,
      [PROSPECT_FIELDS.anrede]: p.anrede,
      [PROSPECT_FIELDS.email]: p.email,
      [PROSPECT_FIELDS.firmaText]: p.firma,
      [PROSPECT_FIELDS.firma]: link(p.company_id ? companyIdMap.get(p.company_id) : null),
      [PROSPECT_FIELDS.rolle]: p.rolle,
      [PROSPECT_FIELDS.telefon]: p.telefon,
      [PROSPECT_FIELDS.website]: p.website,
      [PROSPECT_FIELDS.notizen]: p.notizen,
      [PROSPECT_FIELDS.status]: p.status,
      [PROSPECT_FIELDS.kanal]: p.kanal,
      [PROSPECT_FIELDS.versandtAm]: p.versandt_am,
      [PROSPECT_FIELDS.followupAm]: p.followup_am,
      [PROSPECT_FIELDS.sperre]: p.sperre,
      [PROSPECT_FIELDS.sperreGrund]: p.sperre_grund,
      [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
    });
  }
  const prospectTaggedContacts = await sql`SELECT * FROM contacts WHERE 'prospect' = ANY(COALESCE(tags, '{}'::text[]))`;
  for (const c of prospectTaggedContacts) {
    const extra = [c.strasse, c.plz, c.ort, c.geburtstag, c.iban]
      .filter(Boolean)
      .join(', ');
    await createRecord(TABLES.prospects, {
      [PROSPECT_FIELDS.name]: c.name,
      [PROSPECT_FIELDS.vorname]: c.vorname,
      [PROSPECT_FIELDS.nachname]: c.nachname,
      [PROSPECT_FIELDS.titel]: c.titel,
      [PROSPECT_FIELDS.anrede]: c.anrede,
      [PROSPECT_FIELDS.email]: c.email,
      [PROSPECT_FIELDS.firma]: link(c.company_id ? companyIdMap.get(c.company_id) : null),
      [PROSPECT_FIELDS.rolle]: c.rolle,
      [PROSPECT_FIELDS.telefon]: c.telefon,
      [PROSPECT_FIELDS.notizen]: extra ? `${c.notizen ?? ''}\n[migriert, Zusatzfelder: ${extra}]`.trim() : c.notizen,
      [PROSPECT_FIELDS.status]: 'gesendet',
      [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
    });
  }
  console.log(`  ${oldProspects.length} prospects + ${prospectTaggedContacts.length} tag-prospects migrated.`);

  writeFileSync(
    'migration-id-map.json',
    JSON.stringify({ companies: Object.fromEntries(companyIdMap), contacts: Object.fromEntries(contactIdMap) }, null, 2)
  );
  console.log('Done. id map written to migration-id-map.json for spot-checking.');
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
