# GeoTracker - Real-Time Geospatial Location Tracking System

A full-stack web application that tracks GPS coordinates from mobile devices and displays them live on an interactive map using WebSocket communication.

## Developed By
- Dheeraj Sharma (Roll No. 2023A1R112)
- Suvan Mahajan (Roll No. 2023A1R088)
- B.Tech CSE, Semester VI
- MIET Jammu

## Tech Stack
- Node.js + Express.js
- Socket.io (WebSockets)
- MongoDB + Mongoose
- Leaflet.js + OpenStreetMap
- HTML5 Navigator Geolocation API

## Features
- Real-time GPS tracking from mobile browser (no app install needed)
- Live map updates using WebSocket communication
- Supports multiple devices simultaneously with color-coded trails
- Persistent location history stored in MongoDB
- Works over internet via Ngrok tunneling

## Project Setup

### 1. Clone the repository
git clone https://github.com/your-username/GeoTracker.git
cd GeoTracker

### 2. Install dependencies
npm install

### 3. Configure environment
Create a .env file in the root folder:
MONGO_URI=your_mongodb_connection_string_here
PORT=3000

### 4. Run the server
node server.js

### 5. Open in browser
http://localhost:3000

## How to Use
1. Open http://localhost:3000/sender.html on your mobile browser
2. Enter a device name and click Connect
3. Allow location permission when prompted
4. Open http://localhost:3000/map.html on any browser to view live tracking

## For Internet Access (Ngrok)
1. Run: ngrok http 3000
2. Copy the https URL from Ngrok
3. Open that URL/sender.html on mobile
4. Open that URL/map.html on desktop

## Supervisor
Ms. Vishalika
MIET Jammu
