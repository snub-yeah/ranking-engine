module.exports = {
  apps: [
    {
      name: 'ranking-backend',
      cwd: './backend',
      script: 'npm run dev',
      args: '',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'ranking-frontend', 
      cwd: './frontend',
      script: 'npm run dev',
      args: '-- --host 0.0.0.0',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};

