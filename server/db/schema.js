import initSqlJs from 'sql.js';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.resolve('data/rockbottom.db');

export async function initDb() {
  const SQL = await initSqlJs();
  let db;

  try {
    const data = await fs.readFile(DB_PATH);
    db = new SQL.Database(data);
    console.log("Loaded existing database.");
  } catch (err) {
    console.log("Creating new database...");
    db = new SQL.Database();
    await createSchema(db);
    await seedData(db);
    await saveDb(db);
  }
  
  const originalRun = db.run.bind(db);
  db.run = (...args) => {
    const res = originalRun(...args);
    saveDb(db).catch(console.error);
    return res;
  };
  
  const originalExec = db.exec.bind(db);
  db.exec = (...args) => {
    const res = originalExec(...args);
    saveDb(db).catch(console.error);
    return res;
  };
  
  return db;
}

export async function saveDb(db) {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DB_PATH, Buffer.from(data));
}

export let dbInstance = null;
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await initDb();
  }
  return dbInstance;
}

async function createSchema(db) {
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        wallet_address TEXT UNIQUE,
        display_name TEXT,
        avatar_seed TEXT,
        execution_score REAL DEFAULT 50,
        milestones_created INT DEFAULT 0,
        milestones_completed INT DEFAULT 0,
        milestones_failed INT DEFAULT 0,
        total_staked REAL DEFAULT 0,
        total_earned REAL DEFAULT 0,
        created_at TEXT
      );
      
      CREATE TABLE milestones (
        id TEXT PRIMARY KEY,
        creator_wallet TEXT,
        title TEXT,
        description TEXT,
        proof_requirements TEXT,
        token_name TEXT,
        token_ticker TEXT,
        token_contract TEXT,
        pool_contract TEXT,
        total_supply REAL,
        status TEXT DEFAULT 'active',
        deadline TEXT,
        created_at TEXT,
        resolved_at TEXT,
        resolution TEXT,
        ai_confidence REAL,
        tx_hash TEXT,
        factory_id INT
      );
      
      CREATE TABLE bets (
        id TEXT PRIMARY KEY,
        user_wallet TEXT,
        milestone_id TEXT,
        side TEXT,
        amount REAL,
        tx_hash TEXT,
        placed_at TEXT
      );
      
      CREATE TABLE proofs (
        id TEXT PRIMARY KEY,
        milestone_id TEXT,
        type TEXT,
        content TEXT,
        file_path TEXT,
        ai_score REAL,
        ai_analysis TEXT,
        submitted_at TEXT
      );
      
      CREATE TABLE reputation_events (
        id TEXT PRIMARY KEY,
        user_wallet TEXT,
        event_type TEXT,
        score_delta REAL,
        reason TEXT,
        created_at TEXT
      );
    `);
}

async function seedData(db) {
  const users = [
    ["u1", "0xdemo111111111111111111111111111111111111", "Alice Runner", "seed1", 85.5, 3, 2, 0, 500, 750, new Date().toISOString()],
    ["u2", "0xdemo222222222222222222222222222222222222", "Bob Builder", "seed2", 45.0, 5, 1, 3, 1000, -200, new Date().toISOString()],
    ["u3", "0xdemo333333333333333333333333333333333333", "Charlie Coder", "seed3", 60.0, 1, 1, 0, 100, 150, new Date().toISOString()],
    ["u4", "0xdemo444444444444444444444444444444444444", "Diana Dreamer", "seed4", 50.0, 0, 0, 0, 0, 0, new Date().toISOString()],
    ["u5", "0xdemo555555555555555555555555555555555555", "Eve Exerciser", "seed5", 95.0, 10, 9, 1, 5000, 8000, new Date().toISOString()],
  ];
  
  users.forEach(u => {
    db.run("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?)", u);
  });
  
  const now = new Date();
  const tmrw = new Date(now.getTime() + 86400000).toISOString();
  const past = new Date(now.getTime() - 86400000).toISOString();
  
  const milestones = [
    ["m1", "0xdemo111111111111111111111111111111111111", "Run a 5K under 25 mins", "I will run a 5K on Strava in under 25 minutes by tomorrow.", "Strava link or GPS screenshot", "AliceRun", "ARUN", "0xcontract1", "0xpool1", 1000000, "active", tmrw, now.toISOString(), null, null, null, "0xtx1", 1],
    ["m2", "0xdemo222222222222222222222222222222222222", "Deploy Smart Contract", "Deploying the v1 token contract to mainnet.", "Etherscan link", "BobDeploy", "BDEP", "0xcontract2", "0xpool2", 1000000, "active", tmrw, now.toISOString(), null, null, null, "0xtx2", 2],
    ["m3", "0xdemo333333333333333333333333333333333333", "Read 1 Book", "Finish reading 'Dune'.", "Photo of finished book", "ReadDune", "DUNE", "0xcontract3", "0xpool3", 1000000, "proof-submitted", tmrw, past, null, null, null, "0xtx3", 3],
    ["m4", "0xdemo555555555555555555555555555555555555", "100 Pushups", "Do 100 pushups in one set.", "Video recording", "EvePush", "PUSH", "0xcontract4", "0xpool4", 1000000, "resolved", tmrw, past, past, "YES", 92.5, "0xtx4", 4],
    ["m5", "0xdemo222222222222222222222222222222222222", "Wake up at 5AM", "Wake up at 5AM local time for 3 days.", "Photo of clock", "WakeEarly", "WAKE", "0xcontract5", "0xpool5", 1000000, "resolved", past, past, past, "NO", 12.0, "0xtx5", 5],
    ["m6", "0xdemo444444444444444444444444444444444444", "Learn Rust", "Complete Rustlings.", "Screenshot of 100% completion", "RustLearn", "RUST", "0xcontract6", "0xpool6", 1000000, "expired", past, past, null, null, null, "0xtx6", 6]
  ];
  
  milestones.forEach(m => {
    db.run("INSERT INTO milestones VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", m);
  });
  
  const bets = [
    ["b1", "0xdemo222222222222222222222222222222222222", "m1", "NO", 50, "0xtxb1", now.toISOString()],
    ["b2", "0xdemo333333333333333333333333333333333333", "m1", "YES", 100, "0xtxb2", now.toISOString()],
    ["b3", "0xdemo444444444444444444444444444444444444", "m2", "NO", 200, "0xtxb3", now.toISOString()],
    ["b4", "0xdemo111111111111111111111111111111111111", "m3", "YES", 75, "0xtxb4", now.toISOString()],
    ["b5", "0xdemo555555555555555555555555555555555555", "m4", "YES", 300, "0xtxb5", now.toISOString()],
  ];
  
  bets.forEach(b => {
    db.run("INSERT INTO bets VALUES (?,?,?,?,?,?,?)", b);
  });
  
  const proofs = [
    ["p1", "m3", "image", "Here is the book!", "uploads/proof_m3.jpg", 85.0, "Image shows Dune book completed.", now.toISOString()],
    ["p2", "m4", "video", "Pushups video link", "uploads/proof_m4.mp4", 95.0, "Video clearly shows 100 continuous pushups.", past],
    ["p3", "m5", "image", "Missed it", "uploads/proof_m5.jpg", 15.0, "Clock shows 7:30 AM.", past]
  ];
  
  proofs.forEach(p => {
    db.run("INSERT INTO proofs VALUES (?,?,?,?,?,?,?,?)", p);
  });
  
  const repEvents = [
    ["r1", "0xdemo555555555555555555555555555555555555", "milestone_completed", 20.0, "Completed 100 Pushups", past],
    ["r2", "0xdemo222222222222222222222222222222222222", "milestone_failed", -15.0, "Failed to wake up at 5AM", past],
  ];
  
  repEvents.forEach(r => {
    db.run("INSERT INTO reputation_events VALUES (?,?,?,?,?,?)", r);
  });
}
