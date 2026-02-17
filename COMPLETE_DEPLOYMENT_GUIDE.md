# Complete Deployment Guide: NetShield on Vercel + MongoDB Atlas

## Table of Contents
1. [Overview](#overview)
2. [Part 1: MongoDB Atlas Setup](#part-1-mongodb-atlas-setup)
3. [Part 2: Save Code to GitHub](#part-2-save-code-to-github)
4. [Part 3: Deploy Backend to Vercel](#part-3-deploy-backend-to-vercel)
5. [Part 4: Deploy Frontend to Vercel](#part-4-deploy-frontend-to-vercel)
6. [Part 5: Connect Everything](#part-5-connect-everything)
7. [Part 6: Custom Domain Setup](#part-6-custom-domain-setup)
8. [Part 7: Testing Your Deployment](#part-7-testing-your-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Overview

You will deploy:
- **MongoDB Atlas** - Free cloud database (512MB)
- **Vercel Backend** - FastAPI as serverless functions
- **Vercel Frontend** - React application

**Total Cost: $0/month** using free tiers

**Time Required: ~30 minutes**

---

## Part 1: MongoDB Atlas Setup

### Step 1.1: Create MongoDB Atlas Account

1. Open your browser and go to: **https://www.mongodb.com/atlas**

2. Click the green **"Try Free"** button

3. Sign up using one of these options:
   - Google account (fastest)
   - GitHub account
   - Email and password

4. Fill in the welcome survey (or click "Skip")

### Step 1.2: Create Your First Cluster

1. After signing in, you'll see **"Deploy your database"**

2. Select **"M0 FREE"** tier (rightmost option)
   - This gives you 512MB storage for free forever

3. Choose your cloud provider:
   - **AWS** (recommended) ✓
   - Google Cloud
   - Azure

4. Choose region closest to your users:
   - For Europe: `eu-west-1 (Ireland)` or `eu-central-1 (Frankfurt)`
   - For US: `us-east-1 (Virginia)` or `us-west-2 (Oregon)`
   - For Asia: `ap-southeast-1 (Singapore)`

5. Cluster Name: `netshield-cluster` (or leave default)

6. Click **"Create Deployment"** (takes 3-5 minutes)

### Step 1.3: Create Database User

While the cluster is being created, you'll see a security setup screen:

1. **Authentication Method**: Select "Username and Password"

2. **Username**: Enter `netshield_admin`

3. **Password**: 
   - Click **"Autogenerate Secure Password"**
   - **IMPORTANT: Click the "Copy" button and save this password somewhere safe!**
   - You'll need this for the connection string

4. Click **"Create User"**

### Step 1.4: Configure Network Access

1. Scroll down to **"Where would you like to connect from?"**

2. Select **"My Local Environment"** 

3. Click **"Add My Current IP Address"** (for testing)

4. **IMPORTANT**: Also click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` to the allowed list
   - Required for Vercel to connect to your database

5. Click **"Finish and Close"**

### Step 1.5: Get Your Connection String

1. Once cluster is ready, click **"Connect"** button

2. Select **"Drivers"**

3. Driver: **Python** | Version: **3.12 or later**

4. You'll see a connection string like:
   ```
   mongodb+srv://netshield_admin:<password>@netshield-cluster.abc123.mongodb.net/?retryWrites=true&w=majority&appName=netshield-cluster
   ```

5. **Modify this string:**
   - Replace `<password>` with your actual password (from Step 1.3)
   - Add database name `vasilisnetshield` before the `?`
   
   **Final string should look like:**
   ```
   mongodb+srv://netshield_admin:YourActualPassword123@netshield-cluster.abc123.mongodb.net/vasilisnetshield?retryWrites=true&w=majority&appName=netshield-cluster
   ```

6. **Save this connection string - you'll need it for Vercel!**

---

## Part 2: Save Code to GitHub

### Step 2.1: Push Code to GitHub

1. In the Emergent chat interface, look at the **bottom input area**

2. Find the **"Save to GitHub"** button (looks like a GitHub icon)

3. Click it

4. If not connected, authorize Emergent to access your GitHub

5. Choose:
   - **Create new repository**: `netshield-security-training`
   - Or select an existing repository

6. Click **"Save"** or **"Push"**

7. Wait for confirmation that code was pushed

### Step 2.2: Verify on GitHub

1. Go to **https://github.com/YOUR_USERNAME/netshield-security-training**

2. Verify you see these folders:
   ```
   netshield-security-training/
   ├── backend/
   │   ├── api/
   │   ├── routes/
   │   ├── services/
   │   ├── server.py
   │   ├── requirements.txt
   │   └── vercel.json
   ├── frontend/
   │   ├── src/
   │   ├── public/
   │   ├── package.json
   │   └── vercel.json
   └── README.md
   ```

---

## Part 3: Deploy Backend to Vercel

### Step 3.1: Create Vercel Account

1. Go to **https://vercel.com**

2. Click **"Sign Up"**

3. Choose **"Continue with GitHub"** (recommended)
   - This links your GitHub repos automatically

4. Authorize Vercel to access your GitHub

### Step 3.2: Create Backend Project

1. Once logged in, click **"Add New..."** → **"Project"**

2. You'll see a list of your GitHub repos

3. Find **"netshield-security-training"** and click **"Import"**

4. **Configure Project:**

   | Setting | Value |
   |---------|-------|
   | Project Name | `netshield-api` |
   | Framework Preset | `Other` |
   | Root Directory | Click "Edit" → Type `backend` → Click outside to save |

### Step 3.3: Add Environment Variables

1. Scroll down to **"Environment Variables"**

2. Add each variable by typing the name, then the value, then clicking "Add":

   | NAME | VALUE |
   |------|-------|
   | `MONGO_URL` | `mongodb+srv://netshield_admin:YOUR_PASSWORD@netshield-cluster.abc123.mongodb.net/vasilisnetshield?retryWrites=true&w=majority` |
   | `DB_NAME` | `vasilisnetshield` |
   | `JWT_SECRET` | `NetShield2024SuperSecretKeyXYZ123ABCdef456GHI` |
   | `CORS_ORIGINS` | `https://netshield-app.vercel.app` |

   **For SendPulse SMTP (optional but recommended):**
   
   | NAME | VALUE |
   |------|-------|
   | `SMTP_HOST` | `smtp-pulse.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | `your-sendpulse-email@example.com` |
   | `SMTP_PASSWORD` | `your-sendpulse-password` |
   | `SMTP_USE_SSL` | `true` |

   > **Note**: Replace placeholder values with your actual credentials!

### Step 3.4: Deploy Backend

1. Click **"Deploy"**

2. Wait for the build (2-5 minutes)
   - You'll see build logs scrolling

3. If successful, you'll see **"Congratulations!"** with confetti 🎉

4. **Copy your backend URL:**
   - It will look like: `https://netshield-api.vercel.app`
   - Or: `https://netshield-api-yourusername.vercel.app`

### Step 3.5: Verify Backend Works

1. Open a new browser tab

2. Go to: `https://YOUR-BACKEND-URL/api/`

3. You should see:
   ```json
   {
     "message": "VasilisNetShield API",
     "version": "1.0.0"
   }
   ```

4. If you see this, your backend is working! ✅

---

## Part 4: Deploy Frontend to Vercel

### Step 4.1: Create Frontend Project

1. Go back to Vercel dashboard: **https://vercel.com/dashboard**

2. Click **"Add New..."** → **"Project"**

3. Import the **same** repository: **"netshield-security-training"**

4. **Configure Project:**

   | Setting | Value |
   |---------|-------|
   | Project Name | `netshield-app` |
   | Framework Preset | `Create React App` (auto-detected) |
   | Root Directory | Click "Edit" → Type `frontend` → Click outside |

### Step 4.2: Add Environment Variables

1. Scroll down to **"Environment Variables"**

2. Add this variable:

   | NAME | VALUE |
   |------|-------|
   | `REACT_APP_BACKEND_URL` | `https://netshield-api.vercel.app` |

   > **Important**: Use YOUR actual backend URL from Part 3!

### Step 4.3: Deploy Frontend

1. Click **"Deploy"**

2. Wait for build (1-3 minutes)

3. When done, you'll see your frontend URL:
   - Example: `https://netshield-app.vercel.app`

---

## Part 5: Connect Everything

### Step 5.1: Update Backend CORS

Now that you know your frontend URL, update the backend:

1. Go to Vercel Dashboard → Click on **"netshield-api"** project

2. Go to **"Settings"** tab (top navigation)

3. Click **"Environment Variables"** (left sidebar)

4. Find **`CORS_ORIGINS`** and click on it

5. Update the value to your **actual frontend URL**:
   ```
   https://netshield-app.vercel.app
   ```

6. Click **"Save"**

### Step 5.2: Redeploy Backend

1. Go to **"Deployments"** tab

2. Find the latest deployment

3. Click the **"..."** menu → **"Redeploy"**

4. Confirm by clicking **"Redeploy"**

5. Wait for deployment to complete

---

## Part 6: Custom Domain Setup

### Step 6.1: Add Domain to Frontend

1. Go to your **netshield-app** project in Vercel

2. Go to **"Settings"** → **"Domains"**

3. Type your domain: `app.vasilisnetshield.net`

4. Click **"Add"**

5. You'll see DNS configuration instructions:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

6. Go to your domain registrar (where you bought vasilisnetshield.net)

7. Add the DNS record shown

8. Wait for DNS propagation (5 minutes to 48 hours)

### Step 6.2: Add Domain to Backend

1. Go to your **netshield-api** project in Vercel

2. Go to **"Settings"** → **"Domains"**

3. Type: `api.vasilisnetshield.net`

4. Add the DNS record to your domain registrar

### Step 6.3: Update Environment Variables

After custom domains are working:

**Backend (netshield-api):**
- Update `CORS_ORIGINS` to `https://app.vasilisnetshield.net`

**Frontend (netshield-app):**
- Update `REACT_APP_BACKEND_URL` to `https://api.vasilisnetshield.net`

Redeploy both projects.

---

## Part 7: Testing Your Deployment

### Step 7.1: Test the Landing Page

1. Open: `https://netshield-app.vercel.app` (or your custom domain)

2. You should see the NetShield landing page with:
   - "Human + AI Powered Security Training" heading
   - Login/Register buttons
   - Your branding colors (teal, gold, cream)

### Step 7.2: Test Registration

1. Click **"Get Started"** or **"Register"**

2. Fill in:
   - Name: `Test Admin`
   - Email: `admin@yourdomain.com`
   - Password: `TestPassword123`

3. Click **"Register"**

4. You should be logged in and redirected to dashboard

5. **First user gets Super Admin role automatically!**

### Step 7.3: Test Admin Features

1. Check that you can access:
   - ✅ Dashboard
   - ✅ Organizations
   - ✅ Users
   - ✅ Phishing Sim
   - ✅ Ad Simulation
   - ✅ Training
   - ✅ Certificates

2. Create a test organization:
   - Go to Organizations → New Organization
   - Name: "Test Company"
   - Click Create

3. Create a phishing campaign:
   - Go to Phishing Sim → Templates tab
   - Click "Add Defaults" to add email templates
   - Go to Campaigns tab → New Campaign
   - Select organization, template, users
   - Launch campaign

---

## Troubleshooting

### Problem: "Function Timeout" or 504 Error

**Cause**: Vercel free tier has 10-second timeout

**Solutions**:
1. Optimize database queries (add indexes)
2. Upgrade to Vercel Pro ($20/mo) for 60-second timeout
3. Use Railway for backend instead (longer timeouts)

---

### Problem: CORS Error in Browser Console

**Cause**: Backend CORS_ORIGINS doesn't match frontend URL

**Solution**:
1. Go to Vercel → netshield-api → Settings → Environment Variables
2. Check `CORS_ORIGINS` matches your exact frontend URL
3. Include `https://` prefix
4. Redeploy backend

---

### Problem: "Cannot connect to database"

**Cause**: MongoDB Atlas network or credentials issue

**Solutions**:
1. Go to MongoDB Atlas → Network Access
2. Ensure `0.0.0.0/0` is in the allowed list
3. Check username/password are correct
4. Ensure password doesn't have special characters like `@`, `#`, `$`
   - If it does, URL-encode them (e.g., `@` becomes `%40`)

---

### Problem: Backend Build Fails on Vercel

**Cause**: Missing dependencies or wrong root directory

**Solutions**:
1. Check root directory is set to `backend`
2. Verify `requirements.txt` exists in `/backend`
3. Check build logs for specific error
4. Try adding: `python_version = "3.11"` to a `vercel.json` file

---

### Problem: Frontend Shows Blank Page

**Cause**: JavaScript error or wrong backend URL

**Solutions**:
1. Open browser DevTools (F12) → Console tab
2. Look for red error messages
3. Check `REACT_APP_BACKEND_URL` is correct
4. Verify backend is running (test /api/ endpoint)

---

### Problem: Emails Not Sending

**Cause**: SMTP not configured or wrong credentials

**Solutions**:
1. Verify SendPulse credentials are correct
2. Check SMTP_USE_SSL is `true` for port 465
3. Check backend logs in Vercel for SMTP errors
4. Test with a different email provider

---

## Environment Variables Reference

### Backend Variables (All Required Unless Noted)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `DB_NAME` | Database name | `vasilisnetshield` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | `YourRandomSecretKey123...` |
| `CORS_ORIGINS` | Frontend URL | `https://netshield-app.vercel.app` |
| `SMTP_HOST` | SMTP server (optional) | `smtp-pulse.com` |
| `SMTP_PORT` | SMTP port (optional) | `465` |
| `SMTP_USER` | SMTP username (optional) | `email@example.com` |
| `SMTP_PASSWORD` | SMTP password (optional) | `your-password` |
| `SMTP_USE_SSL` | Use SSL for SMTP (optional) | `true` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `https://netshield-api.vercel.app` |

---

## Success Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password saved
- [ ] Network access allows 0.0.0.0/0
- [ ] Connection string saved with password and database name
- [ ] Code pushed to GitHub
- [ ] Backend deployed to Vercel
- [ ] Backend `/api/` endpoint returns JSON
- [ ] Frontend deployed to Vercel
- [ ] Frontend loads landing page
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard accessible
- [ ] CORS_ORIGINS updated with actual frontend URL
- [ ] (Optional) Custom domains configured

---

## Need More Help?

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/getting-started/
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI on Vercel**: https://vercel.com/docs/functions/runtimes/python

---

*Guide created for NetShield Security Training Platform*
*Last Updated: February 2026*
