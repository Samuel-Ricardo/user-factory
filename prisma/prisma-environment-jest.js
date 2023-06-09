const NodeEnvironment = require("jest-environment-node").TestEnvironment
const { execSync } = require("child_process")
const { resolve } = require("path")
const { Client } = require("pg")
const { v4: uuid } = require("uuid")

const PRISMA_CLI = "npx prisma"

require("dotenv").config({
  path: resolve(__dirname, "..", ".env.test"),
})

class CustomEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config)

    this.schema = `code_schema_${uuid()}`
    console.log({ SCHEMAS: this.schema })

    // out of docekr container
    //this.connectionString = `${process.env.DATABASE_URL}${this.schema}`

    // inside of docker container
    this.connectionString = `${process.env.DOCKER_DATABASE_URL}${this.schema}`
  }

  setup() {
    process.env.DATABASE_URL = this.connectionString
    this.global.process.env.DATABASE_URL = this.connectionString

    console.log({ DB_CONNECTION: this.connectionString })

    execSync(`make migration`)
  }

  async teardown() {
    const client = new Client({ connectionString: this.connectionString })

    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS "${this.schema}" CASCADE`)
    await client.end()
  }
}

module.exports = CustomEnvironment
