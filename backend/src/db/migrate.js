import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncDiskDataToPostgres() {
  console.log('[AnuDB Data Sync] Checking for existing user & case records on disk...');
  const dataDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) return;

  // 1. Sync Users
  const usersFile = path.join(dataDir, 'store_users.json');
  if (fs.existsSync(usersFile)) {
    try {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      if (Array.isArray(users) && users.length > 0) {
        let syncedCount = 0;
        for (const u of users) {
          if (!u || !u.email) continue;
          const sql = `
            INSERT INTO users (
              id, name, email, phone, password_hash, role, email_verified,
              otp_code, otp_expires_at, user_metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role,
              email_verified = EXCLUDED.email_verified,
              user_metadata = EXCLUDED.user_metadata;
          `;
          const params = [
            u.id || `usr_${Math.random().toString(36).substring(2, 10)}`,
            u.name || 'User',
            u.email.toLowerCase().trim(),
            u.phone || null,
            u.password_hash || '$2a$10$defaultHashPlaceholder',
            u.role || 'user',
            Boolean(u.email_verified),
            u.otp_code || null,
            u.otp_expires_at ? new Date(u.otp_expires_at) : null,
            JSON.stringify(u.user_metadata || {}),
            u.created_at ? new Date(u.created_at) : new Date(),
            u.updated_at ? new Date(u.updated_at) : new Date(),
          ];
          await db.query(sql, params);
          syncedCount++;
        }
        console.log(`  ✓ Synced ${syncedCount} users from disk store to AnuDB.`);
      }
    } catch (err) {
      console.warn('  [Sync Warning] Failed to sync users from disk:', err.message);
    }
  }

  // 2. Sync Lawyers
  const lawyersFile = path.join(dataDir, 'store_lawyers.json');
  if (fs.existsSync(lawyersFile)) {
    try {
      const lawyers = JSON.parse(fs.readFileSync(lawyersFile, 'utf-8'));
      if (Array.isArray(lawyers) && lawyers.length > 0) {
        let syncedLawyers = 0;
        for (const l of lawyers) {
          if (!l || !l.id || !l.email) continue;
          // Ensure associated user exists first
          if (l.user_id) {
            await db.query(`
              INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at)
              VALUES ($1, $2, $3, $4, 'lawyer', true, NOW(), NOW())
              ON CONFLICT (email) DO NOTHING;
            `, [l.user_id, l.name || 'Advocate', l.email.toLowerCase().trim(), '$2a$10$lawyerHashPlaceholder']);
          }

          const sql = `
            INSERT INTO lawyers (
              id, user_id, name, email, phone, bar_registration_number, state_bar_council,
              years_of_experience, primary_jurisdiction, primary_court, location_city,
              languages, specializations, consultation_fee, consultation_modes,
              verification_status, admin_remarks, is_available, profile_bio, rating_avg,
              total_consultations, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            )
            ON CONFLICT (id) DO UPDATE SET
              verification_status = EXCLUDED.verification_status,
              is_available = EXCLUDED.is_available,
              admin_remarks = EXCLUDED.admin_remarks;
          `;
          const params = [
            l.id,
            l.user_id || null,
            l.name || 'Advocate',
            l.email.toLowerCase().trim(),
            l.phone || '0000000000',
            l.bar_registration_number || `BAR/${l.id}`,
            l.state_bar_council || 'State Bar Council',
            parseInt(l.years_of_experience || 0, 10),
            l.primary_jurisdiction || 'India',
            l.primary_court || 'District Court',
            l.location_city || 'New Delhi',
            JSON.stringify(l.languages || ['English']),
            JSON.stringify(l.specializations || []),
            parseInt(l.consultation_fee || 500, 10),
            JSON.stringify(l.consultation_modes || ['video', 'phone', 'chat']),
            (l.verification_status || 'VERIFIED').toLowerCase(),
            l.admin_remarks || null,
            Boolean(l.is_available ?? true),
            l.profile_bio || l.bio || null,
            parseFloat(l.rating_avg || 5.0),
            parseInt(l.total_consultations || 0, 10),
            l.created_at ? new Date(l.created_at) : new Date(),
            l.updated_at ? new Date(l.updated_at) : new Date(),
          ];
          await db.query(sql, params);
          syncedLawyers++;
        }
        console.log(`  ✓ Synced ${syncedLawyers} lawyers from disk store to AnuDB.`);
      }
    } catch (err) {
      console.warn('  [Sync Warning] Failed to sync lawyers from disk:', err.message);
    }
  }

  // 3. Sync Conversations
  const convFile = path.join(dataDir, 'store_conversations.json');
  if (fs.existsSync(convFile)) {
    try {
      const convs = JSON.parse(fs.readFileSync(convFile, 'utf-8'));
      if (Array.isArray(convs) && convs.length > 0) {
        let syncedConvs = 0;
        for (const c of convs) {
          if (!c || !c.id || (!c.user_id && !c.userId)) continue;
          const uid = c.user_id || c.userId;
          // Ensure user exists before inserting foreign key
          const userCheck = await db.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [uid]);
          if (!userCheck.rows || userCheck.rows.length === 0) continue;

          const sql = `
            INSERT INTO chat_conversations (
              id, user_id, case_id, title, category, is_pinned,
              conversation_summary, metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING;
          `;
          const params = [
            c.id,
            uid,
            c.case_id || null,
            c.title || 'Legal Consultation',
            c.category || 'Legal Consultation',
            Boolean(c.is_pinned ?? c.isPinned),
            c.conversation_summary || null,
            JSON.stringify(c.metadata || {}),
            c.created_at ? new Date(c.created_at) : new Date(),
            c.updated_at ? new Date(c.updated_at) : new Date(),
          ];
          await db.query(sql, params);
          syncedConvs++;
        }
        console.log(`  ✓ Synced ${syncedConvs} chat conversations from disk store to AnuDB.`);
      }
    } catch (err) {
      console.warn('  [Sync Warning] Failed to sync conversations from disk:', err.message);
    }
  }

  // 4. Sync Messages
  const msgFile = path.join(dataDir, 'store_messages.json');
  if (fs.existsSync(msgFile)) {
    try {
      const messagesMap = JSON.parse(fs.readFileSync(msgFile, 'utf-8'));
      if (messagesMap && typeof messagesMap === 'object') {
        let syncedMsgs = 0;
        for (const [convId, list] of Object.entries(messagesMap)) {
          if (!Array.isArray(list)) continue;
          const convCheck = await db.query('SELECT id, user_id FROM chat_conversations WHERE id = $1 LIMIT 1', [convId]);
          if (!convCheck.rows || convCheck.rows.length === 0) continue;
          const fallbackUid = convCheck.rows[0].user_id;

          for (const m of list) {
            if (!m || !m.id) continue;
            const uid = m.user_id || m.userId || fallbackUid;
            const sql = `
              INSERT INTO chat_messages (
                id, conversation_id, user_id, sender, message_text,
                detected_laws, detected_precedents, suggested_next_steps, agent_steps, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO NOTHING;
            `;
            const params = [
              m.id,
              convId,
              uid,
              m.sender || 'user',
              m.text || m.message_text || m.message || '',
              JSON.stringify(m.detected_laws || m.detectedLaws || []),
              JSON.stringify(m.detected_precedents || m.detectedPrecedents || []),
              JSON.stringify(m.suggested_next_steps || m.suggestedNextSteps || []),
              JSON.stringify(m.agent_steps || m.agentSteps || []),
              m.timestamp ? new Date(m.timestamp) : (m.created_at ? new Date(m.created_at) : new Date()),
            ];
            await db.query(sql, params);
            syncedMsgs++;
          }
        }
        console.log(`  ✓ Synced ${syncedMsgs} chat messages from disk store to AnuDB.`);
      }
    } catch (err) {
      console.warn('  [Sync Warning] Failed to sync messages from disk:', err.message);
    }
  }
}

async function runMigrations() {
  console.log('====================================================');
  console.log('EarnLaw AnuDB Migration Runner — Member 2');
  console.log('====================================================');

  const isConnected = await db.testConnection();
  if (!isConnected) {
    console.warn('[Migration Warning] Cannot connect to AnuDB PostgreSQL. Ensure PostgreSQL is active.');
    if (process.env.USE_MEMORY_FALLBACK === 'true') {
      console.log('[Migration Info] Fallback memory mode is enabled. Server can still operate with in-memory store.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      console.log(`Applying ${file} to AnuDB...`);
      await db.query(sql);
      console.log(`  ✓ ${file} applied successfully.`);
    } catch (err) {
      console.error(`Migration failed on ${file}:`, err.message);
      process.exit(1);
    }
  }

  // Idempotently preserve and sync disk store data to PostgreSQL
  try {
    await syncDiskDataToPostgres();
  } catch (syncErr) {
    console.warn('[Migration Info] Post-migration data sync finished with note:', syncErr.message);
  }

  console.log(' All AnuDB migrations and data sync completed successfully.');
  process.exit(0);
}

runMigrations();
