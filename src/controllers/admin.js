const functions = require('../services/functions')
const Users = require('../models/user')

exports.listUser = async (req, res) => {
    try {
        // const userID = req.user.data.userID
        // if (userID != 1205) {
        //     return functions.error(res, 'Không có quyền truy cập')
        // }
        const listUser = await Users.find()
        console.log(listUser)
        return functions.success(res, 'Lấy thành công', { listUser: listUser })
    } catch (error) {
        console.log(error)
    }
}