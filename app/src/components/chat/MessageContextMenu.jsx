import { useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Edit2, Trash2 } from 'lucide-react';


const clampPosition = (x, y) => {
  const padding = 8;
  const width = 200;
  const height = 220;
  return {
    x: Math.min(Math.max(padding, x), window.innerWidth - width - padding),
    y: Math.min(Math.max(padding, y), window.innerHeight - height - padding),
  };
};

export const MessageContextMenu = memo(function MessageContextMenu({
  x, y, isOwn, onClose, onCopy, onEdit, onDelete,
}) {
  const menuRef = useRef(null);
  const clamped = clampPosition(x, y);

  useEffect(() => {
    const handleClose = () => onClose();
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const tid = setTimeout(() => {
      window.addEventListener('click', handleClose);
      window.addEventListener('contextmenu', handleClose);
      window.addEventListener('scroll', handleClose, true);
    }, 0);
    window.addEventListener('keydown', handleEscape);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('click', handleClose);
      window.removeEventListener('contextmenu', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const items = [
    { icon: Copy, label: 'Copy Text', onClick: onCopy, danger: false },
    ...(isOwn && onEdit ? [{ icon: Edit2, label: 'Edit', onClick: onEdit, danger: false }] : []),
    ...(isOwn && onDelete ? [{ icon: Trash2, label: 'Delete Message', onClick: onDelete, danger: true }] : []),
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[100] bg-[#1A1D2B] backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-[#2A2D3E] py-1.5 min-w-[180px] overflow-hidden"
      style={{ left: clamped.x, top: clamped.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      {items.map((item, idx) => (
        <button
          key={item.label}
          onClick={() => { item.onClick(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium transition-colors duration-100 relative z-10 ${
            item.danger
              ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
              : 'text-[#D1D5E0] hover:bg-white/[0.06] hover:text-white'
          } ${idx > 0 && item.danger ? 'border-t border-[#2A2D3E] mt-0.5 pt-2.5' : ''}`}
        >
          <item.icon className="h-4 w-4 opacity-50" />
          {item.label}
        </button>
      ))}
    </motion.div>
  );
});
