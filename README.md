# VasilisNetShield

**Human + AI Powered Security Training Platform**

A cybersecurity training application for organizations to train employees against phishing, malicious ads, and social engineering attacks.

## Features

- **Phishing Email Detection Training** - Learn to spot suspicious emails
- **Malicious Ad Recognition** - Identify fake advertisements and clickbait
- **Social Engineering Defense** - Recognize manipulation tactics
- **Phishing Simulations** - Run realistic phishing campaigns to test employees
- **Admin Dashboard** - Manage organizations, users, and campaigns
- **Analytics** - Track training progress and identify knowledge gaps
- **Certificates** - Issue completion certificates

## Tech Stack

- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Deployment**: Vercel (serverless)

## Quick Start

See [SELF_HOSTING_GUIDE.md](./SELF_HOSTING_GUIDE.md) for deployment instructions.

## Project Structure

```
├── backend/
│   ├── api/index.py      # Vercel serverless entry point
│   ├── server.py         # Main FastAPI application
│   ├── routes/           # API route handlers
│   ├── models/           # Pydantic models
│   ├── services/         # Business logic
│   └── vercel.json       # Vercel config
├── frontend/
│   ├── src/
│   │   ├── pages/        # React pages
│   │   ├── components/   # UI components
│   │   └── App.js        # Main app
│   └── vercel.json       # Vercel config
└── SELF_HOSTING_GUIDE.md
```

## Environment Variables

### Backend
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT tokens
- `CORS_ORIGINS` - Allowed frontend origins

### Frontend
- `REACT_APP_BACKEND_URL` - Backend API URL

## License

MIT
