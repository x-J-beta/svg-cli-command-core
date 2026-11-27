import { CliStartup } from "./host/CliStartup.js";

await new CliStartup().run(process.argv.slice(2));
