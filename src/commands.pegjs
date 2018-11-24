command
  // quit
  = "quit"                                  { return { type: "quit" } }
  // say
  / '"' S* message:rest                     { return { type: "say", message } }
  / "'" S* message:rest                     { return { type: "say", message } }
  / "say" S+ message:rest                   { return { type: "say", message } }
  // sayto
  / "sayto" S+ target:name S* message:rest  { return { type: "sayto", target, message } }
  // emote
  / ";" S* emote:rest                       { return { type: "emote", emote } }
  / "emote" S+ emote:rest                   { return { type: "emote", emote } }
  // look
  / "look" S+ "at" S+ target:rest           { return { type: "look", target } }
  / "look" S+ target:rest                   { return { type: "look", target } }
  / "look"                                  { return { type: "look", target: "here" } }
  // movement
  / "go" S+ direction:rest                  { return { type: "go", direction } }
  / direction:common_dir                    { return { type: "go", direction } }

name
  = chars:[A-Za-z0-9_]+ { return chars.join("") }

common_dir
  = "north" / "south" / "east" / "west"
  / "n" / "s" / "e" / "w"
  / "northwest" / "northeast" / "southwest" / "southeast"
  / "nw" / "ne" / "sw" / "se"
  / "up" / "down" / "u" / "d"

rest
  = chars:.+ { return chars.join("") }


S   = [ \t]
EOF = !.
