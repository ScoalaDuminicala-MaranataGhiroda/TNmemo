import { createClient } from '@libsql/client';
import { DEFAULT_PLAN_TXT } from './scheduleParser';

const TURSO_URL = import.meta.env.VITE_TURSO_DATABASE_URL || '';
const TURSO_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || '';
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'talantul';

export const isTursoConfigured = Boolean(
  TURSO_URL &&
  TURSO_TOKEN &&
  !TURSO_URL.includes('numele-bazei-tale') &&
  TURSO_URL.startsWith('libsql://')
);

let client = null;
if (isTursoConfigured) {
  try {
    client = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  } catch (err) {
    console.error('Eroare la initializarea clientului Turso:', err);
  }
}

const LOCAL_STORAGE_KEY = 'tnmemo_local_db_v1';

const INITIAL_DEMO_DATA = {
  scheduleTxt: DEFAULT_PLAN_TXT,
  adminPassword: DEFAULT_ADMIN_PASSWORD,
  competitors: [
    { id: 'c1', name: 'Andrei Popescu', grade: 'Clasa a IX-a', active: 1 },
    { id: 'c2', name: 'Maria Ionescu', grade: 'Clasa a X-a', active: 1 },
    { id: 'c3', name: 'David Munteanu', grade: 'Clasa a IX-a', active: 1 },
    { id: 'c4', name: 'Sara Dumitrescu', grade: 'Clasa a XI-a', active: 1 },
    { id: 'c5', name: 'Matei Stan', grade: 'Clasa a VIII-a', active: 1 },
    { id: 'c6', name: 'Elena Rusu', grade: 'Clasa a X-a', active: 0 },
  ],
  progress: [
    { competitor_id: 'c1', verse_key: '1:1' },
    { competitor_id: 'c1', verse_key: '1:2' },
    { competitor_id: 'c1', verse_key: '1:3' },
    { competitor_id: 'c1', verse_key: '1:4' },
    { competitor_id: 'c1', verse_key: '1:5' },
    { competitor_id: 'c1', verse_key: '1:6' },
    { competitor_id: 'c1', verse_key: '1:7' },
    { competitor_id: 'c1', verse_key: '1:8' },
    { competitor_id: 'c1', verse_key: '1:9' },
    { competitor_id: 'c2', verse_key: '1:1' },
    { competitor_id: 'c2', verse_key: '1:2' },
    { competitor_id: 'c2', verse_key: '1:3' },
    { competitor_id: 'c2', verse_key: '1:4' },
    { competitor_id: 'c2', verse_key: '1:5' },
    { competitor_id: 'c2', verse_key: '1:6' },
    { competitor_id: 'c2', verse_key: '1:7' },
    { competitor_id: 'c3', verse_key: '1:1' },
    { competitor_id: 'c3', verse_key: '1:2' },
    { competitor_id: 'c3', verse_key: '1:3' },
    { competitor_id: 'c3', verse_key: '1:4' },
    { competitor_id: 'c3', verse_key: '1:5' },
    { competitor_id: 'c4', verse_key: '1:1' },
    { competitor_id: 'c4', verse_key: '1:2' },
    { competitor_id: 'c4', verse_key: '1:3' },
    { competitor_id: 'c5', verse_key: '1:1' },
    { competitor_id: 'c5', verse_key: '1:2' },
    { competitor_id: 'c6', verse_key: '1:1' },
    { competitor_id: 'c6', verse_key: '1:2' },
    { competitor_id: 'c6', verse_key: '1:3' },
  ],
  teams: [
    {
      id: 't1',
      name: 'Echipa 1',
      mode: 'support',
      memberIds: ['c1', 'c5'],
      created_at: '2026-11-10T18:00:00Z',
    },
    {
      id: 't2',
      name: 'Echipa 2',
      mode: 'support',
      memberIds: ['c2', 'c4', 'c3'],
      created_at: '2026-11-10T18:00:00Z',
    },
  ],
  materials: [
    {
      id: 'm1',
      url: 'https://www.resursecrestine.ro/biblia/filipeni/1',
      description: 'Textul biblic online - Epistola către Filipeni (Traducerea Cornilescu)',
      created_at: '2026-11-02T10:00:00Z',
    },
    {
      id: 'm2',
      url: 'https://www.bible.com/ro/bible/191/PHP.1.VDC',
      description: 'YouVersion Audio - Ascultă Filipeni în format audio pentru memorare mai rapidă',
      created_at: '2026-11-03T10:00:00Z',
    },
    {
      id: 'm3',
      url: 'https://talantulinnegot.ro',
      description: 'Regulamentul oficial și detalii despre concursul biblic Talantul în Negoț',
      created_at: '2026-11-04T10:00:00Z',
    },
  ],
};

