const {check} = require('express-validator');

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

let validatePagination = () => {
  return [ 
    check('page').isInt({ min: 1 }).withMessage('Page phải là số nguyên dương >= 1'),
    check('limit').isInt({ min: 1 }).withMessage('Limit phải là số nguyên dương >= 1'),
  ]; 
}

module.exports = {validatePagination};
