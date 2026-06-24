const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const configDir = path.join(os.homedir(), '.config', 'moltbook');
const configPath = path.join(configDir, 'credentials.json');
const backupDir = path.join(os.homedir(), '.openclaw', '.credentials_backup');
const backupPath = path.join(backupDir, 'credentials.json');
const MOLTBOOK_API_URL = 'https://www.moltbook.com/api/v1';

function getJson(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function validateApiKey(apiKey) {
  if (!apiKey) return false;
  try {
    const res = await getJson(`${MOLTBOOK_API_URL}/agents/me`, {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    });
    return res && res.success === true;
  } catch (error) {
    return false;
  }
}

async function backup() {
  if (!fs.existsSync(configPath)) {
    console.log('No credentials file found to backup.');
    return false;
  }
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const creds = JSON.parse(content);
    if (!creds.api_key) {
      console.log('Credentials file is invalid (no api_key).');
      return false;
    }
    const isValid = await validateApiKey(creds.api_key);
    if (!isValid) {
      console.log('Credentials in config are invalid. Skipping backup.');
      return false;
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log(`Successfully backed up credentials to ${backupPath}`);
    return true;
  } catch (err) {
    console.error('Backup failed:', err.message);
    return false;
  }
}

async function restore() {
  if (!fs.existsSync(backupPath)) {
    console.log('No backup credentials file found to restore.');
    return false;
  }
  try {
    const content = fs.readFileSync(backupPath, 'utf8');
    const creds = JSON.parse(content);
    if (!creds.api_key) {
      console.log('Backup file is invalid (no api_key).');
      return false;
    }
    const isValid = await validateApiKey(creds.api_key);
    if (!isValid) {
      console.log('Backup credentials are invalid. Skipping restore.');
      return false;
    }
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, content, 'utf8');
    console.log(`Successfully restored credentials to ${configPath}`);
    return true;
  } catch (err) {
    console.error('Restore failed:', err.message);
    return false;
  }
}

async function auto() {
  let configExists = fs.existsSync(configPath);
  let configValid = false;
  let configApiKey = '';
  
  if (configExists) {
    try {
      const creds = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      configApiKey = creds.api_key;
      configValid = await validateApiKey(configApiKey);
    } catch (e) {}
  }

  if (configValid) {
    console.log('Config credentials are valid.');
    let backupValid = false;
    if (fs.existsSync(backupPath)) {
      try {
        const backupCreds = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        backupValid = (backupCreds.api_key === configApiKey);
      } catch (e) {}
    }
    if (!backupValid) {
      console.log('Backup is outdated or missing. Creating backup...');
      await backup();
    }
    console.log('System is healthy.');
    return;
  }

  console.log('Config credentials missing or invalid. Attempting recovery...');
  const restored = await restore();
  if (restored) {
    console.log('System recovered successfully.');
  } else {
    console.log('Recovery failed. Please set up credentials manually.');
    process.exit(1);
  }
}

const command = process.argv[2] || 'auto';
if (command === 'backup') {
  backup();
} else if (command === 'restore') {
  restore();
} else if (command === 'validate') {
  if (fs.existsSync(configPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      validateApiKey(creds.api_key).then(valid => {
        console.log(JSON.stringify({ valid, agent_name: creds.agent_name }));
        process.exit(valid ? 0 : 1);
      });
    } catch (e) {
      console.log(JSON.stringify({ valid: false, error: e.message }));
      process.exit(1);
    }
  } else {
    console.log(JSON.stringify({ valid: false, error: 'no config file' }));
    process.exit(1);
  }
} else {
  auto();
}
