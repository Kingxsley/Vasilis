# VasilisNetShield - Self-Hosting Guide (100% Free & Open Source)

## Tech Stack (All Open Source)
- **Backend**: FastAPI (Python)
- **Frontend**: React
- **Database**: MongoDB
- **AI**: Optional (works without it using built-in templates)

## Quick Start (Local Development)

### 1. Prerequisites
```bash
# Install these free tools
- Python 3.9+
- Node.js 18+
- MongoDB Community Server (free)
- Git
```

### 2. Clone & Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### 3. Backend .env Configuration
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="vasilisnetshield"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="your-super-secret-key-change-this"

# OPTIONAL: For AI-generated scenarios (works without this)
# Get free API key at: https://platform.openai.com/api-keys
# OPENAI_API_KEY="sk-..."
# OPENAI_MODEL="gpt-3.5-turbo"  # or gpt-4 if you have access
```

### 4. Setup Frontend
```bash
cd frontend

# Install dependencies
yarn install  # or: npm install

# Configure environment
cp .env.example .env
# Edit .env
```

### 5. Frontend .env Configuration
```env
REACT_APP_BACKEND_URL="http://localhost:8001"
```

### 6. Run Locally
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3: Start Frontend
cd frontend
yarn start
```

Visit: http://localhost:3000

---

## Free Cloud Hosting Options

### Option A: Railway + Vercel (Easiest)
**Cost: $0** (within free tiers)

1. **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) - Free 512MB cluster
2. **Backend**: [Railway](https://railway.app) - Free $5/month credit
3. **Frontend**: [Vercel](https://vercel.com) - Free for personal projects

### Option B: Render (All-in-One)
**Cost: $0** (free tier)

1. **Database**: MongoDB Atlas (free)
2. **Backend**: [Render](https://render.com) - Free web service
3. **Frontend**: Render Static Site - Free

### Option C: Self-Hosted VPS
**Cost: $0-5/month**

1. [Oracle Cloud](https://www.oracle.com/cloud/free/) - Always Free VPS
2. [Google Cloud](https://cloud.google.com/free) - Free e2-micro instance
3. [AWS](https://aws.amazon.com/free/) - Free t2.micro for 12 months

---

## Deployment Steps (Railway + Vercel Example)

### 1. MongoDB Atlas (Free Database)
```
1. Go to mongodb.com/atlas
2. Create free account
3. Create free M0 cluster
4. Get connection string: mongodb+srv://user:pass@cluster.mongodb.net/vasilisnetshield
```

### 2. Railway (Backend)
```
1. Go to railway.app
2. Connect GitHub repo
3. Add environment variables:
   - MONGO_URL=mongodb+srv://...
   - DB_NAME=vasilisnetshield
   - JWT_SECRET=your-secret
   - CORS_ORIGINS=https://your-frontend.vercel.app
4. Deploy
```

### 3. Vercel (Frontend)
```
1. Go to vercel.com
2. Import GitHub repo (frontend folder)
3. Add environment variable:
   - REACT_APP_BACKEND_URL=https://your-backend.railway.app
4. Deploy
```

### 4. Custom Domain (vasilisnetshield.net)
```
In Vercel:
1. Go to Project Settings → Domains
2. Add vasilisnetshield.net
3. Update DNS at your registrar:
   - A Record: @ → 76.76.21.21
   - CNAME: www → cname.vercel-dns.com
```

---

## Free AI Alternatives

The app works **100% without AI** using built-in template scenarios. But if you want AI:

### Option 1: OpenAI (Pay-per-use)
- $0.002 per 1K tokens (~$0.01 per scenario)
- Set `OPENAI_API_KEY` in backend .env

### Option 2: Ollama (100% Free, Self-Hosted)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download a model
ollama pull llama2

# Modify server.py to use Ollama API instead of OpenAI
```

### Option 3: No AI (Default)
- Uses built-in phishing/ad/social engineering templates
- 30+ pre-made scenarios included
- No API key needed

---

## Docker Deployment (Advanced)

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=vasilisnetshield
    depends_on:
      - mongodb
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongo_data:
```

```bash
docker-compose up -d
```

---

## Security Checklist for Production

- [ ] Change JWT_SECRET to a strong random string
- [ ] Set CORS_ORIGINS to your exact domain (not *)
- [ ] Enable HTTPS (free with Let's Encrypt)
- [ ] Set up MongoDB authentication
- [ ] Use environment variables, never commit secrets
- [ ] Enable rate limiting for auth endpoints

---

## Support

This is open source software. For help:
1. Check the code comments
2. Review FastAPI docs: https://fastapi.tiangolo.com
3. Review React docs: https://react.dev

**Total Cost: $0** (using free tiers + template scenarios)
