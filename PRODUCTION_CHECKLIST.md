# Production Deployment Checklist

## Issue: 404 Error for Static Files

The file `1769468545410-633389477.jpg` doesn't exist in your local uploads directory, which means:
1. It was uploaded directly on production server
2. Static file serving might not be configured correctly on production

## Steps to Fix:

### 1. Check if uploads directory exists on production server:

```bash
# SSH into your EC2 backend instance
ssh -i your-key.pem ubuntu@3.91.48.66

# Check if uploads directory exists
ls -la uploads/
ls -la uploads/stock/

# Look for the specific file
ls -la uploads/stock/ | grep 1769468545410-633389477
```

### 2. If uploads directory doesn't exist, create it:

```bash
mkdir -p uploads/stock
mkdir -p uploads/search
mkdir -p uploads/users
chmod 755 uploads
chmod 755 uploads/stock
chmod 755 uploads/search
chmod 755 uploads/users
```

### 3. Deploy the updated code:

```bash
# Build locally
npm run build

# Copy dist folder to production
scp -r dist/ ubuntu@3.91.48.66:/path/to/your/app/

# Or if using git:
git add .
git commit -m "Fix static file serving"
git push
# Then on server: git pull && npm run build
```

### 4. Test the health endpoint first:

```bash
# Test health check
curl http://3.91.48.66:3000/health/uploads
```

This should return information about your uploads directory and available files.

### 5. Check server logs:

```bash
# If using PM2
pm2 logs fashion-house-api

# Look for these log messages:
# - "Serving static files from: /path/to/uploads"
# - "✅ Uploads directory exists"
# - "✅ Stock directory has X files"
```

### 6. Test with an existing file:

Instead of `1769468545410-633389477.jpg`, try with a file that exists:
```
http://3.91.48.66:3000/uploads/stock/1765557885825-711397389.jpg
```

## Environment Variables Check:

Make sure your `.env.production` is properly loaded:

```bash
# On production server
cat .env.production
# Should show NODE_ENV=production
```

## PM2 Restart:

```bash
pm2 restart all
# or
pm2 restart fashion-house-api
```

## Quick Debug Commands:

```bash
# Check if the process is running
pm2 status

# Check what port it's listening on
netstat -tlnp | grep 3000

# Test local file serving
curl http://localhost:3000/health/uploads

# Test external access
curl http://3.91.48.66:3000/health/uploads
```

## Expected Response from /health/uploads:

```json
{
  "uploadsPath": "/path/to/uploads",
  "stockPath": "/path/to/uploads/stock", 
  "uploadsExists": true,
  "stockExists": true,
  "stockFiles": ["file1.jpg", "file2.jpg"],
  "totalStockFiles": 15,
  "sampleImageUrl": "/uploads/stock/file1.jpg",
  "testUrls": ["/uploads/stock/file1.jpg", "/uploads/stock/file2.jpg"]
}
```

If any of these values are `false` or empty, that's your problem area.