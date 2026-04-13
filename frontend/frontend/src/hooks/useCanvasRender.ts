import { useMemo } from "react";

import { compressImage, loadImage } from "../lib/canvas/image";
import { drawRealisticFrame } from "../lib/canvas/frame";
import { renderElementToCanvas } from "../lib/canvas/renderElement";

export const useCanvasRender = () =>
  useMemo(
    () => ({
      loadImage,
      compressImage,
      drawRealisticFrame,
      renderElementToCanvas,
    }),
    [],
  );
