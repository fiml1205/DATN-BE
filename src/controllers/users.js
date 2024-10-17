const functions = require('../services/functions')
const Users = require('../models/users')
const argon2 = require('argon2')
const multer = require('multer');
const fs = require('fs');

exports.login = async (req, res) => {
    try {
        const account = req.body.account,
            password = req.body.password
        if (account && password) {
            let login = await Users.findOne({ 'account': account}).lean()
            if (login) {
                const checkPassword = await argon2.verify(login.password, password)
                if (checkPassword) {
                    const SStoken = await functions.createToken({
                        userID: login.userID,
                        type: login.type,
                        userName: login.userName,
                        webSignal: 'leanhtuan120599'
                    }, '7d')
                    return functions.success(res, 'Đăng nhập thành công', { SStoken: SStoken })
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
                const checkExist = await Users.findOne({ account: account}).lean()
                if (!checkExist) {
                    const getMaxID = await functions.getMaxID(Users, 'userID')
                    const hashPassword = await argon2.hash(password)
                    const time = Date.now()
                    const data = {
                        userID: getMaxID,
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
                    const newUser = new Users(data)
                    await newUser.save()
                    const SStoken = await functions.createToken({
                        idUser: getMaxID,
                        type: type,
                        userName: account,
                        webSignal: 'leanhtuan120599'
                    }, '7d')
                    return functions.success(res, 'Đăng kí thành công', { SStoken: SStoken })
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
        const userID = req.user.data.userID
        let imageIntroduce = req.savedFileNames || null;
        const {
            userName,
            address,
            city,
            district,
            email,
            phone,
            costRange,
        } = req.body

        if (!userName || !address || !city || !district) {
            return functions.error(res, 'Thiếu thông tin truyền lên', 404);
        }
        const checkUser = await Users.findOne({ userID });
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
            ...(phone && { phone }),
            ...(email && { email }),
            ...(costRange && { costRange }),
            ...(imageIntroduce && { imageIntroduce })
        };
        const updatedUser = await Users.findOneAndUpdate(
            { userID },
            dataToUpdate
        );
        return functions.success(res, 'Cập nhật thành công');
    } catch (error) {
        console.log(error)
        return functions.error(res, error.message)
    }
}