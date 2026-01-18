<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# FashionMind AI - Virtual Try-On Experience

An AI-powered virtual fashion try-on application built with React, TypeScript, Vite, and Google Gemini API.

View your app in AI Studio: https://ai.studio/apps/drive/1iaZ6QEGpi9Ek7AAWGzgttmuuq2l6p7Pe

## Features

- 📸 **Photo Upload or Camera Capture** - Upload your photo or use your webcam
- 👗 **Virtual Try-On** - Generate realistic images of yourself wearing different outfits
- 🎨 **AI Stylist** - Get personalized fashion advice based on your preferences
- 🌤️ **Weather Integration** - Outfit suggestions adapt to local weather
- 🎬 **3D Rotation Video** - See 360° turntable videos of your styled outfit

## Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Gemini API Key** (free or paid) from https://aistudio.google.com/

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd FashionMind_AI
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create or update `.env.local` with your API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Quick Start

### macOS / Linux / Ubuntu

```bash
bash start-dev.sh
```

### Windows

Double-click `start-dev-windows.bat` or run in command prompt:
```cmd
start-dev-windows.bat
```

### Manual Setup (Any Platform)

Open two separate terminals:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Accessing the Application

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:3001

## Project Structure

```
FashionMind_AI/
├── components/          # React components
│   ├── CameraCapture.tsx
│   ├── FileUpload.tsx
│   └── LoadingSpinner.tsx
├── services/           # API and service functions
│   └── geminiService.ts
├── server/            # Backend Express server
│   └── index.js
├── App.tsx            # Main app component
├── index.tsx          # React entry point
├── start-dev.sh       # Generic Unix startup script
├── start-dev-ubuntu.sh # Ubuntu-specific startup
├── start-dev-windows.bat # Windows startup
└── vite.config.ts     # Vite configuration
```

## API Routes

### Backend Endpoints

- `POST /api/get-weather` - Fetch weather data for a location
- `POST /api/suggest-outfit` - Get outfit suggestions with AI analysis
- `POST /api/generate-tryon` - Generate virtual try-on image
- `POST /api/generate-rotation` - Generate 3D rotation video
- `POST /api/stylist-chat` - Chat with AI stylist
- `GET /health` - Health check endpoint

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Your Gemini API Key
GEMINI_API_KEY=your_api_key_here
```

## Troubleshooting

### Rate Limit Error: "The stylist is attending to other clients..."

This is a 429 error from Google Gemini API - you're hitting the free tier rate limit.

**Solutions:**
- Wait 1-2 minutes between requests (the app auto-retries)
- Upgrade to a paid Gemini API plan at https://aistudio.google.com/
- Use smaller images to reduce processing time
- Try during off-peak hours

### 404 Error: "Not Found"

The frontend can't reach the backend server.

**Solutions:**
- Ensure backend is running: `npm run server` (port 3001)
- Ensure frontend is running: `npm run dev` (port 3000)
- Check both are on correct ports
- Use the provided startup scripts to start both automatically

### API Key Error: "Authentication failed"

Your API key is missing or invalid.

**Solutions:**
- Add your API key to `.env.local`: `GEMINI_API_KEY=your_key_here`
- Get a free API key at https://aistudio.google.com/
- Restart the servers after updating the key

### "Model not available" Error

The `gemini-2.5-flash-image` model requires specific API access.

**Solutions:**
- Check your Gemini API tier at https://aistudio.google.com/
- Ensure you have image generation access
- Consider upgrading to a paid tier for full model access

### Windows: "Port already in use"

If ports 3000 or 3001 are already in use:

**Solutions:**
- Close other applications using these ports
- Or change the ports in `vite.config.ts` and `server/index.js`
- Use `netstat -ano | findstr :3000` to find which process is using the port

### Ubuntu/Linux: Port permission denied

If you get "Permission denied" when starting servers:

**Solutions:**
- Use `sudo` (not recommended for development)
- Or change to ports above 1024 (e.g., 8000, 8001)

## Development

### Available Scripts

```bash
# Install dependencies
npm install

# Start development servers (choose by OS)
bash start-dev.sh              # macOS/Linux/Ubuntu
bash start-dev-ubuntu.sh       # Ubuntu-specific
start-dev-windows.bat          # Windows

# Start individual servers
npm run server                 # Backend only (port 3001)
npm run dev                    # Frontend only (port 3000)

# Build for production
npm run build                  # Build frontend
```

### Technology Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Express.js, Node.js
- **AI/ML:** Google Gemini API 2.5 Flash
- **Styling:** CSS
- **Package Manager:** npm

## Support & Resources

- [Google Gemini API Documentation](https://ai.google.dev/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)

## License

This project is part of the FashionMind AI initiative.
