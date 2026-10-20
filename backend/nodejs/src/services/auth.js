import jwt from 'jsonwebtoken';
import { HttpError } from '../errors.js';

// Demo only: passwords are stored and compared as plain text. A real application must hash them (for example bcrypt).
export function createAuthService(repository, config) {
  if (!config.jwtSecret || config.jwtSecret.length < 16) throw new Error('JWT_SECRET must be set to a random value of at least 16 characters.');
  return {
    async login(username, password) {
      if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'username and password are required.');
      }
      const user = await repository.findUser(username);
      if (!user || user.password !== password) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      const token = jwt.sign({ sub: user.username }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtExpiresIn });
      return { token, expiresIn: config.jwtExpiresIn, user: { username: user.username } };
    },
    verify(token) {
      try { return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }); } catch {
        throw new HttpError(401, 'UNAUTHORIZED', 'Missing, invalid or expired token.');
      }
    },
  };
}
