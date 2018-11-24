const fs = require('fs')
const path = require('path')
const peg = require('pegjs')

const grammarPath = path.resolve(__dirname, "..", "src", "commands.pegjs")
const parser = peg.generate(fs.readFileSync(grammarPath, 'utf8'))

const inputs = [
  "'Howdy!",
  "' Howdy!",
  '"    Howdy!',
  "say   Howdy!",
  "sayto  Celidur  Howdy!",
  "; bounces into the room",
  "emote bounces into the room",
  "look  at   fountain",
  "look fountain",
  "look",
  "go north",
  "go down",
  "east"
]

inputs.forEach((input) => {
  console.log(parser.parse(input))
})
