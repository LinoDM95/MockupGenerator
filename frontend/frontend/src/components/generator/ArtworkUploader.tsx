import { Layers } from "lucide-react";

import { Card } from "../ui/Card";
import { Dropzone } from "../ui/Dropzone";

type Props = {
  onFiles: (files: FileList | null) => void;
};

export const ArtworkUploader = ({ onFiles }: Props) => {
  const handleList = (list: FileList | null) => {
    onFiles(list);
  };

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <span className="text-blue-600">⬆</span> Motive hochladen
      </h2>
      <Dropzone
        title={
          <span className="text-sm text-neutral-600">
            <span className="font-semibold text-blue-600">Klicken</span> oder Dateien hierher ziehen
          </span>
        }
        description="Mehrere Motive gleichzeitig auswählbar."
        icon={<Layers className="mb-3 h-10 w-10 text-neutral-400" />}
        multiple
        accept="image/*"
        onPickFiles={handleList}
        onChange={(e) => {
          handleList(e.target.files);
          e.target.value = "";
        }}
      />
    </Card>
  );
};
