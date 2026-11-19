import express from 'express';
import multer from 'multer';
import * as aiController from '../controllers/aiController.js';
import { AppError } from '../middleware/errorHandler.js';

export const router = express.Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4 MB (under Vercel's 4.5 MB serverless payload limit)
  },
});

/**
 * Wraps multer's single-file upload handler to convert MulterErrors (like >4MB file size)
 * into structured 400 AppErrors.
 */
function handleAudioUpload(req, res, next) {
  const middleware = upload.single('audio');
  middleware(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            400,
            'AUDIO_TOO_LARGE',
            'Audio recording cannot exceed 4 MB (approx. 60 seconds).'
          )
        );
      }
      return next(new AppError(400, 'UPLOAD_ERROR', err.message));
    }
    return next(err);
  });
}

router.post('/parse', aiController.parseCommand);
router.post('/execute', aiController.executeCommand);
router.post('/transcribe', handleAudioUpload, aiController.transcribeVoice);
router.post('/standup', aiController.generateStandup);

export { router as aiRoutes };
export default router;
