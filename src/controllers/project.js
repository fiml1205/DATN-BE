// controllers/project.js
const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const functions = require('../services/functions');
const Project = require('../models/project');

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

exports.getProject = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findOne({ projectId });

    if (!project) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }

    return res.json(project);
  } catch (err) {
    console.error('❌ Lỗi lấy dự án:', err);
    return res.status(500).json({ error: 'Lỗi server' });
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

exports.getListProject = async (req, res) => {
    try {
        let listProject = await Project.find().lean().limit(10)
        return functions.success(res, 'Lấy thông tin thành công', { listProject:  listProject})
    } catch (error) {
        console.log(error)
    }
}

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