import mongoose from "mongoose";

export const connectDB = () => {
  return mongoose.connect(process.env.USER_SERVICE_DB_URL!);
};

export const mongoDB = mongoose.connection.on("error", (err) => {
  console.log("Error occurred in DB: ", err);
});
