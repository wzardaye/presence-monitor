const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();

const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data.json');

// MongoDB Connection Setup
const MONGODB_URI = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside Vercel.");
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('presence_monitor_db'); 
  
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

// Middleware
app.use(cors());
app.use(express.json());

// Force Vercel and browsers to NEVER cache API requests
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.use('/images', express.static(path.join(ROOT_DIR, 'images')));

// Frontend HTML Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'workplace_presence_monitor_website.html'));
});

app.get('/control', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'control_panel_monitor_integration_frontend_only.html'));
});

app.get('/map', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'group_assignment_panel.html'));
});

// Helper functions for MongoDB
async function readData() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('app_data');
    
    const data = await collection.findOne({ documentId: 'main_data' });
    if (data) return data;

    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(rawData);
      await collection.insertOne({ documentId: 'main_data', ...parsed });
      return parsed;
    }
  } catch (err) {
    console.error("MongoDB Read Error:", err.message);
  }
  return { people: [], areas: [], lastUpdated: new Date().toISOString() };
}

async function writeData(data) {
  data.lastUpdated = new Date().toISOString(); 
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('app_data');
    
    await collection.updateOne(
      { documentId: 'main_data' },
      { $set: { people: data.people, areas: data.areas, lastUpdated: data.lastUpdated } },
      { upsert: true }
    );
  } catch (err) {
    console.error("MongoDB Write Error. Data not saved.", err);
  }
}

// ==========================================
// API Endpoints
// ==========================================

app.get(['/api/data', '/data'], async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post(['/api/presence', '/presence'], async (req, res) => {
  const { id, present, reason } = req.body;
  const data = await readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    person.present = present;
    
    // Save or clear absence reason
    if (!present) {
      person.absenceReason = reason || "Unspecified";
    } else {
      delete person.absenceReason;
      delete person.expectedReturn;
    }

    if (!person.logs) person.logs = [];
    person.logs.push({
      time: new Date().toISOString(),
      action: present ? "Checked IN" : `Checked OUT (Reason: ${person.absenceReason})`
    });
    
    await writeData(data);
    res.json({ success: true, message: 'Presence updated' });
  } else {
    res.status(404).json({ success: false, error: 'Person not found' });
  }
});

app.post(['/api/move', '/move'], async (req, res) => {
  const { id, areaId } = req.body;
  const data = await readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    person.areas = areaId ? [areaId] : [];
    if (!person.logs) person.logs = [];
    person.logs.push({
      time: new Date().toISOString(),
      action: areaId ? `Moved to ${areaId}` : "Removed from Area (Idle)"
    });
    await writeData(data);
    res.json({ success: true, message: 'Area updated' });
  } else {
    res.status(404).json({ success: false, error: 'Person not found' });
  }
});

app.post(['/api/shift', '/shift'], async (req, res) => {
  const { id, shift } = req.body;
  const data = await readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    person.shift = shift;
    if (!person.logs) person.logs = [];
    person.logs.push({
      time: new Date().toISOString(),
      action: `Shift changed to ${shift}`
    });
    await writeData(data);
    res.json({ success: true, message: 'Shift updated' });
  } else {
    res.status(404).json({ success: false, error: 'Person not found' });
  }
});

app.get('*', (req, res) => {
  res.status(404).json({ error: `Express route not found: ${req.url}` });
});

module.exports = app;
