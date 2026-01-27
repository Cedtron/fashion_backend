const fs = require('fs');
const path = require('path');

// Ensure uploads directories exist in production
const uploadDirs = [
  'uploads',
  'uploads/stock',
  'uploads/search', 
  'uploads/users'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
});

console.log('Upload directories verified');