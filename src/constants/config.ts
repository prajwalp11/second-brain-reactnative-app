// Toggle this when deploying
const ENV = 'local' as 'local' | 'production';

const CONFIG = {
  local: {
    BASE_URL: 'https://rylan-skinless-waltraud.ngrok-free.dev/api',
  },
  production: {
    // Replace with your deployed server URL when you go live
    BASE_URL: 'https://your-deployed-server.com/api',
  },
};

export const API_BASE_URL = CONFIG[ENV].BASE_URL;
