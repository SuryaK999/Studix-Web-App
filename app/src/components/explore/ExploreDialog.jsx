import { useState, useEffect } from "react";
import { useGlobalRoomSearch } from "@/store/globalRoomSearchStore";
import { useExploreDialog } from "@/store/exploreDialogStore";
import { useNavigate } from "react-router-dom";
import { Search, Users, ArrowRight, X, TrendingUp } from "lucide-react";

export default function ExploreDialog() {
  const { query, setQuery, allRooms, results, setResults } = useGlobalRoomSearch();
  const { open: exploreOpen, openDialog, closeDialog } = useExploreDialog();
  const navigate = useNavigate();

  // Handle instant search filtering
  useEffect(() => {
    const q = query.toLowerCase().trim();

    if (!q) {
      // Default to trending rooms when query is empty
      const trending = [...allRooms]
        .sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0))
        .slice(0, 10);
      setResults(trending);
      return;
    }

    const filtered = allRooms
      .filter(room => 
        room.name?.toLowerCase().includes(q) ||
        room.description?.toLowerCase().includes(q) ||
        room.tags?.some(tag => tag.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const aExact = a.name?.toLowerCase() === q;
        const bExact = b.name?.toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        const aStarts = a.name?.toLowerCase().startsWith(q);
        const bStarts = b.name?.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return (b.membersCount || 0) - (a.membersCount || 0);
      });

    setResults(filtered);
  }, [query, allRooms, setResults]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openDialog]);

  // Global radial search action
  useEffect(() => {
    const handleRadial = (e) => {
      if (e.detail?.action === 'glob-search') {
        openDialog();
      }
    };
    window.addEventListener('studix:action', handleRadial);
    return () => window.removeEventListener('studix:action', handleRadial);
  }, [openDialog]);

  // Reset query on close
  useEffect(() => {
    if (!exploreOpen) setQuery("");
  }, [exploreOpen, setQuery]);

  if (!exploreOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeDialog}
      />
      
      {/* Search Modal */}
      <div className="relative w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
        
        {/* Search Input Area */}
        <div className="p-4 border-b border-border flex items-center gap-3 bg-black/5 dark:bg-white/5">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-lg py-1"
            placeholder="Search all active rooms..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button 
            onClick={closeDialog}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {(!query && results.length > 0) && (
            <div className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 break-words">
              <TrendingUp className="w-3.5 h-3.5" /> Trending Rooms
            </div>
          )}
          {results.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No rooms found matching "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {results.map(room => (
                <div
                  key={room.id}
                  onClick={() => {
                    navigate(`/room/${room.id}`);
                    closeDialog();
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer group transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden text-primary font-bold">
                    {room.avatarUrl ? (
                      <img src={room.avatarUrl} alt={room.name} className="w-full h-full object-cover" />
                    ) : (
                      room.name?.charAt(0)?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {room.name}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" /> {room.membersCount || 1} members
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
