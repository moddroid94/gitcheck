import dotenv from 'dotenv';
dotenv.config();

export const config = {
  githubToken: process.env.GITHUB_TOKEN || '',
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '60'), // minutes
};
