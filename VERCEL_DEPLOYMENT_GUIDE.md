# Vercel Deployment Guide - Both Frontend & Backend on Vercel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                               │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Frontend Project   │    │     Backend Project         │ │
│  │                      │    │                             │ │
│  │  • React App         │───▶│  • FastAPI (Serverless)    │ │
│  │  • netshield.vercel  │    │  • api.netshield.vercel    │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                         │                    │
└─────────────────────────────────────────│────────────────────┘
                                          ▼
                              ┌─────────────────────┐
                              │   MONGODB ATLAS     │
                              │   (Free Database)   │
                              └─────────────────────┘
```

---

## Step 1: MongoDB Atlas Setup (Same as before)

1. Go to **https://mongodb.com/atlas** → Sign up free
2. Create **M0 (Free)** cluster
3. Create database user: `netshield_admin` + secure password
4. Network Access → **Allow from anywhere** (`0.0.0.0/0`)
5. Get connection string:
   ```
   mongodb+srv://netshield_admin:PASSWORD@cluster.xxxxx.mongodb.net/vasilisnetshield?retryWrites=true&w=majority
   ```

---

## Step 2: Save to GitHub

1. Click **"Save to GitHub"** button in Emergent chat
2. Create new repository: `netshield-security-training`
3. Push all code

---

## Step 3: Deploy Backend to Vercel

### 3.1 Create Backend Project

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your `netshield-security-training` repo
4. Configure:
   - **Project Name**: `netshield-api`
   - **Framework Preset**: Other
   - **Root Directory**: `backend`

### 3.2 Set Environment Variables

Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `MONGO_URL` | `mongodb+srv://netshield_admin:YOUR_PASSWORD@cluster.xxxxx.mongodb.net/vasilisnetshield?retryWrites=true&w=majority` |
| `DB_NAME` | `vasilisnetshield` |
| `JWT_SECRET` | `your-random-secret-key-at-least-32-chars` |
| `CORS_ORIGINS` | `https://netshield.vercel.app` (update after frontend deploy) |
| `SMTP_HOST` | `smtp-pulse.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Your SendPulse email |
| `SMTP_PASSWORD` | Your SendPulse password |
| `SMTP_USE_SSL` | `true` |

### 3.3 Deploy

1. Click **"Deploy"**
2. Wait for build (2-3 min)
3. Copy your backend URL: `https://netshield-api.vercel.app`

### 3.4 Test Backend

Open: `https://netshield-api.vercel.app/api/`

Should see:
```json
{"message":"VasilisNetShield API","version":"1.0.0"}
```

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Frontend Project

1. In Vercel, click **"Add New..."** → **"Project"**
2. Import the **same** `netshield-security-training` repo
3. Configure:
   - **Project Name**: `netshield` (or `netshield-app`)
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`

### 4.2 Set Environment Variables

| Name | Value |
|------|-------|
| `REACT_APP_BACKEND_URL` | `https://netshield-api.vercel.app` |

### 4.3 Deploy

1. Click **"Deploy"**
2. Get your frontend URL: `https://netshield.vercel.app`

---

## Step 5: Update CORS

Go back to your **backend project** in Vercel:

1. Settings → Environment Variables
2. Update `CORS_ORIGINS` to: `https://netshield.vercel.app`
3. Redeploy (Deployments → ... → Redeploy)

---

## Step 6: Custom Domain (Optional)

### For Frontend (app.vasilisnetshield.net):
1. Backend Project → Settings → Domains
2. Add: `app.vasilisnetshield.net`
3. Add DNS records in your domain registrar

### For Backend (api.vasilisnetshield.net):
1. Frontend Project → Settings → Domains
2. Add: `api.vasilisnetshield.net`
3. Add DNS records

Then update:
- Frontend's `REACT_APP_BACKEND_URL` → `https://api.vasilisnetshield.net`
- Backend's `CORS_ORIGINS` → `https://app.vasilisnetshield.net`

---

## Environment Variables Summary

### Backend (netshield-api on Vercel)

```
MONGO_URL=mongodb+srv://netshield_admin:PASSWORD@cluster.mongodb.net/vasilisnetshield?retryWrites=true&w=majority
DB_NAME=vasilisnetshield
JWT_SECRET=your-super-secret-random-key-32-chars-minimum
CORS_ORIGINS=https://netshield.vercel.app
SMTP_HOST=smtp-pulse.com
SMTP_PORT=465
SMTP_USER=your-sendpulse-email
SMTP_PASSWORD=your-sendpulse-password
SMTP_USE_SSL=true
```

### Frontend (netshield on Vercel)

```
REACT_APP_BACKEND_URL=https://netshield-api.vercel.app
```

---

## Troubleshooting

### "Function Timeout" errors
- Vercel serverless has 10s timeout on free tier
- Large database queries may timeout
- Consider upgrading to Pro ($20/mo) for 60s timeout

### CORS errors
- Ensure `CORS_ORIGINS` matches your exact frontend URL
- Include `https://` in the URL
- Redeploy backend after changing

### Database connection issues
- Check MongoDB Atlas Network Access allows `0.0.0.0/0`
- Verify connection string is correct
- Check password has no special chars that need URL encoding

### Build failures
- Check Vercel build logs
- Ensure `requirements.txt` is in `/backend`
- Ensure `package.json` is in `/frontend`

---

## Cost: $0/month

| Service | Free Tier |
|---------|-----------|
| Vercel (Frontend) | 100GB bandwidth |
| Vercel (Backend) | 100GB-hours serverless |
| MongoDB Atlas | 512MB storage |

---

*Last Updated: February 2026*
