# Vercel Serverless Entry Point for FastAPI
import sys
import os

# CRITICAL: Add parent directory to Python path BEFORE any imports
# This allows importing from server.py and routes/
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Now import the FastAPI app
from server import app

# Vercel expects either 'app' or 'handler' as the ASGI application
# Using 'app' directly works with Vercel's Python runtime
