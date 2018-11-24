import * as path from "path"
import * as fs from "fs"

import * as peg from "pegjs"

const grammarPath = path.resolve(__dirname, "..", "src", "commands.pegjs")
const parser = peg.generate(fs.readFileSync(grammarPath, 'utf8'))

export interface Command {
  type: string
}

export function parseCommand(input: string): Command | undefined {
  try {
    return parser.parse(input)
  } catch (err) {
    return undefined
  }
}
