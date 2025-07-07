/**
 * User Validation
 * Validates user input using Joi schema validation
 */
const Joi = require("joi")

const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.alphanum": "Username must contain only alphanumeric characters",
    "string.min": "Username must be at least 3 characters long",
    "string.max": "Username cannot exceed 30 characters",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
  }),

  role: Joi.string().valid("user", "admin").default("user"),
})

function validateUser(userData) {
  return userSchema.validate(userData)
}

module.exports = {
  validateUser,
  userSchema,
}
