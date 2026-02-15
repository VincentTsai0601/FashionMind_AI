<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# FashionMind AI - Virtual Try-On & AI Stylist Experience

An AI-powered virtual fashion application with real-time AI stylist consultation, built with React, TypeScript, Vite, and Google Gemini API.

View your app in AI Studio: https://ai.studio/apps/drive/1iaZ6QEGpi9Ek7AAWGzgttmuuq2l6p7Pe

## Features

- 📸 **Photo Analysis** - Upload your photo or use your webcam for instant analysis
- 👗 **Smart Outfit Recommendations** - AI-powered personalized styling based on your image and preferences
- 💬 **AI Stylist Chat (Vortex)** - Real-time conversation with Vortex, your luxury fashion consultant
  - Personalized advice on colors, fabrics, and fit
  - Weather-aware styling suggestions
  - Color theory explanations for your skin tone
  - Bullet-point formatted responses for clarity
- 🌤️ **Weather Integration** - Auto-detect location and adapt outfit suggestions to weather conditions
- 🎨 **Virtual Try-On** - Generate realistic images of yourself wearing different outfits
- 🎬 **3D Rotation Video** - See 360° turntable videos of your styled outfit
- 🔄 **Seamless Consultation Flow** - Instantly connect from recommendations to chat with Vortex

## Application Tabs

1. **Home** - Initial landing page and quick styling insights
2. **Outfit Lab** - Main consultation hub: chat with Vortex, get styling advice, and discuss fashion choices in real-time
3. **Wardrobe** - Manage and organize your wardrobe items
4. **3D Virtual Try-On** - Upload photos and generate realistic try-on images with 360° rotation videos

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

### Typical Workflow

1. **Navigate to 3D Virtual Try-On tab** → Upload a photo of yourself
2. **Get AI Recommendations** → Receive detailed styling advice from our AI
3. **Connect with Vortex** → Click the button to chat with your personal stylist
4. **Discuss & Refine** → Ask follow-up questions about colors, fabrics, occasions, etc.
5. **Generate Virtual Try-On** → See realistic images of the suggested outfits

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

- `POST /api/get-weather` - Fetch weather data for a location and auto-detect user location via browser geolocation
- `POST /api/suggest-outfit` - Get AI outfit suggestions with detailed descriptions and styling advice
- `POST /api/generate-tryon` - Generate virtual try-on image (uses Gemini 2.5 Flash Image model)
- `POST /api/generate-rotation` - Generate 3D rotation video of styled outfit
- `POST /api/stylist-chat` - Chat with Vortex AI stylist with full conversation history support
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
npm run deploy                 # Deploy to production
```

## Deployment

FashionMind AI is deployed using a modern cloud stack:

### Frontend - GitHub Pages
- **Hosting:** GitHub Pages
- **Build:** Vite (optimized React build)
- **CI/CD:** GitHub Actions (automatic deployment on push to main)
- **Live URL:** `https://vincenttsai0601.github.io/FashionMind_AI`


### Backend - Render
- **Hosting:** Render (free tier available)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Live URL:** `https://fashionmind-ai-backend.onrender.com`
- **Auto-deploy:** Connected to GitHub repository



### Environment Variables for Production

When deploying to Render, ensure these environment variables are set:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
PORT=3001
```

### API Base URL Configuration

The frontend automatically detects the environment:

```typescript
// In services/geminiService.ts
const API_BASE =
    import.meta.env.PROD
    ? 'https://fashionmind-ai-backend.onrender.com'
    : 'http://localhost:3001';
```

- **Production:** Connects to Render backend
- **Development:** Connects to local backend (port 3001)

### Deployment Checklist

- [ ] Gemini API key added to Render environment variables
- [ ] GitHub Actions workflow configured for frontend builds
- [ ] Backend service connected to GitHub repo on Render
- [ ] Test API endpoints work on production
- [ ] Verify weather auto-detection works
- [ ] Test outfit recommendations end-to-end
- [ ] Confirm chat with Vortex functions properly

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
