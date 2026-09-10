import { customAlphabet, nanoid } from "nanoid";

export const createNanoId = (size = 6) => nanoid(size);

// Lowercase letters and digits only. The default nanoid alphabet is mixed
// case with "_" and "-", but these ids become DNS labels
// (company.<id>.example.com) and browsers lowercase hostnames, so an id must
// survive that round trip unchanged. 8 chars of 36 ~ 2.8e12 combinations.
const hostSafe = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz");

export const createHostSafeId = (size = 8) => hostSafe(size);
