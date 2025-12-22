import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'logs', 'api.log');
fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

export const apiLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logEntry = {
            time: new Date().toISOString(),
            method: req.method,
            endpoint: req.originalUrl,
            user: req.user ? req.user.id : 'Guest',
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            status: res.statusCode,
            duration: duration + 'ms'
        };

        fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', (err) => {
            if(err) console.error('Failed to write API log', err);
        });
    });

    next();
};