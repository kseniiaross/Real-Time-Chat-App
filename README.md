# WebSocket Chat Application

## Overview
This is a real-time chat application built using Flask-SocketIO for the backend and React with TypeScript for the frontend. The project supports real-time communication via WebSockets, allowing users to send and receive messages in a chatroom in real-time. 

## Features
- **Real-Time Messaging**: Allows users to send and receive messages instantly using WebSocket technology.
- **Structured Pages**: Includes components such as the chat room and input forms for sending messages.
- **Responsive Design**: The application adapts to different screen sizes, from desktops to mobile devices.
- **User Timestamps**: Displays usernames and timestamps for each message sent in the chatroom.
- **Frontend-Backend Integration**: Real-time communication between Flask-SocketIO backend and React frontend.
- **Local and Cloud Hosting**: The backend can be run locally, while the frontend is deployed on Vercel.

## Technologies Used
- **Frontend**: React, TypeScript, Vite
- **Backend**: Flask, Flask-SocketIO
- **WebSocket**: Flask-SocketIO, socket.io-client
- **Deployment**: Vercel (Frontend), Localhost for Backend


https://chat-application-project-3wiq0q7oz-rostovks94s-projects.vercel.app


### Project Structure

```bash
/websocket-chat-app
├── backend
│   ├── app.py              
│   └── requirements.txt     
├── frontend/app
│   ├── src
│   │   ├── components
│   │   │   ├── ChatBody.tsx     
│   │   │   └── MessageInput.tsx 
│   │   ├── App.tsx              
│   │   └── main.tsx             
│   ├── public
│   │   └── index.html          
│   └── package.json            
└── README.md
```

Feel free to reach out if you have any questions or suggestions.
