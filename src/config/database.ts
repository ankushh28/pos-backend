import { connect } from "mongoose";

export const connectDB = async () => {
  await connect(`mongodb://ankush:12345678@65.2.180.60:27017/admin`)
    .then(() => {
      console.log("Connected to database");
    })
    .catch((err: any) => {
      console.log("Error to connecting to database", err);
    });
};