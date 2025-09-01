import mongoose from 'mongoose'

console.log(process.env.MONGO_DB_URI)
const dbConnect = async ()=>{
    try {
        const dbInstance = await mongoose.connect(`${process.env.MONGO_DB_URI}/twilio`)
        console.log('db connect successfully on ::', dbInstance.connection.port);

    } catch (error) {
        console.log('database connedtion is failed in db/index.js catch', error)
        process.exit(1)

    }
}

export {dbConnect}