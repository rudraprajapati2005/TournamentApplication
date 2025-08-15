import mongoose from 'mongoose';    
import dotenv from 'dotenv';
dotenv.config();

export const connectDB = async() => {

    try{

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
    }catch(err){
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit the process with failure if 1 , if success it will be 0
    }
};