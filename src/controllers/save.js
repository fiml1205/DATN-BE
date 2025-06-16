const SavedTour = require('../models/SavedTour');
const Project = require('../models/project');
const Vote = require('../models/vote');


// Toggle lưu / bỏ lưu
exports.toggleSave = async (req, res) => {
  try {
    const userId = req.user.data.userId;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Thiếu projectId' });
    }

    const existing = await SavedTour.findOne({ userId, projectId });

    if (existing) {
      await SavedTour.deleteOne({ _id: existing._id });
      return res.status(200).json({ success: true, saved: false });
    } else {
      await SavedTour.create({ userId, projectId });
      return res.status(201).json({ success: true, saved: true });
    }
  } catch (err) {
    console.error('❌ toggleSave error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy danh sách các tour đã lưu của người dùng
exports.getSavedTours = async (req, res) => {
  try {
    const userId = req.user.data.userId;

    const saved = await SavedTour.find({ userId }).lean();
    const projectIds = saved.map((s) => s.projectId);

    const listProject = await Project.find({ projectId: { $in: projectIds } }).lean();
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

    return res.status(200).json({ success: true, savedTours: listProjectWithVotes });
  } catch (err) {
    console.error('❌ getSavedTours error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.checkSavedStatus = async (req, res) => {
  try {
    const userId = req.user.data.userId;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Thiếu projectId' });
    }

    const existing = await SavedTour.findOne({ userId, projectId });
    const isSaved = !!existing;

    return res.status(200).json({ success: true, saved: isSaved });
  } catch (err) {
    console.error('❌ checkSavedStatus error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
