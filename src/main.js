// @ts-check
require('dotenv').config()

const express = require('express')

const cookieParser = require('cookie-parser')
const { compare } = require('bcrypt')
const { getPeopleCollection } = require('../db')
const { getAccessTokenForUserId, setAccessTokenCookie } = require('./auth/auth')
const authMiddleware = require('./auth/authMiddleware')
const router = express.Router()

const app = express()
app.use(cookieParser())
app.use(authMiddleware())
app.use(express.json())
app.use(express.urlencoded({ extended: true })) // form POST를 처리하기 위해 필요합니다.
app.use('/', router)
app.use('/public', express.static('src/public'))
app.set('views', 'src/views')
app.set('view engine', 'pug')

/*  */

/**
 * @param {Object.<string, *>} query
 * @returns {string}
 */
function makeQueryString(query) {
  const keys = Object.keys(query)
  return keys
    .map((key) => [key, query[key]])
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&')
}

/**
 * @typedef RedirectInfo
 * @property {import('express').Response} res
 * @property {string} dest
 * @property {string} [error]
 * @property {string} [info]
 */

/**
 * @param {RedirectInfo} param0
 */
function redirectWithMsg({ res, dest, error, info }) {
  res.redirect(`${dest}?${makeQueryString({ info, error })}`)
}

// 홈 화면 라우팅
router.get('/', async (req, res) => {
  if (req.user) {
    res.render('home')
  } else {
    res.render('sign-in')
  }
})

//
router.post('/sign-in', async (req, res) => {
  // 비정상적인 접근 차단
  if (!req.body) {
    redirectWithMsg({
      res,
      dest: '/',
      error: '잘못된 요청입니다',
    })
    return
  }

  // 이메일 비밀번호 입력여부 확인
  const { email, password } = req.body
  if (!email || !password) {
    redirectWithMsg({
      res,
      dest: '/',
      error: '이메일과 비밀번호를 모두 입력해주세요',
    })
  }

  // db에서 참가자(people)객체 받아오기
  const users = await getPeopleCollection()

  // 받아온 리스트에서 입력받은 이메일로 한 명 조회
  const existingUser = await users.findOne({
    email,
  })

  // 조회 했는데 나온 유저가 없으면 에러메세지
  if (!existingUser) {
    redirectWithMsg({
      res,
      dest: '/',
      error: '이메일 혹은 비밀번호가 일치하지 않습니다',
    })
    return
  }

  // 패스워드 compare
  const isPasswordCorrect = await compare(password, existingUser.password)

  if (isPasswordCorrect) {
    const token = await getAccessTokenForUserId(existingUser.email)
    setAccessTokenCookie(res, token)

    redirectWithMsg({
      res,
      dest: '/',
      info: '로그인 되었습니다',
    })
  } else {
    redirectWithMsg({
      res,
      dest: '/',
      error: '이메일 혹은 비밀번호가 일치하지 않습니다',
    })
  }
})

router.get('/logout', (req, res) => {
  res.clearCookie('access_token')
  res.redirect('/')
})

const PORT = 3000

app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 작동되고 있습니다`)
})
