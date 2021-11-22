// @ts-check
require('dotenv').config()

const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { SESV2 } = require('aws-sdk')
const cookieParser = require('cookie-parser')
const { compare } = require('bcrypt')
const { getPeopleCollection } = require('../db')
const {
  getAccessTokenForUserId,
  setAccessTokenCookie,
  encryptPassword,
} = require('./auth/auth')
const authMiddleware = require('./auth/authMiddleware')
const { restart } = require('nodemon')

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

// @ts-ignore
const { HOST } = process.env
// @ts-ignore
const ses = new SESV2()

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
  const prebookingPeriod = new Date('2021-11-12T13:00')
  const today = new Date()
  if (today < prebookingPeriod) {
    res.render('prebooking')
    return
  }
  if (req.user) {
    res.render('home')
  } else {
    res.render('sign-in')
  }
})

// 로그인 요청 라우팅
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

/* // 이메일 인증 라우터
router.get('/verify-email', async (req, res) => {
  const { code } = req.query
  if (!code) {
    res.status(400).end()
    return
  }

  const users = await getPeopleCollection()
  const user = await users.findOne({ emailVerificationCode: code })

  if (!user) {
    console.log(`code : ${code}`)
    console.log(users)
    res.status(400).end()
    return
  }
  await users.updateOne(
    {
      id: user.id,
    },
    {
      $set: {
        virified: true,
      },
    }
  )
  redirectWithMsg({
    dest: '/',
    res,
    info: '이메일이 인증되었습니다',
  })
}) */

router.post('/sign-up', async (req, res) => {
  const users = await getPeopleCollection()
  const { email, password } = req.body

  // 입력 없음
  if (!email || !password) {
    redirectWithMsg({
      dest: '/',
      error: '이메일과 비밀번호를 모두 입력해야 합니다',
      res,
    })
    return
  }

  // 조회되지 않는 유저
  const existingUser = await users.findOne({
    email,
  })
  if (existingUser) {
    redirectWithMsg({
      dest: '/',
      error: '같은 이메일의 유저가 이미 존재합니다',
      res,
    })
    return
  }
  /* 
  // 암호화 된 아이디 생성
  const newUserId = uuidv4()
  const emailVerificationCode = uuidv4()
  await ses
    .sendEmail({
      Content: {
        Simple: {
          Subject: {
            Data: '이메일 인증 요청',
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: `다음 링크를 눌러 이메일 인증을 진행해주세요.<br>https://${HOST}/verify-email?code=${emailVerificationCode}`,
              Charset: 'UTF-8',
            },
          },
        },
      },
      Destination: {
        // 메일 전송 받을 주소
        ToAddresses: [email],
      },
      // 메일 전송 할 주소
      FromEmailAddress: 'noreply@gameisboring.com',
    })
    .promise()
 */
  await users.insertOne({
    email,
    password: await encryptPassword(password),
    virified: false,
  })

  setAccessTokenCookie(res, await getAccessTokenForUserId(email))
  redirectWithMsg({
    dest: '/',
    info: '등록이 완료되었습니다',
    res,
  })
})

// 로그아웃
router.get('/logout', (req, res) => {
  res.clearCookie('access_token')
  res.redirect('/')
})

router.get('/admin', async (req, res) => {
  const peopleCol = await getPeopleCollection()

  const peopleCursor = peopleCol.find({})
  const people = await peopleCursor.toArray()

  res.render('admin', { peopleArray: people })
})

const PORT = 3000

app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 작동되고 있습니다`)
})
