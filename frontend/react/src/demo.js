import { ApiError } from './api.js';

const sampleStudents = [
  { id: 1, name: 'Arun Kumar', email: 'arun@example.com', year: 3 },
  { id: 2, name: 'Priya Sharma', email: 'priya@example.com', year: 2 },
  { id: 3, name: 'Meera Nair', email: 'meera@example.com', year: 4 },
  { id: 4, name: 'Kavin Raj', email: 'kavin@example.com', year: 1 },
];

// Intentionally in memory. This is a UI preview, not authentication or a database.
export function createDemoApi() {
  let students = structuredClone(sampleStudents);
  let nextId = 5;
  let signedIn = false;
  const authorize = () => { if (!signedIn) throw new ApiError('Enter the demo workspace first.', 401); };
  const find = (id) => {
    const student = students.find((item) => item.id === id);
    if (!student) throw new ApiError('Student not found.', 404);
    return student;
  };
  const checkEmail = (email, id) => {
    if (students.some((item) => item.id !== id && item.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError('A student with this email already exists.', 409);
    }
  };
  return {
    async login(username, password) {
      if (!String(username ?? '').trim() || !String(password ?? '')) throw new ApiError('Enter a username and password. Any values work in demo mode.', 400);
      signedIn = true; return { username: String(username).trim() };
    },
    logout() { signedIn = false; },
    async list() { authorize(); return structuredClone(students); },
    async get(id) { authorize(); return { ...find(id) }; },
    async create(student) {
      authorize(); checkEmail(student.email);
      const created = { ...student, id: nextId++ };
      students.push(created); return { ...created };
    },
    async update(id, student) {
      authorize(); find(id); checkEmail(student.email, id);
      const updated = { ...student, id };
      students = students.map((item) => item.id === id ? updated : item);
      return { ...updated };
    },
    async remove(id) { authorize(); find(id); students = students.filter((item) => item.id !== id); },
  };
}
