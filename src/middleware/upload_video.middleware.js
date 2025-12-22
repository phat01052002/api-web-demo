import util from 'util';
import multer from 'multer';
import path from 'path';
import { systemSettings } from '../config/config.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const maxPublicVideoSize = systemSettings.maxPublicUploadVideoSize * 1024 * 1024 * 1024;
const maxPrivateVideoSize = systemSettings.maxPrivateUploadVideoSize * 1024 * 1024 * 5;
const publicVideoWhitelist = ['video/mp4', 'video/avi', 'video/mov'];
const privateVideoWhitelist = ['video/mp4', 'video/avi', 'video/mov'];

const __filename = fileURLToPath(import.meta.url);
const __basedir = path.dirname(__filename);

// Tạo thư mục upload
function getUploadDir(isPrivate) {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const subDir = `/${year}/${month}`;
    let dir;
    if (isPrivate) {
        dir = path.join(__basedir, '../../uploads', subDir);
    } else {
        dir = path.join(__basedir, '../../static/assets/uploads/videos', subDir);
    }
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return {
        dir,
        subDir,
    };
}
function getUploadDirTemporary(isPrivate) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const subDir = `/${year}/${month}/${day}`;
    let dir;
    if (isPrivate) {
        dir = path.join(__basedir, '../../uploads', subDir);
    } else {
        dir = path.join(__basedir, '../../static/assets/uploads/temporary', subDir);
    }
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return {
        dir,
        subDir,
    };
}
const publicVideoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir(false);
        cb(null, dir.dir);
    },
    filename: (req, file, cb) => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const second = now.getSeconds();
        const fileName = `${year}-${month}-${day}-${second}-${file.originalname}`;
        cb(null, fileName);
    },
});

const publicVideoUpload = multer({
    storage: publicVideoStorage,
    limits: { fileSize: maxPublicVideoSize },
    fileFilter: (req, file, cb) => {
        if (!publicVideoWhitelist.includes(file.mimetype)) {
            return cb(new Error(`File type ${file.mimetype} is not allowed for public video upload`));
        }
        cb(null, true);
    },
}).single('file');
/////
const publicVideoStorageTemporary = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDirTemporary(false);
        cb(null, dir.dir);
    },
    filename: (req, file, cb) => {
        const d = new Date();
        const day = d.getDate();
        const hour = d.getHours();
        const minute = d.getMinutes();
        const second = d.getSeconds();
        let fileName = `${day}-${hour}-${minute}-${second}-${file.originalname}`;
        cb(null, fileName);
    },
});

const publicVideoUploadTemporary = multer({
    storage: publicVideoStorageTemporary,
    limits: { fileSize: maxPublicVideoSize },
    fileFilter: (req, file, cb) => {
        if (!publicVideoWhitelist.includes(file.mimetype)) {
            return cb(new Error(`File type ${file.mimetype} is not allowed for public video upload`));
        }
        cb(null, true);
    },
}).single('file');
////////
export const publicUploadVideo = util.promisify(publicVideoUpload);
export const publicUploadVideoTemporary = util.promisify(publicVideoUploadTemporary);
