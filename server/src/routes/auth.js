import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// 管理员登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const users = await query('SELECT * FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (err) {
    next(err);
  }
});

// 获取当前登录用户信息
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
});

// 修改密码
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6位' });
    }

    const users = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isPasswordValid = await bcrypt.compare(oldPassword, users[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);

    res.json({ message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
