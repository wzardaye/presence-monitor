const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// In Vercel, __dirname inside the api/ folder refers to the api/ folder itself.
// We use '..' to go up one level to the root directory where your files are.
const ROOT_DIR = path.join(__dirname, '..'); 
const DATA_FILE = path.join(ROOT_DIR, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to read data from data.json
function readData() {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error("Error reading data.json:", err);
    return { people: [], areas: [], lastUpdated: new Date().toISOString() };
  }
}

// Helper function to write data back to data.json
function writeData(data) {
  data.lastUpdated = new Date().toISOString(); 
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Note for Vercel: Writing files directly to the file system will fail in production
    // because Serverless functions are read-only. 
    console.error("Error writing data.json. Note: Vercel is read-only.", err);
  }
}

// Endpoint: Fetch all data
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// Endpoint: Toggle present/absent status
app.post('/api/presence', (req, res) => {
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
app.post('/api/move', (req, res) => {
  const { id, areaId } = req.body;
  const data = readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    // If areaId is empty string, they are being removed from an area (Idle)
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

/* Endpoint to toggle shift (Shift 1 / Shift 2) */
app.post('/api/shift', (req, res) => {
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

// Export the app for Vercel Serverless Function wrapper
module.exports = app;const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// In Vercel, __dirname inside the api/ folder refers to the api/ folder itself.
// We use '..' to go up one level to the root directory where your files are.
const ROOT_DIR = path.join(__dirname, '..'); 
const DATA_FILE = path.join(ROOT_DIR, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(ROOT_DIR, 'images')));

app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'workplace_presence_monitor_website.html'));
});
app.get('/control', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'control_panel_monitor_integration_frontend_only.html'));
});

// (Drag and Drop UI) loads group_assignment.html
app.get('/map', (req, res) => {A
  res.sendFile(path.join(ROOT_DIR, 'group_assignment_panel.html'));
});

// Helper function to read data from data.json
function readData() {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error("Error reading data.json:", err);
    return { people: [], areas: [], lastUpdated: new Date().toISOString() };
  }
}

// Helper function to write data back to data.json
function writeData(data) {
  data.lastUpdated = new Date().toISOString(); 
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Note for Vercel: Writing files directly to the file system will fail in production
    // because Serverless functions are read-only. 
    console.error("Error writing data.json. Note: Vercel is read-only.", err);
  }
}

// Endpoint: Fetch all data
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// Endpoint: Toggle present/absent status
app.post('/api/presence', (req, res) => {
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
app.post('/api/move', (req, res) => {
  const { id, areaId } = req.body;
  const data = readData();
  
  const person = data.people.find(p => p.id === id);
  if (person) {
    // If areaId is empty string, they are being removed from an area (Idle)
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

/* Endpoint to toggle shift (Shift 1 / Shift 2) */
app.post('/api/shift', (req, res) => {
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

// --- VERCEL SPECIFIC EXPORT ---
// Only listen to port if we are testing locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Control Panel: http://localhost:${PORT}/control`);
    console.log(`Tasking Map: http://localhost:${PORT}/map`);
  });
}

// Export the app for Vercel Serverless Function wrapper
module.exports = app;
