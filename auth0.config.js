module.exports = {
  routes: {
    login: '/auth/login',
    callback: '/auth/callback',
    logout: '/auth/logout',
  },
  session: {
    name: 'appSession',
    rolling: true,
    rollingDuration: 60 * 60 * 24, // 1 day
    absoluteDuration: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      domain: process.env.NODE_ENV === 'production' ? 'ai-chatbot-v2-three.vercel.app' : undefined,
      path: '/',
      transient: false,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    },
  },
  auth0Logout: true,
};
