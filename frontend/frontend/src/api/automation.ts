import { apiJson } from "./client";

export type ImageTaskRow = {
  id: string;
  status: string;
  error_message: string;
  generated_title: string;
  generated_tags: string[];
  generated_description: string;
  mockup_paths: string[];
  original_image: string | null;
  high_res_image: string | null;
  created_at: string;
  updated_at: string;
};

export type AutomationJobResponse = {
  id: string;
  status: string;
  ai_model_name: string;
  upscale_factor: number;
  mockup_set: string;
  mockup_set_name: string | null;
  gelato_profile: string;
  result_zip: string | null;
  result_zip_url: string | null;
  error_message: string;
  progress_percentage: number;
  tasks: ImageTaskRow[];
  created_at: string;
  updated_at: string;
};

export const createAutomationJob = (
  form: FormData,
): Promise<AutomationJobResponse> =>
  apiJson<AutomationJobResponse>("/api/automation/jobs/", {
    method: "POST",
    body: form,
  });

export const getAutomationJob = (
  id: string,
): Promise<AutomationJobResponse> =>
  apiJson<AutomationJobResponse>(`/api/automation/jobs/${id}/`);
