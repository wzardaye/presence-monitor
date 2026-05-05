const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
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

// Helper functions
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(rawData);
    } else {
      console.warn("data.json not found, using empty default.");
      return { people: [], areas: [], lastUpdated: new Date().toISOString() };
    }
  } catch (err) {
    console.error("Error reading data.json:", err);
    return { people: [], areas: [], lastUpdated: new Date().toISOString() };
  }
}

function writeData(data) {
  data.lastUpdated = new Date().toISOString(); 
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Vercel filesystem is read-only. Data not saved permanently.", err.message);
  }
}

// ==========================================
// API Endpoints (Double-Mapped for Vercel Proxying)
// ==========================================

// Endpoint: Fetch all data
app.get(['/api/data', '/data'], (req, res) => {
  const data = readData();
  res.json(data);
});

// Endpoint: Toggle present/absent status
app.post(['/api/presence', '/presence'], (req, res) => {
  const { id, present } = req.body;
  const data = readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    person.present = present;
    if (!person.logs) person.logs = [];
    person.logs.push({
      time: new Date().toISOString(),
      action: present ? "Checked IN" : "Checked OUT"
    });
    writeData(data);
    res.json({ success: true, message: 'Presence updated' });
  } else {
    res.status(404).json({ success: false, error: 'Person not found' });
  }
});

// Endpoint: Move a person to a new area
app.post(['/api/move', '/move'], (req, res) => {
  const { id, areaId } = req.body;
  const data = readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    person.areas = areaId ? [areaId] : [];
    if (!person.logs) person.logs = [];
    person.logs.push({
      time: new Date().toISOString(),
      action: areaId ? `Moved to ${areaId}` : "Removed from Area (Idle)"
    });
    writeData(data);
    res.json({ success: true, message: 'Area updated' });
  } else {
    res.status(404).json({ success: false, error: 'Person not found' });
  }
});

// Endpoint: Toggle shift
app.post(['/api/shift', '/shift'], (req, res) => {
  const { id, shift } = req.body;
  const data = readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    person.shift = shift;
    if (!person.logs) person.logs = [];
    person.logs.push({
      time: new Date().toISOString(),
      action: `Shift changed to ${shift}`
    });
    writeData(data);
    res.json({ success: true, message: 'Shift updated' });
  } else {
    res.status(404).json({ success: false, error: 'Person not found' });
  }
});

// Catch-all debugger
app.get('*', (req, res) => {
  res.status(404).json({ error: `Express route not found: ${req.url}` });
});

module.exports = app;
