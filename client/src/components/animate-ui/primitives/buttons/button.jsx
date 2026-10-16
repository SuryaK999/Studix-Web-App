'use client';

import { motion } from 'framer-motion';

import { Slot } from '@/components/animate-ui/primitives/animate/slot';


function Button({
  hoverScale = 1.05,
  tapScale = 0.95,
  asChild = false,
  ...props
}) {
  const Component = asChild ? Slot : motion.button;

  return (
    <Component
      whileTap={{ scale: tapScale }}
      whileHover={{ scale: hoverScale }}
      {...props}
    />
  );
}

export { Button };
