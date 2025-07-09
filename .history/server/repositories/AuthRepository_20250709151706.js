/**
 * Auth Repository
 * Handles direct communication with the Supabase authentication service.
 */
const supabase = require('../config/database');

class AuthRepository {
  /**
   * Signs up a new user using Supabase Auth.
   * Supabase handles email confirmation and password hashing automatically.
   * @param {string} email - The user's email.
   * @param {string} password - The user's plain-text password.
   */
  async signUp(email, password) {
    return await supabase.auth.signUp({
      email,
      password,
    });
  }

  /**
   * Signs in a user using Supabase Auth.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   */
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  }
}

module.exports = new AuthRepository();
