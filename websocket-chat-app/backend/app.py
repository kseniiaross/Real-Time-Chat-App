from flask import Flask                               # Import Flask core class to create the web application
from flask_socketio import SocketIO, join_room, leave_room  # Import SocketIO and helpers to work with rooms

app = Flask(__name__)                                 # Create Flask application instance
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")    # Attach SocketIO to the app, allow CORS from any origin


# user joins room
@socketio.on("join room")                             # Listen for "join room" events from clients
def handle_join_room(data):                           # Handler for user joining a room
    username = data.get("username", "Unknown")        # Safely read username from payload, use "Unknown" if missing
    room = data.get("room", "general")                # Safely read room name from payload, default to "general"
    join_room(room)                                   # Add this client's Socket.IO connection to the room
    print(f"{username} joined room: {room}")          # Log join action to server console


# user leaves room
@socketio.on("leave room")                            # Listen for "leave room" events from clients
def handle_leave_room(data):                          # Handler for user leaving a room
    username = data.get("username", "Unknown")        # Read username from payload with fallback
    room = data.get("room", "general")                # Read room from payload with fallback
    leave_room(room)                                  # Remove this client's Socket.IO connection from the room
    print(f"{username} left room: {room}")            # Log leave action to server console


@socketio.on("chat message")                          # Listen for "chat message" events from clients
def handle_chat_message(data):                        # Handler for incoming chat messages
    """
    data: { id, username, message, timestamp, likes, room }  # Expected structure of incoming message payload
    """
    print("Received message:", data)                  # Log full message payload for debugging
    room = data.get("room", "general")                # Determine target room for this message

    # send message only to this room
    socketio.emit("chat message", data, room=room)    # Broadcast message to all clients in this specific room


@socketio.on("toggle like")                           # Listen for "toggle like" events from clients
def handle_toggle_like(data):                         # Handler for like/unlike actions
    """
    data: { id, delta, room }                         # Expected payload: message id, like delta (+1 / -1), room name
    """
    print("Toggle like:", data)                       # Log like action for debugging
    room = data.get("room", "general")                # Determine which room should receive like update

    socketio.emit(                                    # Broadcast like update to all other clients in the room
        "toggle like",                                # Event name to emit
        data,                                         # Payload with id, delta, room
        room=room,                                    # Target room
        include_self=False                            # Do not send back to the client who triggered the event
    )


@socketio.on("connect")                               # Listen for new client connections
def handle_connect():                                 # Handler when a client connects
    print("Client Connected")                         # Log connection event


@socketio.on("disconnect")                            # Listen for client disconnections
def handle_disconnect():                              # Handler when a client disconnects
    print("Client Disconnected")                      # Log disconnection event


if __name__ == "__main__":                            # Run this block only if script is executed directly
    socketio.run(                                     # Start Socket.IO development server
        app,                                          # Flask app instance
        host="0.0.0.0",                               # Listen on all network interfaces
        port=5000,                                    # Port for backend server
    )