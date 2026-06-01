import { motion } from 'framer-motion';

export function TypingIndicator({ typingUsers }) {
  if (typingUsers.length === 0) return null;

  const displayNames = typingUsers.slice(0, 3);
  const remainingCount = typingUsers.length - displayNames.length;

  let text = '';
  if (displayNames.length === 1) {
    text = `${displayNames[0]} is typing`;
  } else if (displayNames.length === 2) {
    text = `${displayNames[0]} and ${displayNames[1]} are typing`;
  } else if (displayNames.length === 3 && remainingCount === 0) {
    text = `${displayNames[0]}, ${displayNames[1]}, and ${displayNames[2]} are typing`;
  } else {
    text = `${displayNames.join(', ')} and ${remainingCount} other${remainingCount > 1 ? 's' : ''} are typing`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 text-[11px] text-[#8E9297] bg-transparent"
    >
      <div className="flex gap-1 items-center bg-white/[0.03] backdrop-blur-md border border-white/10 px-2 py-1.5 rounded-full">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-1.5 h-1.5 bg-primary rounded-full"
        />
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="w-1.5 h-1.5 bg-primary rounded-full"
        />
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="w-1.5 h-1.5 bg-primary rounded-full"
        />
      </div>
      <span className="font-bold tracking-tight uppercase leading-none opacity-80">{text}...</span>
    </motion.div>
  );
}
