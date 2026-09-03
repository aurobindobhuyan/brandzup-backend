import mongoose from "mongoose";

export async function connectDB() {
  return await mongoose.connect(process.env.ORGANIZATION_DB_URL!);
}

mongoose.connection.on("success", () => {
  console.log("Org DB Connected successfully");
});

mongoose.connection.on("error", () => {
  console.log("Error occurred in Org DB: ");
});
