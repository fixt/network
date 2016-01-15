import cors from 'cors'
import express from 'express'
import graphql from 'express-graphql'
import rethink from 'rethinkdbdash'
import schema from './schema'

const r = rethink()
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use('/', graphql({ schema: schema, rootValue: { r }, graphiql: true }))

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
