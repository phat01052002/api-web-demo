import httpStatus from 'http-status';
import md5 from 'md5';
import jsonwebtoken from 'jsonwebtoken';

import { generateAccessToken, generateRefreshToken, isAuth } from '../../middleware/auth.middleware.js';
import UserRepository from '../../repositories/UserRepository.js';
import AuthService from '../../services/auth/AuthService.js';
import nodemailer from 'nodemailer';

class AuthController {
    initRoutes(app) {
        app.post('/auth/login', this.login);
        app.post('/auth/register', this.register);
        app.post('/auth/register-2fa', this.register_2fa);
        app.post('/auth/forget-password', this.forgetPassword);
        app.post('/auth/refreshToken', this.getNewAccessToken);
        app.post('/auth/require-otp', this.requireOtp);
        app.post('/auth/login-gmail', this.loginGmail);
        app.post('/auth/forget-password-2fa', this.forgetPassword_2fa);
        app.post('/auth/verify-otp', this.verifyOtp);
        app.post('/auth/change-password', isAuth, this.changePassword);
    }

    async changePassword(req, res) {
        try {
            await UserRepository.update(req.user.id, { password: md5(req.body.password) });
            return res.status(httpStatus.OK).json({ message: 'Success' });
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async verifyOtp(req, res) {
        try {
            const user = await UserRepository.findByEmail(req.body.email);
            if (user) {
                if (user.codeExpiry < new Date().getTime()) {
                    return res.status(httpStatus.OK).json({ message: 'Code expired' });
                }
                if (String(user.code) == req.body.code) {
                    await UserRepository.update(user.id, { codeExpiry: null, code: null, status: 'ACTIVE' });
                    return res
                        .status(httpStatus.OK)
                        .json({ message: 'Success', token: generateAccessToken(req.body.email) });
                }
            }
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async requireOtp(req, res) {
        try {
            const user = await UserRepository.findByEmail(req.body.email);
            if (user) {
                if (user.codeExpiry < new Date().getTime()) {
                    const fiveMinutesFromNow = new Date(new Date().getTime() + 5 * 60 * 1000);
                    const randomOTP = Math.floor(100000 + Math.random() * 900000);
                    await UserRepository.update(user.id, { code: randomOTP, codeExpiry: fiveMinutesFromNow });
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'chauthuanphat10@gmail.com',
                            pass: process.env.GGP,
                        },
                    });
                    const mailOptions = {
                        from: 'chauthuanphat10@gmail.com',
                        to: req.body.email,
                        subject: 'Your OTP ',
                        text: String(randomOTP),
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
                        } else {
                            return res.status(200).json({ message: 'Email sent successfully' });
                        }
                    });
                }
                return res.status(httpStatus.OK).json({ message: 'More require' });
            } else {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Account not found' });
            }
        } catch (e) {
            console.error(e.message);
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async getNewAccessToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.sendStatus(401);

            const user = await UserRepository.findByRefreshToken(refreshToken);
            if (!user) return res.status(403).json({ message: 'token wrong' });

            jsonwebtoken.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, data) => {
                if (err) return res.status(403).json({ message: 'token invalid' });
                const user = await UserRepository.find(data.id);
                const accessToken = generateAccessToken(user.email);
                return res.status(httpStatus.OK).json({ message: 'success', accessToken });
            });
        } catch {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async forgetPassword(req, res) {
        try {
            const user = await UserRepository.findByEmail(req.body.email);
            if (user) {
                const fiveMinutesFromNow = new Date(new Date().getTime() + 5 * 60 * 1000);
                const randomOTP = Math.floor(100000 + Math.random() * 900000);
                await UserRepository.update(user.id, { code: randomOTP, codeExpiry: fiveMinutesFromNow });
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'chauthuanphat10@gmail.com',
                        pass: process.env.GGP,
                    },
                });
                const mailOptions = {
                    from: 'chauthuanphat10@gmail.com',
                    to: req.body.email,
                    subject: 'Your OTP ',
                    text: String(randomOTP),
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        res.status(500).send(error.message);
                    } else {
                        res.status(httpStatus.OK).json({ message: 'Email sent successfully' });
                    }
                });
            } else {
                return res.status(httpStatus.OK).json({ message: 'User not found' });
            }
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async forgetPassword_2fa(req, res) {
        try {
            const register_2faRes = await AuthService.register_2fa(req);
            if (register_2faRes == 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            if (register_2faRes == 'Code expery') {
                return res.status(httpStatus.CONFLICT).json({ message: 'Code expery' });
            }
            if (register_2faRes == 'Success') {
                const user = await UserRepository.findByEmail(req.body.email);
                if (user) {
                    const refreshToken = generateRefreshToken(user);
                    const accessToken = generateAccessToken(user.email);
                    await UserRepository.update(user.id, { refreshToken: refreshToken });
                    return res
                        .status(httpStatus.OK)
                        .json({ message: 'Success', accessToken: accessToken, refreshToken: refreshToken });
                }
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async register_2fa(req, res) {
        try {
            const register_2faRes = await AuthService.register_2fa(req);
            if (register_2faRes == 'Fail') {
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
            if (register_2faRes == 'Code expery') {
                return res.status(httpStatus.CONFLICT).json({ message: 'Code expery' });
            }
            if (register_2faRes == 'Success') {
                const user = await UserRepository.findByEmail(req.body.email);
                if (user) {
                    const refreshToken = generateRefreshToken(user);
                    const accessToken = generateAccessToken(user.email);
                    await UserRepository.update(user.id, { refreshToken: refreshToken });
                    return res
                        .status(httpStatus.OK)
                        .json({ message: 'Success', accessToken: accessToken, refreshToken: refreshToken });
                }
                return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
            }
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }
    async register(req, res) {
        try {
            const registerRes = await AuthService.register(req);
            if (registerRes === "Success") {
                return res.status(httpStatus.OK).json({ message: 'Success' });
            } else if (registerRes == 'Account have already exist') {
                return res.status(httpStatus.OK).json({ message: 'Account have already exist' });
            } else {
                return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Account creation fail ' });
            }
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Fail' });
        }
    }

    async login(req, res) {
        try {
            const dataRes = await AuthService.login(req.body.email, req.body.password);
            if (dataRes == 'You have been baned') {
                return res.status(httpStatus.OK).json({
                    message: 'You have been baned',
                });
            }
            if (dataRes == 'Phone or password is incorrect') {
                return res.status(httpStatus.OK).json({ message: 'Phone or password is incorrect' });
            }
            if (dataRes == 'Account is inActive') {
                return res.status(httpStatus.OK).json({ message: 'Account is inActive' });
            }
            if (dataRes == 'Phone or password is incorrect') {
                return res.status(httpStatus.OK).json({ message: 'Phone or password is incorrect' });
            }
            if (dataRes) {
                return res.status(httpStatus.OK).json({
                    message: 'Login success',
                    refreshToken: dataRes.refreshToken,
                    accessToken: dataRes.accessToken,
                });
            }
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Login Fail' });
        }
    }

    async loginGmail(req, res) {
        try {
            const dataRes = await AuthService.login(req.body.email, req.body.password);
            if (dataRes == 'You have been baned') {
                return res.status(httpStatus.OK).json({
                    message: 'You have been baned',
                });
            }
            if (dataRes == 'Phone or password is incorrect') {
                const user = await AuthService.registerGmail(req);
                const accessToken = generateAccessToken(user.email);
                const refreshToken = generateRefreshToken(user);
                await UserRepository.update(user.id, { refreshToken: refreshToken });
                return res.status(httpStatus.OK).json({
                    message: 'Login success',
                    refreshToken: accessToken,
                    accessToken: accessToken,
                });
            }
            return res.status(httpStatus.OK).json({
                message: 'Login success',
                refreshToken: dataRes.refreshToken,
                accessToken: dataRes.accessToken,
            });
        } catch (e) {
            return res.status(httpStatus.BAD_GATEWAY).json({ message: 'Login Fail' });
        }
    }
}

export default new AuthController();
