require('dotenv').config();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// create token
exports.createToken = async (data, time) => {
    try {
        return jwt.sign({ data }, process.env.NODE_SECRET, { expiresIn: time });
    } catch (e) {
        return false;
    }
};

// check token
exports.checkToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Missing token' });
        }
        jwt.verify(token, process.env.NODE_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    } catch (e) {
        return false;
    }
};

exports.checkTokenOptional = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        jwt.verify(token, process.env.NODE_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
            return next();
        });
    } catch (e) {
        return next();
    }
};

// call api success
exports.success = (res, messsage = '', data = []) => {
    try {
        return res.status(200).json({
            data: { result: true, message: messsage, ...data },
            error: null,
        });
    } catch (e) {
        return false;
    }
};

// call api fail
exports.error = (res, message, code = 500) => {
    try {
        return res.status(code).json({ data: null, code, message: message });
    } catch (e) {
        return false;
    }
};

// get max Id
exports.getMaxId = async (model, id) => {
    try {
        const sortCondition = {};
        sortCondition[id] = -1;
        const maxUser = (await model.findOne({}, {}, { sort: sortCondition }).lean());
        if (maxUser) {
            return maxUser[id] + 1;
        } else {
            return 1
        }
    } catch (e) {
        return false;
    }
};

// check token
exports.verifySSToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Missing token' });
        }
        jwt.verify(token, process.env.NODE_SERCET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    } catch (e) {
        return false;
    }
}

// validate phone
exports.validatePhone = async (phone) => {
    try {
        const phoneNumberRegex = /^(?:\+84|0|\+1)?([1-9][0-9]{8,9})$/;
        return phoneNumberRegex.test(phone);
    } catch (e) {
        return false
    }
};

// validate email
exports.validateEmail = async (email) => {
    try {
        const gmailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,8}$/;
        return gmailRegex.test(email);
    } catch (e) {
        return false
    }
};

// handle upload images
function storageFile(uploadPath, userId) {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const imageName = `${Date.now()}-${userId}-${file.originalname}`;
            if (!req.savedFileNames) {
                req.savedFileNames = [];
            }
            req.savedFileNames.push(imageName);
            cb(null, imageName);
        }
    });
}

exports.uploadAvatar = (req, res, next) => {
    try {
        const userId = req.user?.data?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Chưa xác thực' });
        }

        const avatarPath = path.join(__dirname, '../uploads/avatar');
        const storage = storageFile(avatarPath, userId);
        const upload = multer({ storage }).single('avatar');

        upload(req, res, function (err) {
            if (err) {
                console.error("❌ Multer error:", err);
                return res.status(500).json({ success: false, message: 'Lỗi khi upload avatar' });
            }
            next();
        });
    } catch (err) {
        console.error("❌ uploadAvatar middleware error:", err);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

exports.uploadFile = (filePath, limit, fieldName = 'image') => {
    return (req, res, next) => {
        const userId = req?.user?.data?.userId || req.body.userId || req.query.userId || 'anonymous';

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath, { recursive: true });
                }
                cb(null, filePath);
            },
            filename: (req, file, cb) => {
                const imageName = `${Date.now()}-${userId}-${file.originalname}`;
                req.savedFileNames = req.savedFileNames || [];
                req.savedFileNames.push(imageName);
                cb(null, imageName);
            },
        });

        const upload = multer({
            storage,
            fileFilter: (req, file, callback) => {
                const ext = path.extname(file.originalname).toLowerCase();
                const listAllow = ['.png', '.jpg', '.jpeg', '.gif'];
                if (!listAllow.includes(ext)) {
                    return callback(new Error('Chỉ cho phép upload file ảnh'));
                }
                callback(null, true);
            },
        }).array(fieldName, limit);

        upload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: 'Xảy ra lỗi trong quá trình upload ảnh (Multer)' });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }
            next();
        });
    };
};


