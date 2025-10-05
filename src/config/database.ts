import { connect } from "mongoose";

export const connectDB = async () => {
  await connect(`mongodb+srv://ankush:123@elite-backend.tdchpl3.mongodb.net/?retryWrites=true&w=majority&appName=elite-backend`)
    .then(() => {
      console.log("Connected to database");
    })
    .catch((err: any) => {
      console.log("Error to connecting to database", err);
    });
};