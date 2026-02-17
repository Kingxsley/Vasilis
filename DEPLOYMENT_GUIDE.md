# NetShield Self-Hosting Deployment Guide

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│     VERCEL          │     │  RAILWAY / RENDER   │     │   MONGODB ATLAS     │
│   (Frontend)        │────▶│   (Backend API)     │────▶│    (Database)       │
│                     │     │                     │     │                     │
│ • React App         │     │ • FastAPI           │     │ • Free 512MB        │
│ • Free tier         │     │ • Free tier         │     │ • Auto backups      │
│ • CDN included      │     │ • $5/mo for more    │     │ • Global clusters   │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## Step 1: MongoDB Atlas Setup (Free Database)

### 1.1 Create Account & Cluster

1. Go to **https://www.mongodb.com/atlas**
2. Click **"Try Free"** → Sign up with Google or email
3. Choose **"FREE" tier** (M0 Sandbox)
4. Select cloud provider: **AWS** (recommended)
5. Select region: **Choose closest to your users**
6. Cluster name: `netshield-cluster`
7. Click **"Create Cluster"** (takes 3-5 minutes)

### 1.2 Configure Database Access

1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication: **Password**
4. Username: `netshield_admin`
5. Password: Click **"Autogenerate Secure Password"** → **COPY THIS PASSWORD!**
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### 1.3 Configure Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for Railway/Render)
   - This adds `0.0.0.0/0`
4. Click **"Confirm"**

### 1.4 Get Connection String

1. Go to **"Database"** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Python**, Version: **3.12 or later**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://netshield_admin:<password>@netshield-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with your actual password from step 1.2
6. **Add database name** before the `?`:
   ```
   mongodb+srv://netshield_admin:YOUR_PASSWORD@netshield-cluster.xxxxx.mongodb.net/vasilisnetshield?retryWrites=true&w=majority
   ```

**Save this connection string - you'll need it for the backend!**

---

## Step 2: Deploy Backend to Railway (Recommended)

### 2.1 Create Railway Account

1. Go to **https://railway.app**
2. Sign up with **GitHub** (easiest)
3. Authorize Railway to access your repositories

### 2.2 Deploy Backend

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your **netshield** repository
4. Railway will detect the monorepo. Click **"Add Service"** → **"GitHub Repo"**
5. In settings, set **Root Directory**: `/backend`

### 2.3 Configure Environment Variables

Go to your service → **"Variables"** tab → Add these:

| Variable | Value |
|----------|-------|
| `MONGO_URL` | `mongodb+srv://netshield_admin:PASSWORD@cluster.mongodb.net/vasilisnetshield?retryWrites=true&w=majority` |
| `DB_NAME` | `vasilisnetshield` |
| `JWT_SECRET` | `your-super-secret-key-change-this-to-random-string` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` (update after Vercel deploy) |
| `SMTP_HOST` | `smtp-pulse.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `your-sendpulse-email` |
| `SMTP_PASSWORD` | `your-sendpulse-password` |
| `SMTP_USE_SSL` | `true` |

### 2.4 Deploy & Get URL

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Go to **"Settings"** → **"Networking"** → **"Generate Domain"**
4. Copy your URL: `https://netshield-api-production.up.railway.app`

**Test it:** Open `https://YOUR-RAILWAY-URL/api/` - should show `{"message":"VasilisNetShield API","version":"1.0.0"}`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to **https://vercel.com**
2. Sign up with **GitHub**
3. Authorize Vercel

### 3.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Select your **netshield** repository
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (or `yarn build`)
   - **Output Directory**: `build`

### 3.3 Configure Environment Variables

Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `REACT_APP_BACKEND_URL` | `https://your-railway-url.up.railway.app` |

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for build (1-2 minutes)
3. Get your URL: `https://netshield-xxx.vercel.app`

---

## Step 4: Final Configuration

### 4.1 Update CORS on Railway

Go back to Railway → Variables → Update:
```
CORS_ORIGINS=https://your-app.vercel.app
```

Redeploy the backend.

### 4.2 Custom Domain (Optional)

**Vercel (Frontend):**
1. Go to Project → Settings → Domains
2. Add `app.vasilisnetshield.net`
3. Add DNS records as shown

**Railway (Backend):**
1. Go to Service → Settings → Networking → Custom Domain
2. Add `api.vasilisnetshield.net`
3. Add DNS records as shown

---

## Environment Variables Summary

### Backend (Railway/Render)

```env
# Required
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/vasilisnetshield?retryWrites=true&w=majority
DB_NAME=vasilisnetshield
JWT_SECRET=generate-a-random-64-character-string
CORS_ORIGINS=https://your-frontend-domain.vercel.app

# SendPulse SMTP (for real email sending)
SMTP_HOST=smtp-pulse.com
SMTP_PORT=465
SMTP_USER=your-sendpulse-email
SMTP_PASSWORD=your-sendpulse-password
SMTP_USE_SSL=true

# Optional (for AI features)
OPENAI_API_KEY=sk-your-openai-key
```

### Frontend (Vercel)

```env
REACT_APP_BACKEND_URL=https://your-backend-domain.railway.app
```

---

## Alternative: Render.com Deployment

If Railway doesn't work, use Render.com:

1. Go to **https://render.com** → Sign up with GitHub
2. Click **"New"** → **"Web Service"**
3. Connect your repo, set root directory to `/backend`
4. Render will auto-detect `render.yaml`
5. Add environment variables (same as Railway)
6. Deploy!

---

## Troubleshooting

### Backend won't start
- Check Railway/Render logs
- Verify MONGO_URL is correct
- Ensure all required env vars are set

### Frontend can't connect to backend
- Check REACT_APP_BACKEND_URL is correct
- Verify CORS_ORIGINS includes your frontend URL
- Check browser console for errors

### Database connection fails
- Verify MongoDB Atlas Network Access allows `0.0.0.0/0`
- Check password doesn't have special characters that need encoding
- Ensure database name is in the connection string

### Emails not sending
- Verify SendPulse credentials
- Check SMTP_USE_SSL is `true` for port 465
- Look at backend logs for SMTP errors

---

## Cost Summary (Free Tiers)

| Service | Free Tier | Paid |
|---------|-----------|------|
| MongoDB Atlas | 512MB storage | $9/mo for 2GB |
| Railway | 500 hours/month | $5/mo unlimited |
| Vercel | 100GB bandwidth | $20/mo for more |
| **Total** | **$0/month** | ~$35/month |

---

## Need Help?

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/

---

*Last Updated: February 17, 2026*
