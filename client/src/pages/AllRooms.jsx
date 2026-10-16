import { useEffect } from 'react';
import { useRoomsStore } from '@/store/roomsStore';
import { useNavigate } from 'react-router-dom';
import { Grid, Users, ArrowRight } from 'lucide-react';

export default function AllRooms() {
  const { rooms, subscribeRooms, loading } = useRoomsStore();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeRooms();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [subscribeRooms]);

  return (
    <div className="flex-1 w-full bg-background p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto pt-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Grid className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Active Study Rooms</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
               <div key={i} className="h-24 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-black/5 dark:bg-white/5 rounded-3xl border border-border">
            <Grid className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No open study rooms currently.</p>
            <button className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground hover:brightness-110 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20">
              Create a Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map(room => (
              <div
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="group relative flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border hover:border-primary/30 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-primary/20">
                  {room.avatarUrl ? (
                    <img src={room.avatarUrl} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-primary">{room.name?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">{room.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {room.membersCount || 1} members</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
