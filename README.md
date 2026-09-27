# Cosmos Arogya

AI-powered medical companion PWA — scans medicines, prescriptions, and lab reports; finds nearby hospitals/pharmacies; and answers health questions via a local, multilingual AI chat + voice assistant. Built free-of-cost: no paid AI APIs, on-device where possible.

## Tech decisions

| Feature | Choice | Why |
|---|---|---|
| OCR (medicine/prescription/report scan) | Tesseract.js | Free, runs client-side, no API key |
| Medicine info lookup | OpenFDA API | Free, no key, drug uses/side effects |
| Hospital/pharmacy finder | OpenStreetMap Overpass API + Leaflet.js + Nominatim | Free, no key (per user request) |
| AI chat | WebLLM (Llama-3.2-1B or Phi-3-mini) | Runs fully in-browser via WebGPU — zero cost, zero API, offline-capable |
| Voice (STT/TTS) | Web Speech API | Built into Chrome/Edge, free; language coverage varies by OS |
| Vision captioning | transformers.js (small model) | Client-side, free |
| Auth + storage | Firebase Auth (Google) + Firestore | Per-user scan history, saved pharmacies |
| Camera vitals | Pulse rate only, via rPPG (color-change analysis) | SpO2/BP/hemoglobin are NOT reliably measurable from a camera alone — deliberately excluded to avoid showing false medical readings |
| Hosting | GitHub repo → Vercel | As requested |
| Languages | English, Tamil, Hindi, Telugu, Malayalam | UI + chat + voice |

## Known limitations (be upfront with the user about these)
- OSM specialty data for hospitals is inconsistent — not every hospital will have structured specialty tags.
- WebLLM needs WebGPU (modern Chrome/Edge/Safari); older devices need a fallback message.
- Indian-language TTS/STT quality depends on the user's OS/browser, not the app.
- Camera pulse estimate is a rough figure, always labeled "estimated," never a clinical reading.

## Build phases
1. ✅ Foundation — PWA scaffold, manifest, service worker, premium design system, landing/onboarding page (`public/index.html`)
2. ✅ Auth — Firebase Google sign-in + Firestore per-user profile (`public/js/firebase.js`)
3. ⬜ Scanner — Tesseract.js OCR + OpenFDA lookup + report parsing + camera pulse (rPPG)
4. ✅ Hospital finder — Overpass/Leaflet map + search (`public/js/hospitals.js`, `public/app.html`)
5. ⬜ AI chat — WebLLM integration, multilingual prompts
6. ⬜ Voice — Web Speech API STT/TTS layer
7. ⬜ Polish + deploy — GitHub repo, Vercel config, final QA

## Setup you must do before this works (Firebase)
The auth code is complete but needs **your own Firebase project's keys** — I can't create a Firebase project on your behalf.
1. https://console.firebase.google.com → Create project → name it "Cosmos Arogya"
2. **Build → Authentication → Sign-in method** → enable **Google**
3. **Build → Firestore Database** → Create database (start in *production* mode)
4. **Project settings → General → Your apps** → Add app → Web (`</>`) → copy the config object
5. Paste it into `public/js/firebase.js`, replacing the `firebaseConfig` placeholder
6. In Firestore → **Rules**, paste:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
7. **Authentication → Settings → Authorized domains** → add your Vercel domain once deployed (and `localhost` for local testing)

## Hospital finder
No setup needed — it calls the public OpenStreetMap Overpass and Nominatim APIs directly (no key). Be aware Overpass's public server is shared infrastructure and can rate-limit under heavy use; if this app gets real traffic, self-hosting an Overpass instance is worth considering later.

## Deploying (GitHub → Vercel)
This repo is already git-initialized locally. To publish it:
```bash
# 1. Create a new empty repo on github.com (no README/license — this repo already has one), then:
cd cosmos-arogya
git remote add origin https://github.com/YOUR_USERNAME/cosmos-arogya.git
git branch -M main
git push -u origin main

# 2. On vercel.com: "Add New… → Project" → import the cosmos-arogya GitHub repo
#    Framework preset: "Other" — vercel.json already points it at public/
#    Click Deploy.
```
After deploying, copy the `https://your-project.vercel.app` domain into Firebase's **Authorized domains** (step 7 above), or Google sign-in will fail on the live site.

## Design system (from Phase 1)
- **Palette:** void `#06090b`, surface `#0d1417`/`#121a1e`, pulse accent `#3fe0c5`, secondary violet `#7c86ff`, alert amber `#ff9a6c`, text `#e8f2f0`
- **Type:** Fraunces (display/serif) + IBM Plex Sans (UI/body)
- **Motif:** live ECG/pulse waveform as the hero visual (ties to the app's subject matter — vitals, monitoring — rather than a generic gradient hero)
