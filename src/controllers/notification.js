const Notification = require('../models/Notification');
const Project = require('../models/project');
const functions = require('../services/functions')

exports.createNotification = async (req, res) => {
  try {
    const userId = req.user.data.userId
    const { projectId,projectName, userIdTour, message } = req.body;
    const time = new Date()

    const newNoti = await Notification.create({
      projectId,
      projectName,
      userIdTour,
      message,
      userId,
      createdAt: time,
      isRead: false,
    });

    const project = await Project.findOne({projectId})
    project.timeLastBook = time
    await project.save()

    return res.status(200).json({ success: true, notification: newNoti });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo thông báo' });
  }
};

exports.getNoti = async (req, res) => {
    try {
        const userId = req.user.data.userId
        let getInfor = await Notification.find({ 'userIdTour': userId }).lean()
        return functions.success(res, 'Lấy bình luận thành công', { listNoti: getInfor })
    } catch (error) {
    }
}
