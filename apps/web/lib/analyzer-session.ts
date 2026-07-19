const REQUESTED_ANALYSIS_URL_KEY = "media_loader_requested_analysis_url";

export function requestMediaAnalysis(url: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REQUESTED_ANALYSIS_URL_KEY, url);
}

export function consumeRequestedMediaAnalysis() {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(REQUESTED_ANALYSIS_URL_KEY);
  sessionStorage.removeItem(REQUESTED_ANALYSIS_URL_KEY);
  return url;
}
