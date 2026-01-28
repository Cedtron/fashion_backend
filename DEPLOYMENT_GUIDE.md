# EC2 Cross-Instance Image Access Setup

## What I Fixed

1. **CORS Configuration**: Properly configured for cross-instance access
2. **Static File Serving**: Enhanced with proper headers for public access
3. **Path Resolution**: Fixed for production environment
4. **Health Check**: Added endpoints to test image access

## Files Modified

- `src/main.ts` - Enhanced CORS and static file serving
- `.env.production` - Added CORS origins configuration
- `src/health/` - Added health check endpoints
- `package.json` - Fixed Windows build compatibility

## Deployment Steps

### 1. On Your Backend EC2 Instance:

```bash
# Copy your files to EC2
# Update .env.production with your actual backend URL

# Install dependencies
npm install

# Build the project
npm run build

# Start in production
NODE_ENV=production npm run start:prod
```

### 2. Update .env.production:

Replace `BACKEND_URL=http://your-backend-ec2-url:3000` with your actual backend EC2 URL.

### 3. Test Image Access:

After deployment, test these URLs from your frontend:

```
# Health check
GET http://your-backend-ec2:3000/health/uploads

# Sample image
GET http://your-backend-ec2:3000/uploads/stock/1765557885825-711397389.jpg
```

### 4. Frontend Integration:

In your frontend, use full URLs for images:

```javascript
const imageUrl = `http://your-backend-ec2:3000/uploads/stock/${filename}`;
```

## Security Notes

- Images are now publicly accessible (no authentication required)
- CORS is configured for your specific frontend domain
- Cache headers are set for better performance

## PM2 Commands (if using PM2):

```bash
# Start
pm2 start dist/main.js --name "fashion-house-api"

# Restart after changes
pm2 restart fashion-house-api

# View logs
pm2 logs fashion-house-api
```

## Troubleshooting

1. **Images not loading**: Check `/health/uploads` endpoint
2. **CORS errors**: Verify CORS_ORIGIN in .env.production
3. **404 errors**: Ensure uploads directory exists in production