import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "../ui/Card";
import { Dropzone } from "../ui/Dropzone";

type Props = {
  onFiles: (files: FileList | null) => void;
};

export const ArtworkUploader = ({ onFiles }: Props) => {
  const [dropFlash, setDropFlash] = useState(false);

  useEffect(() => {
    if (!dropFlash) return;
    const t = window.setTimeout(() => setDropFlash(false), 380);
    return () => window.clearTimeout(t);
  }, [dropFlash]);

  const handleList = (files: FileList | null) => {
    onFiles(files);
  };

  return (
    <motion.div
      animate={
        dropFlash
          ? {
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 1px 2px rgb(0 0 0 / 0.05)",
                "0 0 0 2px rgb(99 102 241 / 0.35)",
                "0 1px 2px rgb(0 0 0 / 0.05)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="rounded-xl"
    >
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Upload size={18} strokeWidth={1.75} className="text-indigo-600" />
          Motive hochladen
        </h2>
        <Dropzone
          title={
            <span className="text-sm text-slate-600">
              <span className="font-medium text-indigo-600">Klicken</span> oder Dateien hierher ziehen
            </span>
          }
          description="Mehrere Motive gleichzeitig auswählbar."
          icon={<Upload className="mb-1 h-8 w-8 text-slate-400" strokeWidth={1.5} />}
          multiple
          accept="image/*"
          onPickFiles={handleList}
          onDropComplete={() => setDropFlash(true)}
          onChange={(e) => {
            handleList(e.target.files);
            e.target.value = "";
          }}
        />
      </Card>
    </motion.div>
  );
};
