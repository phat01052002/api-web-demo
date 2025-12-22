import httpStatus from 'http-status';
import jsonwebtoken from 'jsonwebtoken';
import UserRepository from '../repositories/UserRepository.js';

const apiKeyCheck = (req) => {
    if (
        process.env.OPEN_API_KEY &&
        process.env.OPEN_API_KEY === req.query.apiKey &&
        (req.path.indexOf('/user') === 0 ||
            req.path.indexOf('/auth') === 0 ||
            req.path.indexOf('/admin') === 0 ||
            /\/user\/+[0-9]+/gm.test(req.path) ||
            /\/auth\/+[0-9]+/gm.test(req.path) ||
            /\/admin\/+[0-9]+/gm.test(req.path))
    ) {
        return true;
    }

    return false;
};

export const isAuth = async (req, res, next) => {
    if (apiKeyCheck(req)) {
        return next();
    }
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: httpStatus[401] });
    }

    const token = authHeader && authHeader.split(' ')[1];

    try {
        const verified = jsonwebtoken.verify(token, process.env.TOKEN_SECRET);

        if (!verified) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: httpStatus['401_MESSAGE'] });
        }

        req.user = await UserRepository.findByEmail(verified.email);
        if (req.user.active == false) {
            return res.status(403).json({ message: 'Access denied. User has been banned.' });
        }

        return next();
    } catch (err) {
        console.error(err.message, err.name);
        if (err.name === 'TokenExpiredError') {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Token has expired' });
        }
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
    }
};

export const isAdmin = (req, res, next) => {
    if(req.user && req.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Admins only' });
}

export const generateRefreshToken = (user) => {
    try {
        return jsonwebtoken.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: 60 * 60 * 72,
        });
    } catch (e) {
        console.error(e.message);
    }
};

export const generateAccessToken = (email) => {
    const token = jsonwebtoken.sign({ email: email }, process.env.TOKEN_SECRET, {
        expiresIn: 60 * 60 * 10,
    });
    return token;
};
