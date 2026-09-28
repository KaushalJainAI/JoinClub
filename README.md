# JoinClub

A full-stack application with a Node/Express backend and a React/Vite frontend.

## How to Run

### Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file with:
   ```env
   MONGO_URI=your_mongodb_uri
   SECRET_KEY=your_jwt_secret
   PORT=8000
   CLOUD_NAME=your_cloudinary_name
   API_KEY=your_cloudinary_key
   API_SECRET=your_cloudinary_secret
   ```
4. `npm run dev`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Open `http://localhost:5173` to view the app.
