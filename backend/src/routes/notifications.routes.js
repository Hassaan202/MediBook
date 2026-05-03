const express = require("express");
const notificationsController = require("../controllers/notifications.controller");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { notificationIdValidator } = require("../validators/notificationValidator");

const router = express.Router();

router.use(verifyToken);

router.get("/unread", notificationsController.getUnreadNotifications);
router.patch(
  "/mark-all-read",
  notificationsController.markAllAsRead
);
router.get("/", notificationsController.getUserNotifications);
router.patch(
  "/:id/read",
  ...notificationIdValidator,
  validateRequest,
  notificationsController.markAsRead
);
router.delete(
  "/:id",
  ...notificationIdValidator,
  validateRequest,
  notificationsController.deleteNotification
);

module.exports = router;
