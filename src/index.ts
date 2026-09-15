import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[${env.APP_NAME}] API siap di http://localhost:${env.PORT}`);
});
