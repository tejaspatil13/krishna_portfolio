const videoMb = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_MB) || 200;

export const LIMITS = {
  videoMb,
  videoBytes: videoMb * 1024 * 1024,
  posterBytes: 5 * 1024 * 1024,
};

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const POSTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
