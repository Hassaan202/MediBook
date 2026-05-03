const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { HTTP_STATUS_CODES, ERROR_MESSAGES } = require("../config/constants");
const { getPagination, paginationMeta } = require("../utils/pagination");

async function getUserNotifications(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = { userId: req.user.userId };
    if (req.query.type) q.type = req.query.type;
    const [items, total] = await Promise.all([
      Notification.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(q),
    ]);
    return successResponse(res, {
      notifications: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getUnreadNotifications(req, res, next) {
  try {
    const items = await Notification.find({
      userId: req.user.userId,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .lean();
    const count = await Notification.getUnreadCount(req.user.userId);
    return successResponse(res, { notifications: items, unreadCount: count });
  } catch (err) {
    return next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Notification.findOne({ _id: id, userId: req.user.userId });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    await doc.markAsRead();
    return successResponse(res, { notification: doc });
  } catch (err) {
    return next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return successResponse(res, null, "All notifications marked read");
  } catch (err) {
    return next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const r = await Notification.deleteOne({ _id: id, userId: req.user.userId });
    if (!r.deletedCount) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    return successResponse(res, null, "Notification deleted");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
