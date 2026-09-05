# CivicFix - Citizen Infrastructure Grievance & Resolution Platform

CivicFix connects citizens and municipal authorities to rapidly identify, report, prioritize, track, and resolve public infrastructure issues (such as road damage, broken streetlights, sewage overflow, and garbage accumulation).

---

## 🚀 How to Export to GitHub from Google AI Studio

If you are inside Google AI Studio Build:
1. Locate the **Settings / Menu** icon in the upper-right corner of the interface.
2. Click **Export to GitHub** (or **Download ZIP** if you prefer to initialize git locally).
3. Select or authorize your GitHub account and specify your destination repository name (e.g., `civicfix`).
4. Click **Export**. AI Studio will automatically push all source code, workflows, and configuration files directly to your new GitHub repository.

---

## 🌐 How to Deploy from GitHub

CivicFix is a modern web application powered by **React 19 + Vite** on the frontend and an **Express Node.js** backend bundled via `esbuild`.

### Option 1: Deploy to GitHub Pages (Static Web Hosting)

This repository includes a pre-configured, dual-mode GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that automatically builds CivicFix and publishes it to GitHub Pages on every push.

#### Method A: Using GitHub Actions (Recommended)
1. In your GitHub repository, navigate to **Settings** → **Pages** (in the left sidebar).
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Push any commit to `main` (or go to the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**).
4. GitHub Actions will run `npm install`, `npm run build`, and publish the production bundle. Your live CivicFix site will be active at:
   `https://<your-username>.github.io/<repository-name>/`

#### Method B: Deploy from the `gh-pages` Branch
If your repository is configured to **Deploy from a branch**:
1. Go to **Settings** → **Pages**.
2. Set **Branch** to **`gh-pages`** and folder to **`/ (root)`**.
3. Click **Save**.
The included workflow automatically builds and pushes the fresh CivicFix build to the `gh-pages` branch on every push.

#### Method C: One-Click Deploy from Local Terminal
You can also build and publish directly using the included `gh-pages` script:
```bash
npm run deploy
```

---

### Option 2: Deploy to Render.com (Recommended for instant full-stack setup)
1. Go to [render.com](https://render.com) and log in with your GitHub account.
2. Click **New +** → **Web Service**.
3. Select your exported `civicfix` GitHub repository.
4. Configure the service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API key)*
   - `VITE_GOOGLE_MAPS_API_KEY`: *(Optional: Google Maps Platform API key)*
6. Click **Deploy Web Service**. Render will build and launch your live application with a free SSL URL.

---

### Option 3: Deploy to Railway.app
1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `civicfix` repository.
4. Railway automatically detects the `Dockerfile` or `package.json`:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: `3000`
5. Add your environment variables in the **Variables** tab (`GEMINI_API_KEY`, etc.).
6. Railway will automatically deploy on every `git push`.

---

### Option 4: Deploy to Google Cloud Run
You can deploy directly to Google Cloud Run in two ways:

#### A. From Google AI Studio
- In the Google AI Studio top bar, click the **Deploy to Cloud Run** button. The platform provisions and deploys the container directly.

#### B. From GitHub via Google Cloud CLI:
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy directly from the source directory
gcloud run deploy civicfix \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

---

### Option 5: Deploy using Docker
CivicFix includes an optimized production `Dockerfile`.

```bash
# 1. Build the Docker image
docker build -t civicfix:latest .

# 2. Run the container on port 3000
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY="your_api_key_here" \
  -e VITE_GOOGLE_MAPS_API_KEY="your_maps_key_here" \
  --name civicfix-app civicfix:latest
```
Access the application at `http://localhost:3000`.

---

## 💻 Local Development Setup

To run CivicFix locally on your computer:

```bash
# 1. Clone your exported GitHub repository
git clone https://github.com/YOUR_USERNAME/civicfix.git
cd civicfix

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env
# Open .env and insert your GEMINI_API_KEY

# 4. Start the development server
npm run dev
```

The development server will start at `http://localhost:3000`.

---

## 🛠️ Available Scripts

- `npm run dev`: Starts the TypeScript development server with Vite middleware.
- `npm run build`: Builds the production Vite frontend and bundles the Express backend to `dist/server.cjs`.
- `npm run start`: Launches the compiled production server (`node dist/server.cjs`).
- `npm run lint`: Validates TypeScript typings across the entire codebase.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional / Recommended | API key for server-side Google Gemini AI triage and issue classification. |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Google Maps Platform API key. If omitted, CivicFix automatically falls back to OpenStreetMap / Leaflet. |
| `PORT` | Optional | Port on which the server listens (defaults to `3000`). |

---

## 🛡️ CI/CD Automation

This repository includes a ready-to-use GitHub Actions workflow located at `.github/workflows/ci.yml`. Whenever you push commits or open pull requests to `main` or `master`, the workflow automatically executes type checking (`npm run lint`) and production compilation (`npm run build`).
