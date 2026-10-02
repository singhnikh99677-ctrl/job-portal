export function sanitizeUser<T extends { passwordHash?: string }>(user: T) {
  const copy = { ...user };
  delete copy.passwordHash;
  return copy;
}
