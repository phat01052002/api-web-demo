import md5 from 'md5';
import jsonwebtoken from 'jsonwebtoken';
import axios from 'axios';
import UserRepository from '../../repositories/UserRepository.js';
import { generateAccessToken, generateRefreshToken } from '../../middleware/auth.middleware.js';

class AuthService {
    async registerSubAdmin(req) {
        try {
            const user = await UserRepository.findByEmail(req.body.email);
            if (user) {
                return 'Account have already exist';
            }
            req.body.password = md5(req.body.password);
            req.body.role="SUB_ADMIN"
            req.body.status="ACTIVE"
            //
            await UserRepository.save(req);
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async register(req) {
        try {
            const user = await UserRepository.findByEmail(req.body.email);
            if (user) {
                return 'Account have already exist';
            }
            req.body.password = md5(req.body.password);
            //
            await UserRepository.save(req);
            return 'Success';
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }
    async registerGmail(req) {
        try {
            req.body.password = md5(req.body.password);
            //
            req.body.status = 'ACTIVE';
            return await UserRepository.save(req);
        } catch {}
    }

    async register_2fa(req) {
        try {
            const user = await UserRepository.findByEmail(req.body.email);
            if (user) {
                if (user.codeExpiry < new Date().getTime()) {
                    return 'Code expery';
                }
                if (String(user.code) == req.body.code) {
                    await UserRepository.update(user.id, { codeExpiry: null, code: null, status: 'ACTIVE' });
                    return 'Success';
                }
            }
        } catch (e) {
            console.log(e.message);
            return 'Fail';
        }
    }

    async login(email, password) {
        try {
            const user = await UserRepository.findUserByEmailAndPassword(email, md5(password));
            if (!user) {
                return 'Phone or password is incorrect';
            }
            if (!user.active) {
                return 'You have been baned';
            }
            if (user) {
                if (user.status == 'ACTIVE') {
                    const accessToken = generateAccessToken(user.email);
                    const refreshToken = generateRefreshToken(user);
                    await UserRepository.update(user.id, { refreshToken: refreshToken });
                    return { accessToken, refreshToken };
                }
                return 'Account is inActive';
            }
            return 'Phone or password is incorrect';
        } catch (e) {
            console.log(e.message, 'login fail');
            return 'Fail';
        }
    }

    isAdmin(req) {
        if (req.user.role == 'ADMIN') {
            return true;
        }
        return false;
    }
    isCTV(req) {
        if (req.user.role == 'CTV') {
            return true;
        }
        return false;
    }
}

export default new AuthService();
