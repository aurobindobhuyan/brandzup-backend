import winston from "winston";

const levels = {
  critical: 0, // 5xx
  error: 1, // 4xx / app errors
  warn: 2, // 3xx
  info: 3, // 2xx / general info
};

winston.addColors({
  critical: "bold red",
  error: "red",
  warn: "yellow",
  info: "green",
});

const myFormat = winston.format.printf(({ level, message }) => {
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  return `${date}:- [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  levels,
  exitOnError: false,
  transports: [
    new winston.transports.Console({
      level: "info",
      handleExceptions: true,
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        myFormat,
      ),
    }),
  ],
});
