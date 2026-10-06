import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // In local development, forward /api/* to local uvicorn process on port 8000.
    // In production on Vercel, vercel.json directs /api/(.*) to Python serverless api/index.py.
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: process.env.PYTHON_API_URL || 'http://127.0.0.1:8000/api/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
