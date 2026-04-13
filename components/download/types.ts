export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
}

export interface DownloadResult {
  id: number;
  success: boolean;
  message: string;
}
