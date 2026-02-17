# Vercel Serverless Entry Point
# This file wraps the FastAPI app for Vercel serverless functions

import sys
import os

# Add parent directory to path so we can import server
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

# Vercel expects the app to be named 'app' or 'handler'
# FastAPI app is already named 'app' in server.py
