const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const AuthController = require('../controllers/AuthController');
const UserRepository = require('../repositories/UserRepository');

const userRepository = new UserRepository(supabase);
const authController = new AuthController(supabase, userRepository);

router.post('/login', authController.login);
router.post('/signup', auth.signup);

module.exports = router;