// frontend/app/src/App.tsx

// Import React and needed hooks from the React library
import React, { useEffect, useState } from "react";
// Import the shared socket instance (socket.io client)
import { socket } from "./socket";
// Import the component that renders the list of messages
import ChatBody from "./components/ChatBody";
// Import the component for sending new messages
import MessageInput from "./components/MessageInput";
// Import global styles for the app
import "./styles.css";

// Define the root component of the application as a React Functional Component
const App: React.FC = () => {
  // Store the current user's name (entered on the welcome screen)
  const [username, setUsername] = useState("");

  // Store the currently active chat room name (default is "general")
  const [room, setRoom] = useState("general");

  // Flag that indicates if the user has passed the welcome screen
  const [isReady, setIsReady] = useState(false);

  // List of rooms that this user has joined (retrieved from localStorage)
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);

  // --- State for "Create chat" modal window ---
  // Controls whether the "Create chat" modal is visible
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Holds the new room name typed inside the "Create chat" modal
  const [newRoomName, setNewRoomName] = useState("");

  // --- State for "Invite friends" modal window ---
  // Controls whether the "Invite friends" modal is visible
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  // Stores the invite link that user can copy and share
  const [inviteLink, setInviteLink] = useState("");
  // Indicates whether the invite link was successfully copied to clipboard
  const [inviteCopied, setInviteCopied] = useState(false);

  // --- State for "Manage room" modal (rename / delete current room) ---
  // Controls whether the "Manage room" modal is visible
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  // Which room is being managed (can be null if nothing selected)
  const [roomToManage, setRoomToManage] = useState<string | null>(null);
  // New room name value typed into the "rename room" input
  const [renameValue, setRenameValue] = useState("");

  // -----------------------------------------------------------
  // Initial load: read ?room= from URL + connect socket
  // This effect runs once on component mount.
  // -----------------------------------------------------------
  useEffect(() => {
    try {
      // Build URL object from the current browser address
      // Example: https://site.com?room=friends
      const url = new URL(window.location.href);
      // Read "room" parameter from query string
      const roomFromUrl = url.searchParams.get("room");
      // If parameter exists and is not empty, use it as the initial room
      if (roomFromUrl && roomFromUrl.trim()) {
        setRoom(roomFromUrl.trim()); // override default "general"
      }
    } catch (e) {
      // If URL parsing fails, log error but do not crash the app
      console.error("Failed to parse room from URL", e);
    }

    // Connect socket only once, if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Cleanup function: disconnect socket when component unmounts
    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array -> run once when component mounts

  // -----------------------------------------------------------
  // After username appears, load user's room list from storage
  // This effect runs every time username changes.
  // -----------------------------------------------------------
  useEffect(() => {
    // If username is empty after trimming, reset joinedRooms to an empty array
    if (!username.trim()) {
      setJoinedRooms([]);
      return;
    }

    // Construct key for localStorage based on current username
    const roomsKey = `userRooms:${username}`;
    // Try to read saved room list from localStorage
    const saved = localStorage.getItem(roomsKey);

    if (saved) {
      try {
        // Parse JSON string to array and set it as joinedRooms
        setJoinedRooms(JSON.parse(saved));
      } catch {
        // If parsing fails, clean broken data and reset list
        localStorage.removeItem(roomsKey);
        setJoinedRooms([]);
      }
    } else {
      // If nothing in storage, user has no saved rooms yet
      setJoinedRooms([]);
    }
  }, [username]); // Re-run when username changes

  // -----------------------------------------------------------
  // Add room to user's room list (localStorage)
  // This helper function adds a new room for a specific user.
  // -----------------------------------------------------------
  const addRoomForUser = (user: string, roomName: string) => {
    // Build localStorage key for this user's rooms
    const key = `userRooms:${user}`;
    // Start with empty array
    let arr: string[] = [];

    try {
      // Try to read existing rooms array from localStorage
      const saved = localStorage.getItem(key);
      arr = saved ? JSON.parse(saved) : [];
    } catch {
      // If parsing fails, fall back to empty array
      arr = [];
    }

    // If room is not already in the list, add it
    if (!arr.includes(roomName)) {
      // Create new array with new room appended
      const updated = [...arr, roomName];
      // Save updated rooms list into localStorage
      localStorage.setItem(key, JSON.stringify(updated));
      // Update React state so UI reacts immediately
      setJoinedRooms(updated);
    } else {
      // If room already exists, just update state with existing array
      setJoinedRooms(arr);
    }
  };

  // Helper to update userRooms in storage when we already know new array
  const saveUserRoomsList = (user: string, rooms: string[]) => {
    // Build localStorage key for this user
    const key = `userRooms:${user}`;
    // Serialize and save the rooms array
    localStorage.setItem(key, JSON.stringify(rooms));
  };

  // -----------------------------------------------------------
  // Switch to another existing room
  // This function handles leaving the old room and joining a new one.
  // -----------------------------------------------------------
  const switchToRoom = (nextRoom: string) => {
    // If username is empty, we can only switch room locally (no socket events)
    if (!username.trim()) {
      // Just change active room in state
      setRoom(nextRoom);
      return;
    }

    // Notify server that user leaves the current room
    socket.emit("leave room", { username, room });
    // Notify server that user joins the new room
    socket.emit("join room", { username, room: nextRoom });

    // Update room state in the client
    setRoom(nextRoom);

    // Update URL to keep room name in query parameter for sharing
    try {
      // Create URL object from current location
      const url = new URL(window.location.href);
      // Set or replace ?room= parameter with new room name
      url.searchParams.set("room", nextRoom);
      // Replace current browser history entry with new URL
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      // If something goes wrong, log error but keep working
      console.error("Failed to update URL room:", e);
    }
  };

  // Small helper that calls switchToRoom only if room actually changes
  const handleSwitchRoom = (nextRoom: string) => {
    // Avoid unnecessary work if user clicks on already active room
    if (nextRoom !== room) switchToRoom(nextRoom);
  };

  // -----------------------------------------------------------
  // Open "Create chat" modal
  // Called when user clicks "+ create chat" button.
  // -----------------------------------------------------------
  const openCreateModal = () => {
    // Do not allow opening if username is empty
    if (!username.trim()) return;
    // Clear the new room name field
    setNewRoomName("");
    // Show the modal
    setIsCreateModalOpen(true);
  };

  // -----------------------------------------------------------
  // Confirm new room creation
  // Called when user presses "Create" in the modal.
  // -----------------------------------------------------------
  const handleCreateRoomConfirm = () => {
    // Trim the room name typed by user
    const clean = newRoomName.trim();
    // If name is empty, do nothing
    if (!clean) return;

    // Switch to new room and join it via sockets
    switchToRoom(clean);
    // Save this room to user's room list
    addRoomForUser(username, clean);

    // Close modal and clear input
    setIsCreateModalOpen(false);
    setNewRoomName("");
  };

  // Cancel creating new chat
  // Called when user presses "Cancel" in the modal.
  const handleCreateRoomCancel = () => {
    // Close modal window
    setIsCreateModalOpen(false);
    // Reset new room name field
    setNewRoomName("");
  };

  // -----------------------------------------------------------
  // Open invitation modal (WITHOUT auto-copy)
  // Builds a shareable link and opens "Invite friends" modal.
  // -----------------------------------------------------------
  const handleInvite = () => {
    // Build URL object from current location
    const url = new URL(window.location.href);
    // Update ?room= parameter so link contains the active room
    url.searchParams.set("room", room);
    // Convert URL object back to string form
    const link = url.toString();

    // Save generated link in state for display
    setInviteLink(link);
    // Reset copied state to false when opening modal
    setInviteCopied(false);
    // Show the invite modal
    setIsInviteModalOpen(true);
  };

  // Handle clicking the "Copy" button in invite modal
  const handleInviteCopyClick = () => {
    // If there is no link, do nothing
    if (!inviteLink) return;

    // Use browser Clipboard API to copy the link
    navigator.clipboard
      .writeText(inviteLink)
      // On success: set inviteCopied to true to show “Link copied” message
      .then(() => setInviteCopied(true))
      // On failure: keep inviteCopied false (or reset)
      .catch(() => setInviteCopied(false));
  };

  // Handle pressing "Close" in invite modal
  const handleInviteClose = () => setIsInviteModalOpen(false);

  // -----------------------------------------------------------
  // Open "Manage room" modal (rename / delete current room)
  // Called when user clicks "manage" next to room name.
  // -----------------------------------------------------------
  const openManageModal = () => {
    // If for some reason room name is empty, skip opening
    if (!room) return;
    // Remember which room is being managed
    setRoomToManage(room);
    // Pre-fill rename input with current room name
    setRenameValue(room);
    // Show the manage modal
    setIsManageModalOpen(true);
  };

  // -----------------------------------------------------------
  // Confirm renaming the room
  // Applies new room name and updates localStorage keys.
  // -----------------------------------------------------------
  const handleRenameRoomConfirm = () => {
    // If there is no room selected or user is not logged in, close modal
    if (!roomToManage || !username.trim()) {
      setIsManageModalOpen(false);
      return;
    }

    // Old name of room being renamed
    const oldRoom = roomToManage;
    // New name typed by user (trimmed)
    const nextName = renameValue.trim();

    // If new name is empty or the same as old, just close modal
    if (!nextName || nextName === oldRoom) {
      setIsManageModalOpen(false);
      return;
    }

    // 1) Update joinedRooms list by replacing old name with new name
    const currentList = joinedRooms;
    const updatedList = currentList.map((r) => (r === oldRoom ? nextName : r));
    // Save updated list in state
    setJoinedRooms(updatedList);
    // Save updated list in localStorage for this user
    saveUserRoomsList(username, updatedList);

    // 2) Move localStorage messages from old room key to new room key
    const oldMessagesKey = `chatMessages:${oldRoom}`;
    const newMessagesKey = `chatMessages:${nextName}`;
    try {
      // Read messages stored under the old key
      const savedMessages = localStorage.getItem(oldMessagesKey);
      if (savedMessages) {
        // Save same data under new key and remove old key
        localStorage.setItem(newMessagesKey, savedMessages);
        localStorage.removeItem(oldMessagesKey);
      }
    } catch (e) {
      // Log any error during messages moving
      console.error("Failed to move chat messages on rename:", e);
    }

    // 3) Move likes map for THIS user from old room key to new room key
    const oldLikedKey = `likedMap:${oldRoom}:${username || "guest"}`;
    const newLikedKey = `likedMap:${nextName}:${username || "guest"}`;
    try {
      // Read likes map from old key
      const savedLikes = localStorage.getItem(oldLikedKey);
      if (savedLikes) {
        // Save under new key and delete old key
        localStorage.setItem(newLikedKey, savedLikes);
        localStorage.removeItem(oldLikedKey);
      }
    } catch (e) {
      // Log any error during likes moving
      console.error("Failed to move likes map on rename:", e);
    }

    // 4) If we renamed the active room, switch the socket and UI to the new name
    if (room === oldRoom) {
      switchToRoom(nextName);
    }

    // Close manage modal and reset its state
    setIsManageModalOpen(false);
    setRoomToManage(null);
    setRenameValue("");
  };

  // -----------------------------------------------------------
  // Delete current room from this user's list
  // This is local-only: it does not actually destroy room for others.
  // -----------------------------------------------------------
  const handleDeleteRoom = () => {
    // If there is no selected room or no username, just close modal
    if (!roomToManage || !username.trim()) {
      setIsManageModalOpen(false);
      return;
    }

    // Remember which room is being deleted
    const target = roomToManage;

    // 1) Remove this room from the user's room list in state and storage
    const currentList = joinedRooms;
    const updatedList = currentList.filter((r) => r !== target);
    setJoinedRooms(updatedList);
    saveUserRoomsList(username, updatedList);

    // 2) Remove localStorage data for this room:
    //    - message history
    //    - likes map for this user in this room
    localStorage.removeItem(`chatMessages:${target}`);
    localStorage.removeItem(`likedMap:${target}:${username || "guest"}`);

    // 3) If the deleted room is currently active, move user to another room
    if (room === target) {
      // Default fallback room name
      let fallback = "general";

      if (updatedList.length > 0) {
        // If user still has other rooms, pick the first one in the list
        fallback = updatedList[0];
      } else {
        // If no rooms left, ensure "general" is added for this user
        addRoomForUser(username, "general");
      }

      // Switch socket and UI to fallback room
      switchToRoom(fallback);
    }

    // Close manage modal and reset its state
    setIsManageModalOpen(false);
    setRoomToManage(null);
    setRenameValue("");
  };

  // -----------------------------------------------------------
  // Logout: leave room + reset likes + clear local state
  // Called when user clicks "Logout" button.
  // -----------------------------------------------------------
  const handleLogout = () => {
    // Only do socket and storage cleanup if user was actually in chat
    if (isReady) {
      // Notify server that user leaves the current room
      socket.emit("leave room", { username, room });

      // Prepare localStorage keys for messages and likes of this room
      const storageKey = `chatMessages:${room}`;
      const likedKey = `likedMap:${room}:${username || "guest"}`;

      try {
        // Read saved messages from localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          // Parse array of messages
          const parsed = JSON.parse(saved);
          // Reset likes count to 0 for each message
          const reset = parsed.map((m: any) => ({ ...m, likes: 0 }));
          // Save updated messages back to localStorage
          localStorage.setItem(storageKey, JSON.stringify(reset));
        }
      } catch (err) {
        // Log any error during likes reset
        console.error("Failed to reset likes:", err);
      }

      // Remove this user's likes map for this room
      localStorage.removeItem(likedKey);
    }

    // Reset UI state to initial values
    setIsReady(false);      // show welcome screen again
    setUsername("");        // clear username
    setRoom("general");     // reset room to default
    setJoinedRooms([]);     // clear user's room list
  };

  // -----------------------------------------------------------
  // WELCOME SCREEN (before entering chat)
  // While user is not "ready", we show the welcome form.
  // -----------------------------------------------------------
  if (!isReady) {
    return (
      <div className="welcome-wrapper">
        <div className="welcome-card">
          {/* Main title of the welcome screen */}
          <h1 className="welcome-title">Live Chat</h1>
          {/* Short description under the title */}
          <p className="welcome-subtitle">
            Real-time chat. Your rooms. Your people.
          </p>

          {/* Username input field */}
          <input
            className="welcome-input"
            type="text"
            placeholder="Enter your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* Room input field OR value prefilled from ?room= query parameter */}
          <input
            className="welcome-input"
            type="text"
            placeholder="Create or join a room..."
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />

          {/* Button to enter chat and join selected room */}
          <button
            className="welcome-btn"
            onClick={() => {
              // Do nothing if username is empty after trimming
              if (!username.trim()) return;

              // Clean up username and room name from extra spaces
              const cleanName = username.trim();
              const cleanRoom = room.trim() || "general";

              // Save cleaned values into state
              setUsername(cleanName);
              setRoom(cleanRoom);

              // Tell server we join this room with this username
              socket.emit("join room", {
                username: cleanName,
                room: cleanRoom,
              });

              // Persist this room in user's room list in localStorage
              addRoomForUser(cleanName, cleanRoom);
              // Switch UI from welcome screen to chat screen
              setIsReady(true);
            }}
          >
            Start Chat
          </button>
        </div>
      </div>
    );
  }

  // If username is non-empty, show it as title; otherwise fall back to default title
  const titleText = username.trim() || "WebSocket Chat";

  // -----------------------------------------------------------
  // MAIN CHAT SCREEN
  // This block renders after user has passed welcome screen.
  // -----------------------------------------------------------
  return (
    <>
      {/* Outer chat container with glow and rounded corners */}
      <div className="chat-shell">
        {/* Header: username, LIVE indicator, current room, room list, buttons */}
        <header className="chat-header">
          {/* Left side: username, LIVE animation, room info, room switcher */}
          <div className="header-left">
            {/* Top row: username and LIVE indicator */}
            <div className="header-top">
              {/* App title showing current username or fallback text */}
              <h1 className="chat-title">{titleText}</h1>

              {/* LIVE animation block with dot and equalizer bars */}
              <div className="chat-subtitle">
                <span className="live-dot" />
                <span className="live-label">LIVE</span>
                <span className="live-equalizer">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>

            {/* Current room label and "manage" button next to it */}
            <div className="room-header-row">
              {/* Badge that shows name of the active room */}
              <span className="chat-room-label">{room}</span>
              {/* Show "manage" button only if user has at least one joined room */}
              {joinedRooms.length > 0 && (
                <button
                  type="button"
                  className="room-manage-btn"
                  onClick={openManageModal}
                >
                  manage
                </button>
              )}
            </div>

            {/* Room pills list and "+ create chat" button */}
            <div className="rooms-bar">
              {/* Render a pill button for each room the user has joined */}
              {joinedRooms.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`room-pill ${r === room ? "room-pill--active" : ""}`}
                  onClick={() => handleSwitchRoom(r)}
                >
                  {r}
                </button>
              ))}

              {/* Button to open "Create chat" modal */}
              <button
                type="button"
                className="room-pill room-pill--create"
                onClick={openCreateModal}
              >
                + create chat
              </button>
            </div>
          </div>

          {/* Right side: "Invite friends" and "Logout" buttons */}
          <div className="header-right">
            {/* Button to open invite modal and show room link */}
            <button
              type="button"
              className="header-btn header-btn-invite"
              onClick={handleInvite}
            >
              Invite friends
            </button>

            {/* Button to log out, reset state and go back to welcome screen */}
            <button
              type="button"
              className="header-btn header-btn-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Messages panel where chat history is displayed */}
        <main className="messages-panel">
          {/* ChatBody component handles message list, likes, and scroll */}
          <ChatBody room={room} username={username} />
        </main>

        {/* Footer with input and send button for new messages */}
        <footer className="chat-footer">
          {/* MessageInput handles message text and send action */}
          <MessageInput username={username} room={room} />
        </footer>
      </div>

      {/* ---------------------------------------------------------
         CREATE ROOM MODAL
         Renders only when isCreateModalOpen is true.
      --------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {/* Title of the create-room modal */}
            <h2 className="modal-title">Create new chat</h2>
            {/* Short explanation for user */}
            <p className="modal-subtitle">
              Name your room and start a separate conversation.
            </p>

            {/* Input field for the new room name */}
            <input
              className="modal-input"
              type="text"
              autoFocus
              placeholder="e.g. friends, work, study-group..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => {
                // If user presses Enter, trigger create-room logic
                if (e.key === "Enter") handleCreateRoomConfirm();
              }}
            />

            {/* Buttons row at the bottom of the create-room modal */}
            <div className="modal-actions">
              {/* Cancel button to close modal without creating room */}
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={handleCreateRoomCancel}
              >
                Cancel
              </button>
              {/* Confirm button that creates room and switches to it */}
              <button
                type="button"
                className="modal-btn"
                onClick={handleCreateRoomConfirm}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
         MANAGE ROOM MODAL (rename / delete)
         Renders only when isManageModalOpen is true and roomToManage is set.
      --------------------------------------------------------- */}
      {isManageModalOpen && roomToManage && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {/* Title of the manage-room modal */}
            <h2 className="modal-title">Room settings</h2>
            {/* Small description under the title */}
            <p className="modal-subtitle">
              Rename this room or remove it from your list.
            </p>

            {/* Input for the new room name (rename field) */}
            <input
              className="modal-input"
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                // If user presses Enter, trigger rename confirmation
                if (e.key === "Enter") {
                  // Prevent default form submission behavior
                  e.preventDefault();
                  // Call rename handler
                  handleRenameRoomConfirm();
                }
              }}
              placeholder="Room name..."
            />

            {/* Buttons in manage-room modal */}
            <div className="modal-actions">
              {/* Button that deletes room locally from the user's list */}
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={handleDeleteRoom}
              >
                Delete room
              </button>

              {/* Cancel button to just close modal without changes */}
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={() => {
                  // Close manage modal and reset related state
                  setIsManageModalOpen(false);
                  setRoomToManage(null);
                  setRenameValue("");
                }}
              >
                Cancel
              </button>
              {/* Button to save new room name and move related data */}
              <button
                type="button"
                className="modal-btn"
                onClick={handleRenameRoomConfirm}
              >
                Save name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
         INVITE FRIENDS MODAL
         Renders only when isInviteModalOpen is true.
      --------------------------------------------------------- */}
      {isInviteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {/* Title of the invite modal */}
            <h2 className="modal-title">Invite friends</h2>
            {/* Subtitle explaining that link opens the current room */}
            <p className="modal-subtitle">
              Share this link to bring people directly into{" "}
              <span className="modal-room-name">{room}</span> room.
            </p>

            {/* Row with read-only link input and copy button */}
            <div className="modal-link-box">
              {/* Read-only input that shows the invite link */}
              <input
                className="modal-input modal-input-link"
                type="text"
                readOnly
                value={inviteLink}
                onFocus={(e) => e.currentTarget.select()}
              />
              {/* Button to copy invite link to clipboard */}
              <button
                type="button"
                className="modal-btn modal-btn-small"
                onClick={handleInviteCopyClick}
              >
                Copy
              </button>
            </div>

            {/* Footer row with "Link copied" status and Close button */}
            <div className="modal-footer-row">
              {/* Show success status only when inviteCopied is true */}
              {inviteCopied && (
                <span className="modal-copy-status">Link copied ✨</span>
              )}

              {/* Close button to hide invite modal */}
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={handleInviteClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export App component as default export so it can be used by index.tsx
export default App;