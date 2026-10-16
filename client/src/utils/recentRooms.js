export const addRecentRoom = (room) => {
  const existing = JSON.parse(localStorage.getItem("recentRooms")) || [];
  
  // Filter out the room if it already exists to move it to the front
  const filtered = existing.filter(r => r.id !== room.id);
  
  // Prepend and limit to 8
  const updated = [room, ...filtered].slice(0, 8);
  
  localStorage.setItem("recentRooms", JSON.stringify(updated));
  return updated;
};

export const getRecentRooms = () => {
  return JSON.parse(localStorage.getItem("recentRooms")) || [];
};
