const NodeEnvironment = require("jest-environment-node").TestEnvironment
const { execSync } = require("child_process")
const { Client } = require("pg")
const { v5: uuid } = require("uuid")

const PRISMA_CLI = "./node_modules/.bin/prisma"

class CustomEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config)

    this.schema = `code_schema_${uuid()}`
    console.log({ SCHEMAS: this.schema })

    this.connectionString = `${process.env.DATABASE_URL}${this.schema}`
  }

  
}

module.exports = CustomEnvironment
