import { nanoid } from "nanoid";

export const createNanoId = (size = 6) => nanoid(size);
