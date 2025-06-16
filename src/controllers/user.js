const functions = require('../services/functions')
const User = require('../models/user')
const Project = require('../models/project')
const argon2 = require('argon2')
const multer = require('multer');
const fs = require('fs');
const sanitize = require('mongo-sanitize');
const axios = require("axios");
const Vote = require('../models/vote');


exports.login = async (req, res) => {
    try {
        const account = req.body.account,
            password = req.body.password
        const redirect = req.query.redirect || "/";
        if (account && password) {
            let login = await User.findOne({ 'account': account }).lean()
            if (login) {
                const checkPassword = await argon2.verify(login.password, password)
                if (checkPassword) {
                    const SSToken = await functions.createToken({
                        userId: login.userId,
                        type: login.type,
                        userName: login.userName,
                        avatar: login.avatar,
                        webSignal: 'leanhtuan120599'
                    }, '7d')
                    return functions.success(res, 'Đăng nhập thành công', { SSToken: SSToken, redirect: redirect })
                }
                return functions.error(res, 'Sai mật khẩu')
            }
            return functions.error(res, 'Không tồn tại dữ liệu')
        }
        return functions.error(res, 'Thiếu thông tin truyền lên', 404)
    } catch (error) {
        console.log(error)
        return functions.error(res, error.message)
    }
}

exports.register = async (req, res) => {
    try {
        const { account,
            password,
            type
        } = req.body
        if (account && password && type) {
            const checkPhone = await functions.validatePhone(account)
            const checkEmail = await functions.validateEmail(account)
            if (checkEmail || checkPhone) {
                const checkExist = await User.findOne({ account: account }).lean()
                if (!checkExist) {
                    const getMaxId = await functions.getMaxId(User, 'userId')
                    const hashPassword = await argon2.hash(password)
                    const time = Date.now()
                    const data = {
                        userId: getMaxId,
                        account: account,
                        password: hashPassword,
                        userName: account,
                        type: type,
                        authentication: 1,
                        createdAt: time,
                        updatedAt: time
                    }
                    if (checkPhone) {
                        data['phone'] = account
                    } else {
                        data['email'] = account
                    }
                    const newUser = new User(data)
                    await newUser.save()
                    const SSToken = await functions.createToken({
                        userId: getMaxId,
                        type: type,
                        userName: account,
                        webSignal: 'leanhtuan120599'
                    }, '7d')
                    return functions.success(res, 'Đăng kí thành công', { SSToken: SSToken })
                }
                return functions.error(res, 'Tài khoản đã tồn tại')
            }
            return functions.error(res, 'Tên đăng nhập không hợp lệ')
        }
        return functions.error(res, 'Thiếu thông tin truyền lên', 404)
    } catch (error) {
        return functions.error(res, error.message)
    }
}

exports.getListProject = async (req, res) => {
    try {
        const infor = await req.user
        const userId = infor.data.userId
        let listProject = await Project.find({ 'userId': userId }).lean()
        const listProjectWithVotes = await Promise.all(
            listProject.map(async (project) => {
                const votes = await Vote.find({ projectId: project.projectId });
                const totalVotes = votes.length;
                const averageRating =
                    totalVotes === 0
                        ? 0
                        : Number(
                            (votes.reduce((sum, v) => sum + v.rating, 0) / totalVotes).toFixed(1)
                        );

                return {
                    ...project,
                    vote: {
                        total: totalVotes,
                        average: averageRating,
                    },
                };
            })
        );
        return functions.success(res, 'Lấy thông tin thành công', { listProject: listProjectWithVotes })
    } catch (error) {
        console.log(error)
    }
}

exports.getInfor = async (req, res) => {
    try {
        const infor = await req.user
        const userId = infor.data.userId
        let getInfor = await User.findOne({ 'userId': userId }).lean()
        return functions.success(res, 'Lấy thông tin thành công', { userInfor: getInfor })
    } catch (error) {
        console.log(error)
    }
}

exports.updateInforCompany = async (req, res) => {
    try {
        const userId = req.user.data.userId
        let imageIntroduce = req.savedFileNames || null;
        const {
            userName,
            address,
            city,
            district,
            email,
            phone,
            costRange,
            password
        } = req.body

        // if (!userName || !address || !city || !district) {
        //     return functions.error(res, 'Thiếu thông tin truyền lên', 404);
        // }
        const checkUser = await User.findOne({ userId });
        if (!checkUser) {
            return functions.error(res, 'Không tồn tại dữ liệu');
        }
        if (imageIntroduce) {
            imageIntroduce = imageIntroduce.map(element => `/images/company/introduce/${element}`);
        }
        const dataToUpdate = {
            userName,
            address,
            city,
            district,
            password,
            ...(phone && { phone }),
            ...(email && { email }),
            ...(costRange && { costRange }),
            ...(imageIntroduce && { imageIntroduce })
        };
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            dataToUpdate
        );
        return functions.success(res, 'Cập nhật thành công');
    } catch (error) {
        console.log(error)
        return functions.error(res, error.message)
    }
}

exports.getComments = async (req, res) => {
    try {
        const userId = req.body.userId
        let comments = await User.findOne({ 'userID': userId }).select('comments').lean()
        return functions.success(res, 'Lấy bình luận thành công', { comments: comments.comments })
    } catch (error) {
        console.log(error)
    }
}

exports.comment = async (req, res) => {
    try {
        const userId = req.body.userId
        const comment = req.body.comment
        let getComments = await User.findOne({ userId }).select('comments')
        let comments = getComments.comments
        comments.push(comment)
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { comments: comments }
        );
        return functions.success(res, 'Lấy bình luận thành công', { comments: comments.comments })
    } catch (error) {
        console.log(error)
    }
}

exports.uploadAvatar = async (req, res) => {
    const userId = req.user.data.userId;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: 'Không có file gửi lên' });
    }

    const avatarPath = `/uploads/avatar/${file.filename}`;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });

    user.avatar = avatarPath;
    await user.save();

    return res.status(200).json({ success: true, avatar: avatarPath });
};

exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.user.data;
        const {
            userName,
            email,
            phone,
            address
        } = req.body;

        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

        if (userName) user.userName = userName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();
        return res.status(200).json({ success: true, user });
    } catch (err) {
        console.error('❌ updateUser error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật user' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.data.userId;
        const { passwordOld, passwordNew, passwordConfirm } = req.body;

        if (!passwordOld || !passwordNew || !passwordConfirm) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin đổi mật khẩu' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User không tồn tại' });
        }

        const match = await argon2.verify(user.password, passwordOld);
        if (!match) {
            return res.status(403).json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }

        if (passwordNew !== passwordConfirm) {
            return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
        }

        user.password = await argon2.hash(passwordNew);
        await user.save();

        return res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        console.error('❌ changePassword error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu' });
    }
};