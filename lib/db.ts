import mongoose from "mongoose"

let isConnected = false // global flag

export const connectDB = async () => {
    if (isConnected) return

    try {
        await mongoose.connect(process.env.MONGODB_URI as string, {
            dbName: "kmwf",
        })
        isConnected = true
        console.log("✅ MongoDB connected")
    } catch (err) {
        console.error("❌ MongoDB connection error:", err)
        throw new Error("DB connection failed")
    }
}
