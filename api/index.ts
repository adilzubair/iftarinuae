import { createApp } from "../server/app";

// Vercel Serverless Function Entry Point
export default async function handler(req: any, res: any) {
    const app = await createApp();
    app(req, res);
}
