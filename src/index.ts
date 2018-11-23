import * as ecs from "./ecs"
import { NetworkSystem } from "./network"
import { GameInputSystem, LoginSystem } from "./game-loop"


const db = new Map()
db.set("Celidur", "password")
db.set("Faerhan", "hunter2")

const PORT = parseInt(process.env.PORT || "3333", 10)
const world = new ecs.World()
world.addSystem(new NetworkSystem(PORT))
world.addSystem(new LoginSystem(db))
world.addSystem(new GameInputSystem())
