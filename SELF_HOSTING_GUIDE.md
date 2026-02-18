# VasilisNetShield - Self-Hosting Guide

## Prerequisites
- GitHub account
- Vercel account (free tier works)
- MongoDB Atlas account (free tier works)

---

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Vercel serverless)
5. Get your connection string - it looks like:
   ```
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/vasilisnetshield?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy Backend to Vercel

1. Fork/push this repo to your GitHub
2. Go to [Vercel](https://vercel.com) → New Project
3. Import your GitHub repo
4. **Important**: Set the Root Directory to `backend`
5. Add Environment Variables:
   | Variable | Value |
   |----------|-------|
   | `MONGO_URL` | Your MongoDB Atlas connection string |
   | `DB_NAME` | `vasilisnetshield` |
   | `JWT_SECRET` | A long random string (e.g., `my-super-secret-key-2024-xyz`) |
   | `CORS_ORIGINS` | `https://yourdomain.com,https://www.yourdomain.com` |

6. Deploy
7. Add your custom domain (e.g., `api.yourdomain.com`)

---

## Step 3: Deploy Frontend to Vercel

1. Create another Vercel project
2. Import the same GitHub repo
3. **Important**: Set the Root Directory to `frontend`
4. Add Environment Variables:
   | Variable | Value |
   |----------|-------|
   | `REACT_APP_BACKEND_URL` | `https://api.yourdomain.com` (your backend URL from Step 2) |

5. Deploy
6. Add your custom domain (e.g., `yourdomain.com`)

---

## Step 4: Test Your Deployment

1. Test backend health:
   ```
   curl https://api.yourdomain.com/api/health
   ```
   Should return: `{"status":"healthy","database":"connected",...}`

2. Visit your frontend and try to sign up

---

## Troubleshooting

### "Authentication failed" on signup/login
- Check `MONGO_URL` has the correct password (no `<>` brackets)
- Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check Vercel deployment logs for errors

### CORS errors
- Ensure `CORS_ORIGINS` includes your exact frontend domain
- Include both `https://yourdomain.com` and `https://www.yourdomain.com`

### 404 on API routes
- Make sure backend Root Directory is set to `backend`
- Check that `vercel.json` exists in the backend folder

---

## Optional: SMTP for Email Campaigns

To send phishing simulation emails, add these to your backend environment:
- `SMTP_HOST` - e.g., `smtp.sendpulse.com`
- `SMTP_PORT` - e.g., `587`
- `SMTP_USER` - your SMTP username
- `SMTP_PASSWORD` - your SMTP password

---

## Support

For issues, check:
1. Vercel deployment logs
2. Browser developer console (F12 → Console)
3. Network tab for API errors
