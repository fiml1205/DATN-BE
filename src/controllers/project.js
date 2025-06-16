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
    console.error('❌ Save project failed:', err);
    return res.status(500).json({ error: 'Lưu dự án thất bại' });
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
    console.error('❌ Lỗi khi cập nhật tour:', err);
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
    console.log(req.user)

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
    console.error('❌ Lỗi lấy dự án:', err);
    return res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.getListProject = async (req, res) => {
  try {
    let listProject = await Project.find().lean().limit(9)

    // Gắn thông tin vote cho từng project
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
    console.log(error)
  }
}

exports.searchProjects = async (req, res) => {
  try {
    console.log('test')
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
    console.error("❌ Lỗi tìm kiếm tour:", err);
    return res.status(500).json({ success: false, message: "Lỗi server khi tìm kiếm tour" });
  }
};

exports.convertPanoramaForProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const uploadedFile = req.savedFileNames?.[0];

    if (!uploadedFile) {
      console.log('DEBUG req.savedFileNames:', req.savedFileNames); // thêm dòng này
      return functions.error(res, 'Thiếu ảnh panorama');
    }

    const imageId = Date.now().toString();
    const inputPath = path.join(__dirname, '../public/uploads/panorama', uploadedFile);
    const outputDir = path.join(__dirname, '../public/images/project', projectId, imageId);

    await fs.ensureDir(outputDir);

    const browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: 2048, height: 2048 },
    });

    const page = await browser.newPage();
    const cubeFaces = ['posx', 'negx', 'posy', 'negy', 'posz', 'negz'];

    for (const face of cubeFaces) {
      const url = `http://localhost:${process.env.PORT || 8000}/render.html?face=${face}&image=/uploads/panorama/${uploadedFile}`;

      // Truy cập trang render.html và chờ đến khi không còn request nào đang chạy (ảnh, texture...)
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Chờ thêm 1 giây để đảm bảo ảnh đã render đầy đủ trong Three.js
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Chụp ảnh màn hình và lưu
      const buffer = await page.screenshot({ type: 'png' });
      await fs.promises.writeFile(path.join(outputDir, `${face}.png`), buffer);

      console.log(`✅ Rendered ${face}.png`);
    }

    await browser.close();

    return functions.success(res, '✅ Convert thành công', {
      projectId,
      imageId,
      faces: cubeFaces.map(f => `/images/project/${projectId}/${imageId}/${f}.png`)
    });
  } catch (error) {
    console.error(error);
    return functions.error(res, '❌ Convert thất bại');
  }
};