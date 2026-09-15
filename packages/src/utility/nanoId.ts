import { customAlphabet, nanoid } from "nanoid";

export const createNanoId = (size = 6) => nanoid(size);

const hostSafe = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz");
export const generateWorkspaceNanoId = (size = 8) => hostSafe(size);
