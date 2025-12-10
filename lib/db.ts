import mongoose from "mongoose";
// Import all models to ensure they are registered
import "@/models";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
}

type ConnectionObject = {
    isConnected?: number;
};

const connection: ConnectionObject = {};

async function connectDB(): Promise<void> {
    if (connection.isConnected) {
        console.log("Using existing database connection");
        return;
    }
    try {
        const db = await mongoose.connect(MONGODB_URI, {});
        connection.isConnected = db.connections[0].readyState;
        console.log("New database connection");
    } catch (error) {
        console.error("Error connecting to database:", error);
        // Don't exit process during build - throw error instead
        if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
            throw new Error(`Database connection failed: ${error}`);
        }
        process.exit(1);
    }
}

export default connectDB;