# Deploy FFmpeg REST API to Railway

## 🚀 Quick Deploy (5 minutes)

### Step 1: Push to GitHub

```bash
# Create a new repository on GitHub (https://github.com/new)
# Name it something like: ffmpeg-rest-api

# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/ffmpeg-rest-api.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway

1. **Go to Railway**: [https://railway.app](https://railway.app)
2. **Sign in** with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your `ffmpeg-rest-api` repository
6. Railway will automatically detect the Dockerfile and start building

### Step 3: Add Redis Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will automatically create a Redis instance
4. The `REDIS_URL` will be automatically injected into your app

### Step 4: Configure Environment Variables

In your Railway project:

1. Click on your **ffmpeg-rest** service
2. Go to **"Variables"** tab
3. Add these variables:

```bash
STORAGE_MODE=stateless
WORKER_CONCURRENCY=5
```

**Note**: `PORT` and `REDIS_URL` are automatically set by Railway.

### Step 5: Deploy! 🎉

Railway will automatically build and deploy your app. The build process:

1. ✅ Installs FFmpeg (via Dockerfile)
2. ✅ Installs Node.js dependencies
3. ✅ Builds TypeScript to JavaScript
4. ✅ Starts both API server and worker

### Step 6: Test Your Deployment

Once deployed, Railway will give you a public URL like:
```
https://ffmpeg-rest-production.up.railway.app
```

Test it:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "storageMode": "stateless"
}
```

## 📊 Railway Configuration

Your `railway.json` is already configured:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js & node dist/worker.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 💰 Cost Estimation

Railway Pricing (as of 2026):

- **Starter Plan**: $5/month + usage
- **Includes**: $5 credit
- **Cost per GB egress**: $0.05/GB
- **Redis**: Included in plan

**Example Usage Cost**:
- 100 video conversions/month
- ~500MB output per conversion
- Total: 50GB egress = $2.50/month
- **Total Cost**: ~$7.50/month

## 🎯 Next Steps After Deployment

### 1. Test All Endpoints

```bash
# Set your Railway URL
RAILWAY_URL="https://your-app.railway.app"

# Test video conversion
curl -X POST $RAILWAY_URL/video/convert \
  -F "file=@video.mp4" \
  -F 'options={"videoBitrate":"1000k"}'

# Test frame extraction
curl -X POST $RAILWAY_URL/video/frames \
  -F "file=@video.mp4" \
  -F 'options={"timestamp":"00:00:03"}'
```

### 2. Monitor Your App

Railway provides:
- **Logs**: Real-time logs in the dashboard
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: History of all deployments

### 3. Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your custom domain
4. Add the CNAME record to your DNS provider

### 4. Scale Your App (Optional)

If you need more power:
1. Go to **Settings** → **Resources**
2. Upgrade to higher tier
3. Increase `WORKER_CONCURRENCY` for more parallel jobs

## 🔧 Troubleshooting

### Build Fails

**Issue**: FFmpeg not found
```
Solution: Make sure Dockerfile is using the correct base image
```

**Issue**: Out of memory during build
```
Solution: Railway provides 8GB RAM for builds by default
If still failing, reduce dependencies or optimize build
```

### Runtime Errors

**Issue**: Redis connection failed
```
Solution: Make sure Redis is added as a service
Check that REDIS_URL is set automatically
```

**Issue**: Worker not processing jobs
```
Solution: Check logs - both API and worker should be running
The Dockerfile starts both processes
```

**Issue**: Port already in use
```
Solution: Railway automatically sets PORT environment variable
Your app uses process.env.PORT (already configured)
```

## 📚 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **Project Repository**: Your GitHub repo
- **API Documentation**: `https://your-app.railway.app/api/docs`

## 🎬 Video Walkthrough

1. Create GitHub repo ✅
2. Push code ✅
3. Connect to Railway ✅
4. Add Redis ✅
5. Deploy ✅
6. Test API ✅

Your FFmpeg REST API is now live on Railway! 🚀

---

## Quick Commands Reference

```bash
# Push updates to Railway
git add .
git commit -m "Update: description"
git push

# Railway will auto-deploy on push

# View logs
railway logs

# Run commands in Railway environment
railway run bash
```

## Support

If you encounter issues:
1. Check Railway logs in dashboard
2. Verify environment variables
3. Ensure Redis is connected
4. Check the GitHub Issues on your repo

Good luck with your deployment! 🎉
