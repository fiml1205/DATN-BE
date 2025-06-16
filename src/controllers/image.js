
const functions = require('../services/functions');
// const Project = require('../models/project'); // No longer needed here
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra'); // fs-extra is good for ensureDir

exports.sliceImage360 = async (req, res) => {
  try {
    const projectId = req.body.projectId || '1';
    const filename = req.savedFileNames?.[0];
    if (!filename) {
      return functions.error(res, '❌ Không có ảnh được tải lên');
    }
    const sceneId = Date.now().toString();

    const generateScript = path.resolve('scripts/generate.py');
    const inputPath = path.resolve('src/public/uploads/equirect', filename);
    const outputDir = path.join(__dirname, '../public/tiles', projectId, sceneId);
    const nonaPath = "C:\\Program Files\\Hugin\\bin\\nona.exe";


    const command = `python "${generateScript}" -o "${outputDir}" -n "${nonaPath}" "${inputPath}"`;

    exec(command, async (error, stdout, stderr) => {
      // Đảm bảo thư mục output đã được tạo (phòng trường hợp generate.py chưa tạo)
      await fs.ensureDir(outputDir);

      const destinationPath = path.join(outputDir, 'originalImage.jpg');

      if (error) {
        console.error('❌ ERROR khi chạy generate.py:', error);
        console.error('Stderr:', stderr);
        return functions.error(res, `❌ Lỗi xử lý ảnh 360: ${stderr || error.message}`);
      }

      console.log('✅ generate.py SUCCESS:', stdout);

      // Di chuyển ảnh gốc sang thư mục sceneId
      try {
        await fs.move(inputPath, destinationPath, { overwrite: true });
      } catch (moveErr) {
        console.warn("⚠️ Lỗi khi di chuyển ảnh gốc vào scene folder:", moveErr);
      }

      const tilesPathForClient = `/tiles/${projectId}/${sceneId}/`;

      return functions.success(res, '✅ Xử lý ảnh 360 thành công', {
        sceneId: sceneId,
      });
    });


  } catch (err) {
    console.error('❌ Lỗi server trong sliceImage360:', err);
    // Ensure temporary file is deleted in case of an error before exec starts
    if (req.file && req.file.path) {
      try {
        if (await fs.pathExists(req.file.path)) { // Check if path still exists
          await fs.unlink(req.file.path);
        }
      } catch (e) {
        console.warn("⚠️ Lỗi xóa file tạm (trong catch chính):", e);
      }
    }
    return functions.error(res, '❌ Lỗi server không xác định');
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const projectId = req.body.projectId;
    const sceneId = req.body.sceneId;
    const sceneFolder = path.resolve(__dirname, `../public/tiles/${projectId}/${sceneId}`);
    if (!fs.existsSync(sceneFolder)) {
      console.log('Folder does not exist:', sceneFolder);
      return functions.error(res, 'Folder not found');
    }
    await fs.remove(sceneFolder);
    console.log(sceneFolder)
    await fs.remove(sceneFolder);
    return functions.success(res, 'Delele success');
  } catch (err) {
    console.error('Delete error:', err);
    return functions.error(res, 'Delete failed');
  }
};


