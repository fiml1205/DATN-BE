const functions = require('../services/functions')
const User = require('../models/user')
const Project = require('../models/project')

exports.users = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const {
            userId,
            account,
            userName,
            email,
            phone,
            userType
        } = req.query;

        const query = {};

        if (userId) {
            query.userId = parseInt(userId);
        }

        if (account) {
            query.account = { $regex: account, $options: 'i' };
        }

        if (userName) {
            query.userName = { $regex: userName, $options: 'i' };
        }

        if (email) {
            query.email = { $regex: email, $options: 'i' };
        }

        if (phone) {
            query.phone = { $regex: phone, $options: 'i' };
        }

        if (userType) {
            query.type = parseInt(userType);
        }

        const [users, totalCount] = await Promise.all([
            User.find(query).select('-password').skip((page - 1) * limit).limit(limit),
            User.countDocuments(query),
        ]);

        return res.json({ success: true, users, totalCount });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await User.deleteOne({ userId });
        return res.json({ success: true, message: 'Đã xoá user' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi xoá user' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { userName, email, phone, address } = req.body;

        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

        if (userName) user.userName = userName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();

        return res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật user' });
    }
};

exports.projects = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const {
            projectId,
            title,
            isLock
        } = req.query;

        const query = {};

        if (projectId && !isNaN(Number(projectId))) {
            query.projectId = Number(projectId);
        }

        if (title) {
            query.title = { $regex: title, $options: 'i' };
        }

        if (isLock === 'true') {
            query.isLock = true;
        } else if (isLock === 'false') {
            query.isLock = false;
        }

        const [projects, totalCount] = await Promise.all([
            Project.find(query).sort({ projectId: -1 }).skip(skip).limit(limit).lean(),
            Project.countDocuments(query),
        ]);

        return res.json({ success: true, projects, totalCount });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách tour' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await Project.deleteOne({ projectId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tour để xoá' });
        }

        return res.json({ success: true, message: 'Đã xoá tour thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi xoá tour' });
    }
};

exports.lockProject = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = await Project.findOne({ projectId });

        if (!project) return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });

        project.isLock = !project.isLock;
        await project.save();

        return res.json({ success: true, isLock: project.isLock });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật trạng thái khóa' });
    }
};