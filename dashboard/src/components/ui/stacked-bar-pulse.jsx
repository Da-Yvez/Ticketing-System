import React from "react";
import { motion } from "framer-motion";

export const StackedBarPulse = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '32px', alignItems: 'center' }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#fff', // White color since our overlay will be dark
          borderRadius: '9999px'
        }}
        animate={{ opacity: [0.2, 1, 0.2], width: ["50%", "100%", "50%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.2,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export default StackedBarPulse;
