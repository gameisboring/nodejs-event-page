const { MongoClient } = require('mongodb')

// root 폴더 -> .env 파일에 db 정보 입력 후 뽑아서 사용
const { MONGO_PASSWORD, MONGO_CLUSTER, MONGO_USER, MONGO_DBNAME } = process.env

// 완성된 mongoDB url
const uri = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_CLUSTER}/${MONGO_DBNAME}?retryWrites=true&w=majority`

// DB에 접속한 사용자 객체
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
// 연결여부판별
let didConnect = false

// mongoDB 컬렉션 받아오기
async function getCollection(name) {
  if (!didConnect) {
    await client.connect()
    didConnect = true
  }
  return client.db().collection(name)
}

async function getPeopleCollection() {
  return getCollection('people')
}

// exports 해주는 module은 컬렉션리스트 여야 함
module.exports = {
  getPeopleCollection,
}
