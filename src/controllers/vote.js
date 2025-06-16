const Vote = require('../models/vote');
const Project = require('../models/project');
const functions = require('../services/functions');

exports.createOrUpdateVote = async (req, res) => {
  try {
    const userId = req.user.data.userId;
    const { projectId, rating } = req.body;
    console.log(typeof projectId,typeof rating)

    if (!projectId || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const project = await Project.findOne({ projectId }).lean();
    if (!project) {
      return res.status(404).json({ success: false, message: 'Dự án không tồn tại' });
    }

    if (project.userId === userId) {
      return res.status(403).json({ success: false, message: 'Không thể tự đánh giá dự án của bạn' });
    }

    const vote = await Vote.findOneAndUpdate(
      { projectId, userId },
      { rating, createdAt: new Date() },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, vote });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi khi vote' });
  }
};

exports.getProjectVotes = async (req, res) => {
  try {
    const { projectId } = req.params;

    const votes = await Vote.find({ projectId });
    const totalVotes = votes.length;
    const average =
      totalVotes === 0 ? 0 : votes.reduce((sum, v) => sum + v.rating, 0) / totalVotes;

    return res.status(200).json({
      success: true,
      data: {
        totalVotes,
        averageRating: Number(average.toFixed(2)),
        votes,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu vote' });
  }
};
