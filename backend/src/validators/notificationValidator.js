const { param } = require("express-validator");

const notificationIdValidator = [param("id").isMongoId()];

module.exports = { notificationIdValidator };
