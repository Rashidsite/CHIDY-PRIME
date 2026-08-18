'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  formatter?: (val: number) => string;
  duration?: number;
}

export default function AnimatedCounter({ value, formatter, duration = 1.2 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);

  const spring = useSpring(0, {
    stiffness: 75,
    damping: 18,
    duration: duration * 1000,
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
  }, [spring]);

  return (
    <span>
      {formatter ? formatter(displayValue) : displayValue.toLocaleString()}
    </span>
  );
}
