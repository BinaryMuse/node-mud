import * as ecs from "./ecs"
import { NetworkSystem } from "./network"
import { GameInputSystem, LoginSystem } from "./game-loop"


// Some fake accounts
const db = new Map()
db.set("Celidur", "password")
db.set("Faerhan", "hunter2")

const PORT = parseInt(process.env.PORT || "3333", 10)
const world = new ecs.World()
// If multiple systems subscribe to an event, the event handlers
// are called in order of subscription. Thus, more specialized
// input handlers should go last to prevent duplicate input handling
// when transitioning an entity from one system to another via component changes.
world.addSystem(new NetworkSystem(PORT))
world.addSystem(new GameInputSystem())
world.addSystem(new LoginSystem(db))
