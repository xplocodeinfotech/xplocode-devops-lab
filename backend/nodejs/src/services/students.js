import { HttpError } from '../errors.js';

const text = (value, field) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || trimmed.length > 100) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be 1-100 characters.`);
  return trimmed;
};

export function validateStudent(body) {
  // Emails are stored and returned in lower case, so a plain unique rule in any database is case-insensitive.
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'VALIDATION_ERROR', 'email must be a valid address.');
  if (!Number.isInteger(body?.year) || body.year < 1 || body.year > 4) throw new HttpError(400, 'VALIDATION_ERROR', 'year must be an integer from 1 to 4.');
  return { name: text(body.name, 'name'), email, year: body.year };
}

// Path ids that are not positive integers are treated as "not found".
const parseId = (value) => (/^[1-9]\d*$/.test(value) ? Number(value) : 0);
const notFound = () => new HttpError(404, 'NOT_FOUND', 'Student not found.');

export function createStudentService(repository) {
  return {
    list: () => repository.list(),
    async get(rawId) {
      const student = await repository.get(parseId(rawId));
      if (!student) throw notFound();
      return student;
    },
    create: (body) => repository.create(validateStudent(body)),
    async update(rawId, body) {
      const id = parseId(rawId);
      if (!(await repository.get(id))) throw notFound();
      const updated = await repository.update(id, validateStudent(body));
      if (!updated) throw notFound();
      return updated;
    },
    async remove(rawId) {
      if (!(await repository.remove(parseId(rawId)))) throw notFound();
    },
  };
}
