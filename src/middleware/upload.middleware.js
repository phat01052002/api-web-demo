import util from 'util';
import multer from 'multer';
import path from 'path';
import { systemSettings } from '../config/config.js';
import { fileURLToPath } from 'url';
import fs from 'fs';

const maxPublicSize = systemSettings.maxPublicUploadFileSize * 1024 * 1024;
const maxPrivateSize = systemSettings.maxPrivateUploadFileSize * 1024 * 1024;
const publicWhitelist = systemSettings.publicUploadFileType;
const privateWhiteList = systemSettings.privateUploadFileType;

const __filename = fileURLToPath(import.meta.url);
const __basedir = path.dirname(__filename);

function getUploadDir(isPrivate) {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const subDir = `/${year}/${month}`;
    let dir;
    if (isPrivate) {
        dir = __basedir + '/../../uploads' + subDir;
    } else {
        dir = __basedir + '/../../static/assets/uploads' + subDir;
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
        dir = __basedir + '/../../uploads' + subDir;
    } else {
        dir = __basedir + '/../../static/assets/uploads/temporary' + subDir;
    }
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return {
        dir,
        subDir,
    };
}
/////////////////////////////// public upload
const publicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir(false);
        file.subDir = dir.subDir;
        cb(null, dir.dir);
    },
    filename: (req, file, cb) => {
        const d = new Date();
        const day = d.getDate();
        const hour = d.getHours();
        const minute = d.getMinutes();
        const second = d.getSeconds();
        let fileName = `${day}-${hour}-${minute}-${second}-${file.originalname}`;
        if (file.mimetype.endsWith('image/jpg') || file.mimetype.endsWith('image/jpeg')) {
            fileName += '.jpg';
        } else if (file.mimetype.endsWith('image/png')) {
            fileName += '.png';
        } else if (file.mimetype.endsWith('image/webp')) {
            fileName += '.webp';
        } else {
            return res.status(httpStatus.BAD_REQUEST).json({ message: `File type ${file.mimetype}  is not allowed` });
        }
        cb(null, (file.originalname = fileName));
    },
});

const publicRes = multer({
    storage: publicStorage,
    limits: { fileSize: maxPublicSize },
    fileFilter: (req, file, cb) => {
        if (!publicWhitelist.includes(file.mimetype)) {
            return cb(new Error(`file type ${file.mimetype} is not allowed`));
        }
        cb(null, true);
    },
}).single('file');
const publicResMultiFile = multer({
    storage: publicStorage,
    limits: { fileSize: maxPublicSize },
    fileFilter: (req, file, cb) => {
        if (!publicWhitelist.includes(file.mimetype)) {
            return cb(new Error(`file type ${file.mimetype} is not allowed`));
        }
        cb(null, true);
    },
}).array('files', 10);
export const publicUploadFile = util.promisify(publicRes);
/////////////////////////////// public upload tempo
const publicStorageTemporary = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDirTemporary(false);
        file.subDir = dir.subDir;
        cb(null, dir.dir);
    },
    filename: (req, file, cb) => {
        const d = new Date();
        const day = d.getDate();
        const hour = d.getHours();
        const minute = d.getMinutes();
        const second = d.getSeconds();
        let fileName = `${day}-${hour}-${minute}-${second}-${file.originalname}`;

        cb(null, (file.originalname = fileName));
    },
});
export const publicUploadMultiFile = util.promisify(publicResMultiFile);
/////////////////////////////// public upload tempo

const publicResTemporary = multer({
    storage: publicStorageTemporary,
    limits: { fileSize: maxPublicSize },
    fileFilter: (req, file, cb) => {
        if (!publicWhitelist.includes(file.mimetype)) {
            return cb(new Error(`file type ${file.mimetype} is not allowed`));
        }
        cb(null, true);
    },
}).single('file');

export const publicUploadFileTemporary = util.promisify(publicResTemporary);

////////////////////////////// private upload
const privateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = getUploadDir(true);
        file.subDir = dir.subDir;
        cb(null, dir.dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const privateRes = multer({
    storage: privateStorage,
    limits: { fileSize: maxPrivateSize },
    fileFilter: (req, file, cb) => {
        if (!privateWhiteList.includes(file.mimetype)) {
            return cb(new Error(`file type ${file.mimetype} is not allowed`));
        }
        cb(null, true);
    },
}).single('file');

export const privateUploadFile = util.promisify(privateRes);
