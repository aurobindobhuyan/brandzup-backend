import { authGate } from "@src/middleware/authGate";
import { userProxy } from "./userProxy";
import { orgProxy } from "./orgProxy";

export default function forwardProxy(app: any) {
  app.use("/user", authGate, userProxy);
  app.use("/org", authGate, orgProxy);
}
