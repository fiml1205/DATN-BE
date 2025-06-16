const Comment = require('../models/Comment');
const User = require('../models/user');

exports.createComment = async (req, res) => {
  try {
    const userId = req.user.data.userId;
    const { projectId, content } = req.body;

    if (!content || !projectId) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung hoặc projectId' });
    }

    const comment = await Comment.create({
      projectId,
      userId,
      content,
      createdAt: new Date(),
    });

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error('❌ Lỗi khi tạo comment:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo bình luận' });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const userId = req.user.data.userId;
    const { content } = req.body;
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment không tồn tại' });

    if (comment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Không có quyền sửa comment này' });
    }

    comment.content = content;
    await comment.save();

    return res.status(200).json({ success: true, comment });
  } catch (err) {
    console.error('❌ Lỗi sửa comment:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi sửa bình luận' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user.data.userId;
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment không tồn tại' });

    if (comment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Không có quyền xoá comment này' });
    }

    await Comment.deleteOne({ _id: id });
    return res.status(200).json({ success: true, message: 'Đã xoá comment' });
  } catch (err) {
    console.error('❌ Lỗi xoá comment:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xoá bình luận' });
  }
};

exports.getCommentsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const comments = await Comment.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();

    // Lấy userId duy nhất để query User
    const userIds = [...new Set(comments.map(c => c.userId))];

    const users = await User.find({ userId: { $in: userIds } })
      .select('userId userName avatar')
      .lean();

    const userMap = users.reduce((map, user) => {
      map[user.userId] = user;
      return map;
    }, {});

    const commentsWithUser = comments.map(c => ({
      ...c,
      userName: userMap[c.userId]?.userName || 'Ẩn danh',
      avatar: userMap[c.userId]?.avatar || null
    }));

    return res.status(200).json({ success: true, comments: commentsWithUser });
  } catch (err) {
    console.error('❌ Lỗi khi lấy comment:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy bình luận' });
  }
};


