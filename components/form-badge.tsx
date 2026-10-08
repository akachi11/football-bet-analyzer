"use client";

import { motion } from "framer-motion";
import { getFormColor } from "@/lib/utils";

interface FormBadgeProps {
  form: string;
}

export function FormBadge({ form }: FormBadgeProps) {
  if (!form) return null;

  return (
    <div className="flex items-center gap-1">
      {form.split("").map((result, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.08, duration: 0.3, ease: "backOut" }}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white ${getFormColor(result)}`}
        >
          {result}
        </motion.span>
      ))}
    </div>
  );
}
