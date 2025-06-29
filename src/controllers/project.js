const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const functions = require('../services/functions');
const Project = require('../models/project');
const Vote = require('../models/vote');

exports.createProject = async (req, res) => {
  try {
    const data = req.body;
    const exists = await Project.findOne({ projectId: data.projectId });

    if (exists) {
      return res.status(400).json({ error: 'Project already exists' });
    }

    const saved = await Project.create(data);
    return res.json({ message: '✅ Project saved', project: saved });
  } catch (err) {
    return res.status(500).json({ error: 'Lưu dự án thất bại' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const data = req.body;
    const { projectId } = data;

    if (!projectId) {
      return res.status(400).json({ error: 'Thiếu projectId' });
    }

    const updated = await Project.findOneAndUpdate(
      { projectId },
      { $set: data },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }

    return res.json({ message: '✅ Đã cập nhật dự án', project: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Cập nhật dự án thất bại' });
  }
};

exports.editProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const updated = await Project.findOneAndUpdate(
      { projectId },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }

    return res.json({ message: '✅ Đã cập nhật tour', project: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi khi cập nhật tour' });
  }
};

exports.getProject = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.data?.userId;

  try {
    const project = await Project.findOne({ projectId }).lean();
    if (!project) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }

    const votes = await Vote.find({ projectId });

    const totalVotes = votes.length;
    const averageRating =
      totalVotes === 0 ? 0 : votes.reduce((sum, v) => sum + v.rating, 0) / totalVotes;

    const voteCounts = [1, 2, 3, 4, 5].map((star) => ({
      rating: star,
      count: votes.filter((v) => v.rating === star).length,
    }));

    // 🔍 tìm xem user hiện tại đã vote chưa
    const userVoteData = userId
      ? await Vote.findOne({ projectId, userId }).lean()
      : null;

    return res.json({
      project,
      vote: {
        averageRating: Number(averageRating.toFixed(1)),
        totalVotes,
        votes: voteCounts.reverse(),
        userVote: userVoteData ? userVoteData.rating : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.getListProject = async (req, res) => {
  try {
    const page = req.body.page || 1;
    const limit = req.body.limit || 9;
    const type = req.body.type ?? null;
    // Nếu truyền type
    if (type !== null) {
      let query = {};
      if (type == 0) {
        query = { isForeign: false };
      } else if (type == 1) {
        query = { isForeign: true };
      }

      const listProject = await Project.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

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

      return functions.success(res, 'Lấy thông tin thành công', {
        listProject: listProjectWithVotes,
      });
    }

    // Nếu KHÔNG truyền type → trả về cả 2 danh sách
    const [domestic, foreign] = await Promise.all([
      Project.find({ isForeign: false })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Project.find({ isForeign: true })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    // Gắn vote cho từng project của cả 2 danh sách
    const domesticWithVotes = await Promise.all(
      domestic.map(async (project) => {
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

    const foreignWithVotes = await Promise.all(
      foreign.map(async (project) => {
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

    // Trả về 2 danh sách riêng
    return functions.success(res, 'Lấy thông tin thành công', {
      domesticProjects: domesticWithVotes,
      foreignProjects: foreignWithVotes,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getListProjectOwn = async (req, res) => {
  try {
    const infor = await req.user
    const userId = infor.data.userId
    const page = req.body.page || 1;
    const limit = req.body.limit || 9;
    let listProject = await Project.find({ 'userId': userId }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
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
    return functions.error(res, error.message)
  }
}

exports.searchProjects = async (req, res) => {
  try {
    const { keyword, city, price } = req.query;

    const filter = {};

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      filter.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
      ];
    }

    if (city) {
      filter.departureCity = Number(city);
    }

    if (price) {
      filter.price = Number(price);
    }
    const listProject = await Project.find(filter).lean();
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

    return res.status(200).json({ success: true, listProject: listProjectWithVotes });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Lỗi server khi tìm kiếm tour" });
  }
};