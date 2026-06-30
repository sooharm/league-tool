export function isDevPredictPreviewEnabled() {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  return process.env.DEV_PREDICT_PREVIEW !== "false";
}
