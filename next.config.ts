import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: "/elo", destination: "/RP", permanent: false },
      { source: "/elo/:path*", destination: "/RP/:path*", permanent: false },
      { source: "/season5/np", destination: "/NP", permanent: false },
      { source: "/season5", destination: "/NP/minigame", permanent: false },
      { source: "/season5/:path*", destination: "/NP/:path*", permanent: false },
      { source: "/entry", destination: "/season4/entry", permanent: false },
      { source: "/entry/:path*", destination: "/season4/entry/:path*", permanent: false },
      { source: "/predict", destination: "/season4/predict", permanent: false },
      { source: "/players", destination: "/season4/players", permanent: false },
      { source: "/schedule", destination: "/season4/schedule", permanent: false },
      { source: "/schedule/:path*", destination: "/season4/schedule/:path*", permanent: false },
      { source: "/results", destination: "/season4/results", permanent: false },
      { source: "/results/:path*", destination: "/season4/results/:path*", permanent: false },
      { source: "/db", destination: "/Pro", permanent: false },
      { source: "/roster", destination: "/season4/roster", permanent: false },
      { source: "/roster/:path*", destination: "/season4/roster/:path*", permanent: false },
      { source: "/rules", destination: "/season4/rules", permanent: false },
      { source: "/rules/:path*", destination: "/season4/rules/:path*", permanent: false },
      { source: "/playoff", destination: "/season4/playoff", permanent: false },
      { source: "/Pro/db", destination: "/Pro", permanent: false },
    ];
  },
};

export default nextConfig;
