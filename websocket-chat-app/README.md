# WebSocket Chat Application

## Overview

This project is a real-time chat application built using WebSocket technology, React on the frontend, and Flask on the backend. It enables users to join chat rooms and exchange messages in real-time.

## Features

- WebSocket connection between the client and server for real-time messaging.
- A minimalist and responsive UI built with React.
- Chat messages are stored in `localStorage`.
- Usernames and timestamps are displayed for each message.
- The chat interface allows message sending and basic chat room functionality.

## Project Structure

- **`backend/`**: Contains the Flask server that handles WebSocket communication.
- **`frontend/app/`**: Contains the React frontend that connects to the WebSocket server.
  
## Prerequisites

- Node.js (for frontend)
- Python 3.x (for backend)
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/websocket-chat-app.git
cd websocket-chat-app

### 2. Backend Setup (Flask)

	1.	Navigate to the backend/ folder:
      cd backend

  2.	Create and activate a virtual environment:
      python3 -m venv venv
      source venv/bin/activate

  3.	Install the required Python packages:
      pip install -r requirements.txt

	4.	Run the Flask server:
      python app.py

The backend will now be running on http://127.0.0.1:5000.

### 3. Frontend Setup (React)

	1.	Navigate to the frontend/app/ folder:
      cd ../frontend/app

	2.	Install the necessary npm packages:
      npm install

	3.	Start the development server:
      npm run dev

The frontend will be running on http://localhost:5173.

Usage

	1.	Open your browser and navigate to http://localhost:5173.
	2.	Enter your username and message to participate in the chat.
	3.	Messages will be displayed in real-time with timestamps.

Technologies Used

	•	Frontend: React, TypeScript, CSS
	•	Backend: Flask, Flask-SocketIO
	•	WebSocket Communication: socket.io

websocket-chat-app/
│
├── backend/
│   ├── venv/
│   ├── app.py
│   ├── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   │   └── react.svg
│   │   │   ├── components/
│   │   │   │   ├── ChatBody.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   ├── App.tsx
│   │   │   ├── App.css
│   │   │   ├── index.css
│   │   │   ├── main.tsx
│   │   │   ├── socket.ts
│   │   │   ├── styles.css
│   │   │   ├── vite-env.d.ts
│   │   ├── .gitignore
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│
├── .gitignore 
└── README.md 
