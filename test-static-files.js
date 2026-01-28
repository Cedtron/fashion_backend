// Quick test script to verify static file serving
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Test static file serving like NestJS does
const uploadsPath = path.join(__dirname, 'uploads');
console.log(`Testing static files from: ${uploadsPath}`);

// Check if directory exists
if (fs.existsSync(uploadsPath)) {
  console.log('✅ Uploads directory exists');
  
  const stockPath = path.join(uploadsPath, 'stock');
  if (fs.existsSync(stockPath)) {
    const files = fs.readdirSync(stockPath);
    console.log(`✅ Stock directory has ${files.length} files`);
    console.log('Sample files:', files.slice(0, 3));
    
    // Serve static files
    app.use('/uploads', express.static(uploadsPath));
    
    app.get('/test', (req, res) => {
      res.json({
        message: 'Static file test server',
        uploadsPath,
        stockFiles: files.slice(0, 5),
        testUrl: files.length > 0 ? `/uploads/stock/${files[0]}` : null
      });
    });
    
    app.listen(port, () => {
      console.log(`Test server running on http://localhost:${port}`);
      console.log(`Test endpoint: http://localhost:${port}/test`);
      if (files.length > 0) {
        console.log(`Test image: http://localhost:${port}/uploads/stock/${files[0]}`);
      }
    });
  } else {
    console.log('❌ Stock directory not found');
  }
} else {
  console.log('❌ Uploads directory not found');
}