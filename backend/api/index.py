# Vercel Serverless Entry Point for FastAPI
# This file is the entry point for Vercel's Python runtime

import sys
import os

# Get the parent directory (backend root) and add to path
# This must happen BEFORE importing anything else
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Also add the current directory for any local imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Load environment variables from .env if present
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_root, '.env'))

# Now import the FastAPI app from server.py
from server import app

# Vercel's Python runtime looks for 'app' by default for ASGI applications
