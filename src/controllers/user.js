const functions = require('../services/functions')
const User = require('../models/user')
const argon2 = require('argon2')
const multer = require('multer');
const fs = require('fs');
const sanitize = require('mongo-sanitize');
const axios = require("axios");

exports.login = async (req, res) => {
    try {
        const account = req.body.account,
            password = req.body.password
        const redirect = req.query.redirect || "/";
        if (account && password) {
            let login = await User.findOne({ 'account': account}).lean()
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