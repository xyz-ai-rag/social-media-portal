module.exports = {
    apps: [
      {
        name: 'social-media-portal',
        script: 'npm',
        args: 'run start',
        env: {
          PORT: 3001,
          NODE_ENV: 'production'
        }
      }
    ]
  }
  