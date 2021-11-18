// @ts-check

const { getPeopleCollection } = require('../../db')
const { verifyJWT } = require('./auth')

/** @returns {import('express').RequestHandler} */
function authMiddleware() {
  return async (req, res, next) => {
    /* eslint-disable camelcase */
    const { access_token } = req.cookies
    if (access_token) {
      /** @type {string} */
      try {
        const userMail = await verifyJWT(access_token)
        if (userMail) {
          const people = await getPeopleCollection()
          const user = await people.findOne({
            email: userMail,
          })
          if (user) {
            // @ts-ignore
            req.user = user
          }
        }
      } catch (e) {
        console.log('Invalid token', e)
      }
    }
    next()
  }
}
module.exports = authMiddleware
