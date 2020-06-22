const { body, validationResult } = require('express-validator');

const signUpValidator = [
  
  body('handle')
        .notEmpty()
        .trim()
        .withMessage('handle should not be empty')
        .isString()
        .trim()
        .withMessage('handle should be a string'),
        
  body('email')
    .notEmpty()
    .trim()
    .withMessage('email should not be empty')
    .isString()
    .trim()
    .withMessage('email should be a string')
    .isEmail()
    .normalizeEmail()
    .trim()
    .withMessage('email should not be empty and should be a valid email'),
    
  body('password')
    .notEmpty()
    .trim()
    .withMessage('password should not be empty ')
    .isAlphanumeric()
    .isLength({ min: 8 })
    .trim()
    .withMessage('password should be at least 8 characters'),
    

    body('confirmPassword')
    .notEmpty()
    .trim()
    .withMessage('confirm password should not be empty ')
    .isAlphanumeric()
    .isLength({ min: 8 })
    .trim()
    .withMessage('password should be at least 8 characters'),
    
  function signUpValidation(req, res, next) {
    const errorValidation = validationResult(req);
    if (!errorValidation.isEmpty()) {
      return res.status(422).json({
        status: 422,
        error: errorValidation.array(),
      });
    }
    next();
  },
];

const loginValidator = [
  
  body('email')
  .notEmpty()
  .trim()
  .withMessage('email should not be empty')
  .isString()
  .trim()
  .withMessage('email should be a string')
  .isEmail()
  .normalizeEmail()
  .trim()
  .withMessage('email should not be empty and should be a valid email'),
  
  body('password')
  .notEmpty()
  .trim()
  .withMessage('password should not be empty ')
  .isAlphanumeric()
  .isLength({ min: 8 })
  .trim()
  .withMessage('password should be at least 8 characters'),
  
  function loginValidation(req, res, next) {
    const errorValidation = validationResult(req);
    if (!errorValidation.isEmpty()) {
      return res.status(422).json({
        status: 422,
        errors: errorValidation.array(),
      });
    }
    next();
  },
];



const passswordMatch = (req, res, next) => {
  const {password, confirmPassword} = req.body;
  if(password !== confirmPassword){
    return res.status(400).json({
      status: 400,
      error: 'password and confirm password must match',
    });
  }
  next()
}

const isEmpty = value => value === undefined
  || value === null
  || (typeof value === 'object' && Object.keys(value).length === 0)
  || (typeof value === 'string' && value.trim().length === 0);

const getUserDetail = (data) => {
  const userdetail = {};
  if(!isEmpty(data.bio)) userdetail.bio = data.bio;
  if(!isEmpty(data.website)){
    if(data.website.trim().substring(0,4) !== 'http'){
      userdetail.website = `http://${data.website.trim()}`
    }else userdetail.website = data.website.trim();
  }
  if(!isEmpty(data.location)) userdetail.location = data.location;

  return userdetail;
}


module.exports = {signUpValidator, loginValidator, passswordMatch, getUserDetail, isEmpty};

