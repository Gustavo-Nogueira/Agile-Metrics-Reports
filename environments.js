import dotenv from 'dotenv';
dotenv.config();

const ENVIRONMENTS = {
    REPOSITORY_URL: process.env.REPOSITORY_URL,
    ZENHUB_TOKEN: process.env.ZENHUB_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
};

export default ENVIRONMENTS;