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
      path: '/',
      transient: false,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    },
  },
  auth0Logout: true,
  baseURL: process.env.AUTH0_BASE_URL,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
};
