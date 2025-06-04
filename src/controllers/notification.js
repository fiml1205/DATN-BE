const Notification = require('../models/Notification');
const functions = require('../services/functions')

exports.createNotification = async (req, res) => {
  try {
    const userId = req.user.data.userId
    const { projectId,projectName, userIdTour, message } = req.body;

    const newNoti = await Notification.create({
      projectId,
      projectName,
      userIdTour,
      message,
      userId,
      createdAt: new Date(),
      isRead: false,
    });

    return res.status(200).json({ success: true, notification: newNoti });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo thông báo' });
  }
};

exports.getNoti = async (req, res) => {
    try {
        const userId = req.user.data.userId
        let getInfor = await Notification.find({ 'userIdTour': userId }).lean()
        console.log(getInfor)
        return functions.success(res, 'Lấy bình luận thành công', { listNoti: getInfor })
    } catch (error) {
        console.log(error)
    }
}
