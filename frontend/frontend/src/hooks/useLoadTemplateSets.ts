import { useCallback, useEffect } from "react";

import { fetchTemplateSets } from "../api/sets";
import { getErrorMessage } from "../lib/common/error";
import { toast } from "../lib/ui/toast";
import { useAppStore } from "../store/appStore";

export const useLoadTemplateSets = (opts?: { silent?: boolean }) => {
  const setTemplateSets = useAppStore((s) => s.setTemplateSets);
  const setGlobalSetId = useAppStore((s) => s.setGlobalSetId);

  const load = useCallback(async () => {
    try {
      const data = await fetchTemplateSets();
      setTemplateSets(data);
      const st = useAppStore.getState();
      if (data.length && !st.globalSetId) {
        setGlobalSetId(data[0].id);
      }
      return data;
    } catch (e) {
      if (!opts?.silent) {
        toast.error(`Sets konnten nicht geladen werden: ${getErrorMessage(e)}`);
      }
      return [];
    }
  }, [setTemplateSets, setGlobalSetId, opts?.silent]);

  useEffect(() => {
    void load();
  }, [load]);

  return { reload: load };
};
