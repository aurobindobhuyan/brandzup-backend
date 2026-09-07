import { authGate } from "@src/middleware/authGate";
import { userProxy } from "./userProxy";

export default function forwardProxy(app: any) {
  app.use("/user", authGate, userProxy);
}