function getLocalStore() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
      return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
    }
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }
}

function saveLocalStore(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Eroare la salvarea in localStorage:', e);
  }
}

/**
 * Initializeaza tabelele in Turso daca nu exista deja si populeaza cu datele initiale daca baza e complet noua.
 */
export async function initAndFetchAllData() {
  if (!client) {
    const local = getLocalStore();
    return {
      mode: 'local',
      ...local,
    };
  }

  // Creare schema SQL in Turso
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS competitors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS progress (
        competitor_id TEXT NOT NULL,
        verse_key TEXT NOT NULL,
        PRIMARY KEY (competitor_id, verse_key)
      )`,
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mode TEXT NOT NULL,
        member_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    ],
    'write'
  );

  const settingsRes = await client.execute('SELECT key, value FROM app_settings');
  const settingsMap = {};
  for (const row of settingsRes.rows) {
    settingsMap[row.key] = row.value;
  }

  // Daca nu exista planul de memorare in baza de date, initializam cu planul demonstrativ
  if (!settingsMap.schedule_txt) {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      args: ['schedule_txt', DEFAULT_PLAN_TXT],
    });
    settingsMap.schedule_txt = DEFAULT_PLAN_TXT;
  }

  if (!settingsMap.admin_password) {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      args: ['admin_password', DEFAULT_ADMIN_PASSWORD],
    });
    settingsMap.admin_password = DEFAULT_ADMIN_PASSWORD;
  }

  const [compRes, progRes, teamsRes, matRes] = await Promise.all([
    client.execute('SELECT id, name, grade, active, created_at FROM competitors ORDER BY name ASC'),
    client.execute('SELECT competitor_id, verse_key FROM progress'),
    client.execute('SELECT id, name, mode, member_ids_json, created_at FROM teams ORDER BY id ASC'),
    client.execute('SELECT id, url, description, created_at FROM materials ORDER BY created_at DESC'),
  ]);

  const competitors = compRes.rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    grade: String(r.grade),
    active: Number(r.active),
  }));

  const progress = progRes.rows.map((r) => ({
    competitor_id: String(r.competitor_id),
    verse_key: String(r.verse_key),
  }));

  const teams = teamsRes.rows.map((r) => {
    let parsedMembers = [];
    try {
      parsedMembers = JSON.parse(String(r.member_ids_json));
    } catch (e) {
      parsedMembers = [];
    }
    return {
      id: String(r.id),
      name: String(r.name),
      mode: String(r.mode),
      memberIds: parsedMembers,
      created_at: String(r.created_at),
    };
  });

  const materials = matRes.rows.map((r) => ({
    id: String(r.id),
    url: String(r.url),
    description: String(r.description),
    created_at: String(r.created_at),
  }));

  return {
    mode: 'turso',
    scheduleTxt: settingsMap.schedule_txt,
    adminPassword: settingsMap.admin_password,
    competitors,
    progress,
    teams,
    materials,
  };
}

export async function saveScheduleTxt(newTxt) {
  if (!client) {
    const store = getLocalStore();
    store.scheduleTxt = newTxt;
    saveLocalStore(store);
    return;
  }
  await client.execute({
    sql: 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    args: ['schedule_txt', newTxt],
  });
}

export async function saveAdminPassword(newPass) {
  if (!client) {
    const store = getLocalStore();
    store.adminPassword = newPass;
    saveLocalStore(store);
    return;
  }
  await client.execute({
    sql: 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    args: ['admin_password', newPass],
  });
}

export async function upsertCompetitor({ id, name, grade, active }) {
  const compId = id || 'comp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const now = new Date().toISOString();
  const activeInt = active ? 1 : 0;

  if (!client) {
    const store = getLocalStore();
    const idx = store.competitors.findIndex((c) => c.id === compId);
    if (idx >= 0) {
      store.competitors[idx] = { ...store.competitors[idx], name, grade, active: activeInt };
    } else {
      store.competitors.push({ id: compId, name, grade, active: activeInt });
    }
    // Daca participantul devine inactiv, il scoatem automat din echipele existente
    if (!activeInt) {
      store.teams = store.teams
        .map((t) => ({ ...t, memberIds: t.memberIds.filter((mId) => mId !== compId) }))
        .filter((t) => t.memberIds.length > 0);
    }
    saveLocalStore(store);
    return compId;
  }

  await client.execute({
    sql: `INSERT INTO competitors (id, name, grade, active, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, grade = excluded.grade, active = excluded.active`,
    args: [compId, name, grade, activeInt, now],
  });

  if (!activeInt) {
    // Curatam concurentul inactiv din echipele salvate in Turso
    const teamsRes = await client.execute('SELECT id, member_ids_json FROM teams');
    for (const row of teamsRes.rows) {
      try {
        const members = JSON.parse(String(row.member_ids_json));
        if (members.includes(compId)) {
          const updated = members.filter((mId) => mId !== compId);
          if (updated.length === 0) {
            await client.execute({ sql: 'DELETE FROM teams WHERE id = ?', args: [String(row.id)] });
          } else {
            await client.execute({
              sql: 'UPDATE teams SET member_ids_json = ? WHERE id = ?',
              args: [JSON.stringify(updated), String(row.id)],
            });
          }
        }
      } catch (e) {}
    }
  }

  return compId;
}

export async function deleteCompetitor(compId) {
  if (!client) {
    const store = getLocalStore();
    store.competitors = store.competitors.filter((c) => c.id !== compId);
    store.progress = store.progress.filter((p) => p.competitor_id !== compId);
    store.teams = store.teams
      .map((t) => ({ ...t, memberIds: t.memberIds.filter((mId) => mId !== compId) }))
      .filter((t) => t.memberIds.length > 0);
    saveLocalStore(store);
    return;
  }

  await client.batch(
    [
      { sql: 'DELETE FROM competitors WHERE id = ?', args: [compId] },
      { sql: 'DELETE FROM progress WHERE competitor_id = ?', args: [compId] },
    ],
    'write'
  );
}

export async function toggleVerseLearned(competitorId, verseKey, shouldBeLearned) {
  if (!client) {
    const store = getLocalStore();
    const exists = store.progress.some(
      (p) => p.competitor_id === competitorId && p.verse_key === verseKey
    );
    if (shouldBeLearned && !exists) {
      store.progress.push({ competitor_id: competitorId, verse_key: verseKey });
    } else if (!shouldBeLearned && exists) {
      store.progress = store.progress.filter(
        (p) => !(p.competitor_id === competitorId && p.verse_key === verseKey)
      );
    }
    saveLocalStore(store);
    return;
  }

  if (shouldBeLearned) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO progress (competitor_id, verse_key) VALUES (?, ?)',
      args: [competitorId, verseKey],
    });
  } else {
    await client.execute({
      sql: 'DELETE FROM progress WHERE competitor_id = ? AND verse_key = ?',
      args: [competitorId, verseKey],
    });
  }
}

export async function setBatchVersesForCompetitor(competitorId, verseKeys, shouldBeLearned) {
  if (!client) {
    const store = getLocalStore();
    const keySet = new Set(verseKeys);
    store.progress = store.progress.filter(
      (p) => !(p.competitor_id === competitorId && keySet.has(p.verse_key))
    );
    if (shouldBeLearned) {
      for (const vk of verseKeys) {
        store.progress.push({ competitor_id: competitorId, verse_key: vk });
      }
    }
    saveLocalStore(store);
    return;
  }

  const statements = verseKeys.map((vk) =>
    shouldBeLearned
      ? {
          sql: 'INSERT OR IGNORE INTO progress (competitor_id, verse_key) VALUES (?, ?)',
          args: [competitorId, vk],
        }
      : {
          sql: 'DELETE FROM progress WHERE competitor_id = ? AND verse_key = ?',
          args: [competitorId, vk],
        }
  );
  if (statements.length > 0) {
    await client.batch(statements, 'write');
  }
}

export async function replaceAllTeams(newTeams) {
  if (!client) {
    const store = getLocalStore();
    store.teams = newTeams;
    saveLocalStore(store);
    return;
  }

  const statements = [{ sql: 'DELETE FROM teams', args: [] }];
  for (const t of newTeams) {
    statements.push({
      sql: 'INSERT INTO teams (id, name, mode, member_ids_json, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [t.id, t.name, t.mode, JSON.stringify(t.memberIds), t.created_at],
    });
  }
  await client.batch(statements, 'write');
}

export async function addMaterialLink({ url, description }) {
  const mat = {
    id: 'mat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    url: url.trim(),
    description: description.trim(),
    created_at: new Date().toISOString(),
  };

  if (!client) {
    const store = getLocalStore();
    store.materials.unshift(mat);
    saveLocalStore(store);
    return mat;
  }

  await client.execute({
    sql: 'INSERT INTO materials (id, url, description, created_at) VALUES (?, ?, ?, ?)',
    args: [mat.id, mat.url, mat.description, mat.created_at],
  });
  return mat;
}

export async function deleteMaterialLink(id) {
  if (!client) {
    const store = getLocalStore();
    store.materials = store.materials.filter((m) => m.id !== id);
    saveLocalStore(store);
    return;
  }
  await client.execute({
    sql: 'DELETE FROM materials WHERE id = ?',
    args: [id],
  });
}
