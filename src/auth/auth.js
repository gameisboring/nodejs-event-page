// @ts-check

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { SERVER_SECRET } = process.env

async function signJWT(value) {
  return new Promise((resolve, reject) => {
    jwt.sign(value, SERVER_SECRET, (err, encoded) => {
      if (err) {
        reject(err)
      } else {
        resolve(encoded)
      }
    })
  })
}

async function verifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, SERVER_SECRET, (err, value) => {
      if (err) {
        reject(err)
      } else {
        resolve(value)
      }
    })
  })
}

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
async function encryptPassword(password) {
  console.log('encryptPassword')
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 12, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

/**
 * @param {string} userId
 */
async function getAccessTokenForUserId(userId) {
  return signJWT(userId)
}
/**
 * @param {import('express').Response} res
 * @param {string} token
 */
function setAccessTokenCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: true,
  })
}

module.exports = {
  getAccessTokenForUserId,
  setAccessTokenCookie,
  encryptPassword,
  signJWT,
  verifyJWT,
}
