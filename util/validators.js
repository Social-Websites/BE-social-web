exports.validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^[a-z0-9.-]+@[a-z.]+\.[a-z]{2,4}$/);
};

exports.validateLength = (text, min, max) => {
  if (text.length > max || text.length < min) {
    return false;
  }
  return true;
};
