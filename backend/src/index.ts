import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const app = createApp();

app.listen(port, () => {
  console.log(`GrowEasy CSV importer API listening on port ${port}`);
  console.log(`AI provider: ${process.env.AI_PROVIDER ?? "heuristic"}`);
});
