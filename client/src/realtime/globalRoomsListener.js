import { useGlobalRoomSearch } from '@/store/globalRoomSearchStore';
import { fetchExploreRooms } from '@/services/api';
import { socketService } from '@/lib/socket';

export function startGlobalRoomsListener() {
  const store = useGlobalRoomSearch.getState();
  store.setLoading(true);

  let unsubscribeSocket = () => {};

  // 1. Initial Fetch
  fetchExploreRooms()
    .then((rooms) => {
      // API returns them sorted by createdAt desc by default
      store.setAllRooms(rooms);
      store.setLoading(false);
      
      // 2. Realtime Socket Sync
      // Connect socket if not already connected
      socketService.connect().then((socket) => {
        const handleNewRoom = (newRoom) => {
          console.log(`[GlobalRoomsListener] Realtime new room observed: ${newRoom.name}`);
          const currentRooms = useGlobalRoomSearch.getState().allRooms;
          // Unshift to place at the top of the 'latest' pile
          useGlobalRoomSearch.getState().setAllRooms([newRoom, ...currentRooms]);
        };

        socket.on('global:room_created', handleNewRoom);

        unsubscribeSocket = () => {
          socket.off('global:room_created', handleNewRoom);
        };
      }).catch((err) => {
        console.error('Failed to bind global rooms socket:', err);
      });
    })
    .catch((err) => {
      console.error("[GlobalRoomsListener] Error fetching rooms:", err);
      store.setLoading(false);
    });

  return () => {
    unsubscribeSocket();
  };
}
