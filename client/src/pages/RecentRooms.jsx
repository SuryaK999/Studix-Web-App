import { useEffect, useState } from 'react';
import { getRecentRooms } from '@/utils/recentRooms';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, ArrowRight } from 'lucide-react';

export default function RecentRooms() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setRooms(getRecentRooms());
  }, []);

  return (
    <div className="flex-1 w-full bg-background p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto pt-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Recent Rooms</h2>
        </div>

        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-black/5 dark:bg-white/5 rounded-3xl border border-border">
            <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">You haven't visited any rooms recently.</p>
            <button 
              onClick={() => navigate('/rooms')}
              className="mt-6 px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-bold text-sm transition-colors"
            >
              Explore Rooms
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
                    <span className="text-lg font-black text-primary">{room.name?.charAt(0)?.toUpperCase() || 'R'}</span>
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
