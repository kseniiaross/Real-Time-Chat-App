// frontend/app/src/components/MessageInput.tsx
import React, { useState } from "react"; // Import React and useState hook
import { socket } from "../socket"; // Import configured socket instance

interface MessageInputProps {
  username: string; // Current user's name passed from parent
  room: string;     // Current active room name passed from parent
}

const MessageInput: React.FC<MessageInputProps> = ({ username, room }) => {
  const [message, setMessage] = useState(""); // Local state for input value

  const sendMessage = () => { // Helper function to send message
    if (!message.trim() || !username.trim()) { // Do not send if username or message is empty
      console.log("Username or message is empty"); // Debug log for invalid send attempt
      return; // Exit function early
    }

    const timestamp = new Date().toISOString(); // Generate ISO timestamp for message

    socket.emit("chat message", { // Send message object to server via socket
      id: crypto.randomUUID(),        // Unique ID for this message
      username: username.trim(),      // Clean username without extra spaces
      message: message.trim(),        // Clean message text
      timestamp,                      // Time when message was created
      likes: 0,                       // Initial likes count
      room,                           // Room name where message belongs
    });

    setMessage(""); // Clear input after sending
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { // Handle keyboard events on input
    if (e.key === "Enter") { // If user presses Enter key
      e.preventDefault();    // Prevent default form submit / line break behavior
      sendMessage();         // Trigger sendMessage logic
    }
  };

  return (
    <div className="input-container"> {/* Wrapper for text input and send button */}
      <input
        type="text"                                // Text input field
        value={message}                            // Controlled value from state
        onChange={(e) => setMessage(e.target.value)} // Update state when user types
        placeholder="Enter your message"           // Placeholder text inside input
        onKeyDown={handleKeyDown}                  // Listen for Enter key to send
      />
      <button className="send-btn" onClick={sendMessage}> {/* Send button triggers sendMessage */}
        Send {/* Button label text */}
      </button>
    </div>
  );
};

export default MessageInput; // Export component for use in App