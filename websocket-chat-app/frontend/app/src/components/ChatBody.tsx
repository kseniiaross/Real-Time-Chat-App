// frontend/app/src/components/ChatBody.tsx
import React, { useState, useEffect, useRef } from "react"; // Import React and hooks: useState, useEffect, useRef
import { socket } from "../socket"; // Import configured socket instance

interface ChatMessage {
  id: string;          // Unique identifier for each message
  username: string;    // Name of the user who sent the message
  message: string;     // Text content of the message
  timestamp: string;   // Time when message was created (ISO string)
  likes: number;       // Number of likes for this message
  room?: string;       // Optional room name (in case server sends it)
}

interface ChatBodyProps {
  room: string;        // Current active room name passed from parent
  username: string;    // Current user's name passed from parent
}

const ChatBody: React.FC<ChatBodyProps> = ({ room, username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);         // Local state: list of messages for current room
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({}); // Local state: which messages this user has liked (by id)

  // Keys in localStorage for message history and likes of this user in this room
  const storageKey = `chatMessages:${room}`;                            // Key for storing messages of this room
  const likedKey = `likedMap:${room}:${username || "guest"}`;          // Key for storing likes map per user per room
  const listRef = useRef<HTMLUListElement | null>(null);               // Ref to message list for auto-scrolling

  useEffect(() => { // Effect: load messages from localStorage and subscribe to socket events
    // ===== 1) restore messages history from localStorage =====
    const savedMessages = localStorage.getItem(storageKey); // Try to read saved messages for this room
    if (savedMessages) { // If something is stored
      try {
        const parsed: any[] = JSON.parse(savedMessages);    // Parse JSON into array
        const normalized: ChatMessage[] = parsed.map((m) => ({ // Normalize each message object to ensure required fields
          id: m.id ?? crypto.randomUUID(),                  // Ensure message has an id (generate if missing)
          username: m.username ?? "Unknown",                // Fallback name if missing
          message: m.message ?? "",                         // Fallback empty text if missing
          timestamp: m.timestamp ?? new Date().toISOString(), // Fallback to "now" if timestamp missing
          likes: typeof m.likes === "number" ? m.likes : 0, // Ensure likes is a number
          room: m.room ?? room,                             // Attach current room if missing
        }));
        setMessages(normalized);                            // Save normalized messages to state
        localStorage.setItem(storageKey, JSON.stringify(normalized)); // Overwrite storage with cleaned data
      } catch {                                             // If JSON parse fails
        localStorage.removeItem(storageKey);                // Clear broken data
        setMessages([]);                                    // Reset messages in UI
      }
    } else {
      setMessages([]);                                      // No stored messages => start with empty list
    }

    // handle incoming messages from server
    const handleChatMessage = (message: ChatMessage) => {   // Listener for "chat message" event
      if (message.room && message.room !== room) return;    // Ignore message if it belongs to another room

      const msgWithLikes: ChatMessage = {                   // Normalize incoming message
        ...message,
        likes: typeof message.likes === "number" ? message.likes : 0, // Ensure likes is a number
        room: message.room ?? room,                         // Ensure room is set
      };

      setMessages((prev) => {                               // Append new message to state
        const updated = [...prev, msgWithLikes];            // New array with previous + new message
        localStorage.setItem(storageKey, JSON.stringify(updated)); // Save updated list to localStorage
        return updated;                                     // Return updated state
      });
    };

    // handle likes coming from other clients
    const handleToggleLike = (data: { id: string; delta: number; room?: string }) => { // Listener for "toggle like" event
      if (data.room && data.room !== room) return;          // Ignore if like update comes from another room

      setMessages((prev) => {                               // Update likes in message list
        const updated = prev.map((m) =>
          m.id === data.id                                   // Find message by id
            ? { ...m, likes: (m.likes ?? 0) + data.delta }  // Change likes by delta (+1 or -1)
            : m                                             // Keep others unchanged
        );
        localStorage.setItem(storageKey, JSON.stringify(updated)); // Persist updated messages to localStorage
        return updated;                                     // Return updated array
      });
    };

    socket.on("chat message", handleChatMessage);           // Subscribe to new messages from server
    socket.on("toggle like", handleToggleLike);             // Subscribe to like updates from server

    return () => {                                          // Cleanup when component unmounts or dependencies change
      socket.off("chat message", handleChatMessage);        // Unsubscribe from "chat message" event
      socket.off("toggle like", handleToggleLike);          // Unsubscribe from "toggle like" event
    };
  }, [room, storageKey]);                                   // Re-run effect when room or storageKey changes

  // ===== 2) restore likes map for THIS user in THIS room =====
  useEffect(() => {                                         // Effect: load likes map for current user+room
    const savedLiked = localStorage.getItem(likedKey);      // Read likes map from localStorage
    if (savedLiked) {                                       // If something is stored
      try {
        const parsed = JSON.parse(savedLiked) as Record<string, boolean>; // Parse JSON into record
        setLikedMap(parsed);                                // Put parsed map into state
      } catch {                                             // If parsing fails
        localStorage.removeItem(likedKey);                  // Remove broken data
        setLikedMap({});                                    // Reset likes map
      }
    } else {
      setLikedMap({});                                      // No data => start with empty map
    }
  }, [likedKey]);                                           // Re-run when likedKey changes (new user or room)

  const handleLikeClick = (id: string) => {                 // Handler when user clicks like button
    setLikedMap((prev) => {                                 // Update likes map based on previous state
      const alreadyLiked = !!prev[id];                      // Check if this message was already liked
      const next = { ...prev, [id]: !alreadyLiked };        // Toggle like state for this message
      const delta = alreadyLiked ? -1 : 1;                  // Decide if we add or remove like

      // 1) update likes locally in messages
      setMessages((prevMsgs) => {                           // Update messages array
        const updated = prevMsgs.map((m) =>
          m.id === id                                       // Find message by id
            ? { ...m, likes: (m.likes ?? 0) + delta }       // Adjust likes count
            : m                                             // Keep others unchanged
        );
        localStorage.setItem(storageKey, JSON.stringify(updated)); // Save updated messages to localStorage
        return updated;                                     // Return new messages array
      });

      // 2) store likes map of this user
      localStorage.setItem(likedKey, JSON.stringify(next)); // Save updated likes map for this user

      // 3) notify server so others get update
      socket.emit("toggle like", { id, delta, room });      // Emit event so other clients update likes

      return next;                                          // Return new likes map as state
    });
  };

  useEffect(() => {                                         // Effect: auto-scroll to bottom when messages change
    if (!listRef.current) return;                           // If ref is not attached yet, do nothing
    listRef.current.scrollTop = listRef.current.scrollHeight; // Scroll messages container to the bottom
  }, [messages]);                                           // Run every time messages list is updated

  return (
    <ul className="messages-list" ref={listRef}>            {/* Message list container with ref for scrolling */}
      {messages.map((m) => {                                // Iterate over each message in state
        const isSelf = m.username === username;             // Check if message belongs to current user
        const isLiked = !!likedMap[m.id];                   // Check if current user liked this message

        return (
          <li
            key={m.id}                                      // Unique key for React list rendering
            className={`message-item ${isSelf ? "message-item--self" : ""}`} // Add modifier class for own messages
          >
            {/* Avatar (on the left for others, on the right for me via CSS) */}
            <div className="message-avatar">
              {m.username.charAt(0).toUpperCase()}          {/* Show first letter of username in uppercase */}
            </div>

            {/* Main block: top row (name/time/like), bottom row (text bubble only) */}
            <div className={`message-main ${isSelf ? "message-main--self" : ""}`}> {/* Wrapper around meta + bubble */}
              <div className="message-meta-row">            {/* Row with username, time and like button */}
                <span className="message-author">{m.username}</span> {/* Full username as text */}

                <div className="meta-right">                {/* Right side: time + like group */}
                  <span className="message-time">
                    {new Date(m.timestamp).toLocaleTimeString([], { // Convert ISO timestamp to readable time
                      hour: "2-digit",                               // Show hour with 2 digits
                      minute: "2-digit",                             // Show minute with 2 digits
                    })}
                  </span>

                  <button
                    className={`like-btn ${isLiked ? "liked" : ""}`} // Highlight button if liked by current user
                    onClick={() => handleLikeClick(m.id)}            // Toggle like on click
                  >
                    <span className="like-icon">{isLiked ? "❤" : "♡"}</span> {/* Filled or empty heart */}
                    <span className="like-count">{m.likes ?? 0}</span>       {/* Current likes count */}
                  </button>
                </div>
              </div>

              <div className={`message-bubble ${isSelf ? "message-bubble--self" : ""}`}> {/* Bubble with message text */}
                <div className="message-text">{m.message}</div>      {/* Actual message content */}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ChatBody; // Export component to be used inside App