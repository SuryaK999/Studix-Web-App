'use client';

import * as React from "react";
import { motion, isMotionComponent } from 'framer-motion';
import { cn } from '@/lib/utils';



function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    });
  };
}

function mergeProps(childProps, slotProps) {
  const merged = { ...childProps, ...slotProps };

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className ,
      slotProps.className ,
    );
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style),
      ...(slotProps.style),
    };
  }

  return merged;
}

const motionComponentCache = new Map();

function getMotionComponent(type) {
  if (typeof type === 'object' && type !== null && isMotionComponent(type)) {
    return type;
  }
  let comp = motionComponentCache.get(type);
  if (!comp) {
    comp = motion.create(type);
    motionComponentCache.set(type, comp);
  }
  return comp;
}

function Slot({ children, ref, ...props }) {
  if (!React.isValidElement(children)) return null;

  const Base = getMotionComponent(children.type);
  const { ref: childRef, ...childProps } = children.props;
  const mergedProps = mergeProps(childProps, props);

  return React.createElement(Base, {
    ...mergedProps,
    ref: mergeRefs(childRef, ref),
  });
}

export { Slot };
